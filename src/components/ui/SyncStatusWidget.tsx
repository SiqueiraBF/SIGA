import React from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useAutoSync } from '../../hooks/useAutoSync';

export function SyncStatusWidget() {
    const { pendingCount, isSyncing, sync } = useAutoSync();
    const [isOnline, setIsOnline] = React.useState(navigator.onLine);

    React.useEffect(() => {
        const handleStatusChange = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', handleStatusChange);
        window.addEventListener('offline', handleStatusChange);
        return () => {
            window.removeEventListener('online', handleStatusChange);
            window.removeEventListener('offline', handleStatusChange);
        };
    }, []);

    if (!isOnline) {
        return (
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
                <div className="bg-amber-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-bold border border-amber-400">
                    <WifiOff size={14} />
                    MODO OFFLINE ATIVO
                </div>
            </div>
        );
    }

    if (pendingCount > 0) {
        return (
            <button
                onClick={() => sync()}
                disabled={isSyncing}
                className="fixed bottom-20 right-4 z-50 group"
            >
                <div className="relative">
                    <div className="bg-teal-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-teal-500 hover:bg-teal-700 transition-all active:scale-95">
                        {isSyncing ? (
                            <RefreshCw size={18} className="animate-spin" />
                        ) : (
                            <AlertCircle size={18} />
                        )}
                        <div className="flex flex-col items-start leading-none">
                            <span className="text-[10px] opacity-80 uppercase font-black mb-1">Sincronização</span>
                            <span className="text-sm font-bold">{pendingCount} Pendente(s)</span>
                        </div>
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                </div>
            </button>
        );
    }

    return null;
}
