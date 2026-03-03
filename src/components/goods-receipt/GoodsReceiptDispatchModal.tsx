import { useState, useEffect } from 'react';
import { Truck, X, User, Calendar, MapPin, CheckSquare, Square, FileText } from 'lucide-react';
import { goodsReceiptService } from '../../services/goodsReceiptService';
import { db } from '../../services/supabaseService';
import { GoodsReceipt, Fazenda } from '../../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';

interface GoodsReceiptDispatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function GoodsReceiptDispatchModal({ isOpen, onClose, onSuccess }: GoodsReceiptDispatchModalProps) {
    const [step, setStep] = useState(1); // 1: Select Farm, 2: Select Items & Details
    const [loading, setLoading] = useState(false);
    const [farms, setFarms] = useState<Fazenda[]>([]);
    const [selectedFarmId, setSelectedFarmId] = useState('');
    const [farmPendingItems, setFarmPendingItems] = useState<GoodsReceipt[]>([]);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

    // Dispatch Data
    const [dispatchData, setDispatchData] = useState({
        driver_name: '',
        exit_at: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
        observation_exit: ''
    });

    useEffect(() => {
        if (isOpen) {
            loadFarms();
            resetState();
        }
    }, [isOpen]);

    // Fetch items when farm selected
    useEffect(() => {
        if (selectedFarmId) {
            loadPendingItems(selectedFarmId);
        } else {
            setFarmPendingItems([]);
        }
    }, [selectedFarmId]);

    const resetState = () => {
        setStep(1);
        setSelectedFarmId('');
        setSelectedItemIds(new Set());
        setDispatchData({
            driver_name: '',
            exit_at: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
            observation_exit: ''
        });
    };

    const loadFarms = async () => {
        try {
            const data = await db.getAllFarms();
            setFarms(data as Fazenda[]);
        } catch (error) {
            console.error(error);
        }
    };

    const loadPendingItems = async (farmId: string) => {
        setLoading(true);
        try {
            const allPending = await goodsReceiptService.getPendingReceipts();
            const filtered = allPending.filter(item => item.destination_farm_id === farmId);
            setFarmPendingItems(filtered);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedItemIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedItemIds(newSet);
    };

    const { user } = useAuth(); // Need user for created_by

    const handleDispatch = async () => {
        if (!dispatchData.driver_name) return alert('Informe o nome do motorista.');
        if (selectedItemIds.size === 0) return alert('Selecione pelo menos um item.');
        if (!user) return;

        setLoading(true);
        try {
            // 1. Create Exit Record
            const exit = await goodsReceiptService.createExit({
                destination_farm_id: selectedFarmId,
                driver_name: dispatchData.driver_name,
                exit_date: new Date(dispatchData.exit_at).toISOString(),
                observation: dispatchData.observation_exit,
                created_by: user.id
            });

            // 2. Link Receipts to Exit
            await goodsReceiptService.dispatchReceipts(Array.from(selectedItemIds), exit);

            // 3. Disparar notificação por e-mail (Agora aguardando resposta)
            try {
                // Enrich exit with destination farm info for the email
                const selectedFarm = farms.find(f => f.id === selectedFarmId);
                const enrichedExit = {
                    ...exit,
                    destination_farm: selectedFarm,
                    creator: { nome: user.nome }
                };

                // Get full item details
                const itemsToDispatch = farmPendingItems.filter(item => selectedItemIds.has(item.id));

                const emailSent = await notificationService.sendGoodsExitReport(enrichedExit, itemsToDispatch, user.email);

                if (emailSent) {
                    alert('Saída registrada com sucesso e E-mail enviado!');
                } else {
                    alert('Saída registrada, PORÉM não houve sucesso ao enviar o e-mail (possível falta de configuração de destinatário).');
                }
            } catch (notifyError: any) {
                console.error('Erro ao preparar envio de email:', notifyError);
                alert('Saída registrada, MAS erro ao disparar email: ' + (notifyError.message || notifyError));
            }

            onSuccess();
            onClose();

        } catch (error: any) {
            console.error(error);
            alert('Erro ao registrar saída: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Truck className="text-blue-600" size={20} /> Registrar Saída (Expedição)
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">

                    {/* Farm Selection */}
                    <div className="space-y-4 mb-6">
                        <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                            <MapPin size={16} className="text-slate-400" /> Selecione a Fazenda de Destino
                        </label>
                        <select
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={selectedFarmId}
                            onChange={(e) => setSelectedFarmId(e.target.value)}
                        >
                            <option value="">Selecione...</option>
                            {farms.map(f => (
                                <option key={f.id} value={f.id}>{f.nome}</option>
                            ))}
                        </select>
                    </div>

                    {selectedFarmId && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2">
                            <div className="h-px bg-slate-100 w-full" />

                            {/* Item Selection */}
                            <div className="space-y-2">
                                <h4 className="font-bold text-slate-700 flex items-center justify-between">
                                    <span>Notas Pendentes para a Fazenda</span>
                                    <span className="text-xs font-normal bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{farmPendingItems.length} itens</span>
                                </h4>

                                {loading ? (
                                    <div className="text-center py-8 text-slate-400">Carregando itens...</div>
                                ) : farmPendingItems.length === 0 ? (
                                    <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-500 text-sm">
                                        Nenhuma mercadoria pendente para esta fazenda.
                                    </div>
                                ) : (
                                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                                        <table className="w-full text-sm text-left">
                                            <tbody className="divide-y divide-slate-100">
                                                {farmPendingItems.map(item => (
                                                    <tr
                                                        key={item.id}
                                                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedItemIds.has(item.id) ? 'bg-blue-50' : ''}`}
                                                        onClick={() => toggleSelection(item.id)}
                                                    >
                                                        <td className="px-4 py-3 w-10">
                                                            <div className={`transition-colors ${selectedItemIds.has(item.id) ? 'text-blue-600' : 'text-slate-300'}`}>
                                                                {selectedItemIds.has(item.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium text-slate-700">{item.invoice_number}</div>
                                                            <div className="text-xs text-slate-400">{item.supplier}</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-xs text-slate-500">
                                                            {format(parseISO(item.entry_at), "dd/MM HH:mm", { locale: ptBR })}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Dispatch Details */}
                            {selectedItemIds.size > 0 && (
                                <div className="p-4 bg-slate-50 rounded-xl space-y-4 animate-in fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-600">Motorista / Portador</label>
                                            <input
                                                required
                                                type="text"
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={dispatchData.driver_name}
                                                onChange={e => setDispatchData(prev => ({ ...prev, driver_name: e.target.value }))}
                                                placeholder="Nome do responsável"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-600">Data/Hora Saída</label>
                                            <input
                                                required
                                                type="datetime-local"
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={dispatchData.exit_at}
                                                onChange={e => setDispatchData(prev => ({ ...prev, exit_at: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600">Observações (Opcional)</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={dispatchData.observation_exit}
                                            onChange={e => setDispatchData(prev => ({ ...prev, observation_exit: e.target.value }))}
                                            placeholder="Detalhes da saída..."
                                        />
                                    </div>
                                </div>
                            )}

                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleDispatch}
                        disabled={loading || selectedItemIds.size === 0 || !dispatchData.driver_name}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:shadow-none"
                    >
                        {loading ? 'Salvando...' : `Confirmar Saída (${selectedItemIds.size})`}
                    </button>
                </div>
            </div>
        </div>
    );
}
