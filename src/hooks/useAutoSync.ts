import { useEffect, useState } from 'react';
import { offlineSyncService } from '../services/offlineSyncService';
import { useDrainageSubmit } from './useDrainageSubmit';
import { toast } from 'react-hot-toast';

export function useAutoSync() {
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const { mutateAsync: submitDrainage } = useDrainageSubmit();

    const updateCount = async () => {
        const count = await offlineSyncService.getQueueCount();
        setPendingCount(count);
    };

    const sync = async () => {
        if (isSyncing) return;

        const queue = await offlineSyncService.getQueue();
        if (queue.length === 0) return;

        setIsSyncing(true);
        const syncToast = toast.loading(`Sincronizando ${queue.length} registro(s) pendente(s)...`);

        try {
            for (const item of queue) {
                try {
                    // Chamamos a mutação. Como agora estamos online (em teoria), 
                    // a mutação vai processar normalmente para o servidor.
                    await submitDrainage(item.data);
                    // Se deu certo, removemos da fila
                    await offlineSyncService.dequeue(item.id!);
                } catch (error) {
                    console.error('Falha ao sincronizar item individual:', error);
                    // Mantemos na fila para tentar depois
                }
            }

            const remaining = await offlineSyncService.getQueueCount();
            if (remaining === 0) {
                toast.success('Sincronização concluída com sucesso!', { id: syncToast });
            } else {
                toast.error(`Sincronização parcial. ${remaining} itens ainda pendentes.`, { id: syncToast });
            }
        } catch (error) {
            toast.error('Erro crítico na sincronização.', { id: syncToast });
        } finally {
            setIsSyncing(false);
            updateCount();
        }
    };

    useEffect(() => {
        updateCount();

        const handleOnline = () => {
            sync();
        };

        window.addEventListener('online', handleOnline);

        // Check periodically as well
        const interval = setInterval(() => {
            if (navigator.onLine) sync();
        }, 60000); // 1 minuto

        return () => {
            window.removeEventListener('online', handleOnline);
            clearInterval(interval);
        };
    }, []);

    return { pendingCount, isSyncing, sync };
}
