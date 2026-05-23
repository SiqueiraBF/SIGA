import { useState, useEffect, useMemo } from 'react';
import {
    Receipt,
    Trash2,
    Clock,
    AlertCircle
} from 'lucide-react';
import type { DirectReceipt, Fazenda } from '../../types';
import { useAuth } from '../../context/AuthContext';

// New Sub-components
import { DirectReceiptHeader } from './DirectReceiptHeader';
import { DirectReceiptSidePanel } from './DirectReceiptSidePanel';
import { DirectReceiptFooter } from './DirectReceiptFooter';

interface DirectReceiptFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (items: Omit<DirectReceipt, 'id' | 'created_at' | 'usuario' | 'fazenda'>[]) => Promise<void>;
    onUpdate?: (id: string, data: Partial<Omit<DirectReceipt, 'id' | 'created_at' | 'usuario' | 'fazenda'>>) => Promise<void>;
    fazendas: Fazenda[];
    initialReceipt?: DirectReceipt | null;
}

interface PendingItem {
    id: string; // Temporary ID for the list
    nota_fiscal: string;
    fornecedor: string;
    data_emissao: string;
    data_recebimento: string;
    local_recebimento: string;
    local_recebimento_outros?: string;
    responsavel: string;
    valor: number;
    observacao: string;
}

const LOCAL_OPTIONS = [
    { value: 'oficina', label: 'Oficina' },
    { value: 'pecuaria', label: 'Pecuária' },
    { value: 'lavoura', label: 'Lavoura' },
    { value: 'cantina', label: 'Cantina' },
    { value: 'armazem', label: 'Armazém' },
    { value: 'escritorio adm', label: 'Escritório ADM' },
    { value: 'hangar', label: 'Hangar' },
    { value: 'terceiros', label: 'Terceiros' },
    { value: 'outra unidade', label: 'Outra Unidade' },
    { value: 'outros', label: 'Outros' },
];

export function DirectReceiptFormModal({
    isOpen,
    onClose,
    onSave,
    onUpdate,
    fazendas,
    initialReceipt = null
}: DirectReceiptFormModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    // Pending items to be saved
    const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);

    // Current item being edited
    const [notaFiscal, setNotaFiscal] = useState('');
    const [fornecedor, setFornecedor] = useState('');
    const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().split('T')[0]);
    const [dataRecebimento, setDataRecebimento] = useState(new Date().toISOString().split('T')[0]);
    const [isDateUnknown, setIsDateUnknown] = useState(false);
    const [localRecebimento, setLocalRecebimento] = useState('oficina');
    const [localOutros, setLocalOutros] = useState('');
    const [responsavel, setResponsavel] = useState('');
    const [valor, setValor] = useState('');
    const [observacao, setObservacao] = useState('');

    useEffect(() => {
        if (isOpen) {
            setPendingItems([]);
            if (initialReceipt) {
                setNotaFiscal(initialReceipt.nota_fiscal);
                setFornecedor(initialReceipt.fornecedor);
                setDataEmissao(initialReceipt.data_emissao);
                setIsDateUnknown(initialReceipt.data_recebimento === 'Não informada');
                setDataRecebimento(initialReceipt.data_recebimento === 'Não informada' ? new Date().toISOString().split('T')[0] : initialReceipt.data_recebimento);
                setLocalRecebimento(initialReceipt.local_recebimento);
                setLocalOutros(initialReceipt.local_recebimento_outros || '');
                setResponsavel(initialReceipt.responsavel);
                setValor(initialReceipt.valor.toString());
                setObservacao(initialReceipt.observacao || '');
            } else {
                resetForm();
            }
        }
    }, [isOpen, initialReceipt]);

    const resetForm = () => {
        setNotaFiscal('');
        setFornecedor('');
        setDataEmissao(new Date().toISOString().split('T')[0]);
        setDataRecebimento(new Date().toISOString().split('T')[0]);
        setIsDateUnknown(false);
        setLocalRecebimento('oficina');
        setLocalOutros('');
        setResponsavel('');
        setValor('');
        setObservacao('');
    };

    const currentFarm = useMemo(() =>
        fazendas.find(f => f.id === user?.fazenda_id)?.nome || 'Não informada'
        , [fazendas, user]);

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!notaFiscal || !fornecedor || !responsavel || !valor) return;

        const newItem: PendingItem = {
            id: crypto.randomUUID(),
            nota_fiscal: notaFiscal,
            fornecedor,
            data_emissao: dataEmissao,
            data_recebimento: isDateUnknown ? 'Não informada' : dataRecebimento,
            local_recebimento: localRecebimento,
            local_recebimento_outros: localRecebimento === 'outros' ? localOutros : undefined,
            responsavel,
            valor: parseFloat(valor),
            observacao,
        };

        setPendingItems([...pendingItems, newItem]);
        resetForm();
    };

    const handleRemoveItem = (id: string) => {
        setPendingItems(pendingItems.filter(item => item.id !== id));
    };

    const handleFinalSave = async () => {
        if (initialReceipt) {
            if (!notaFiscal || !fornecedor || !responsavel || !valor || !onUpdate) return;
            setLoading(true);
            try {
                await onUpdate(initialReceipt.id, {
                    nota_fiscal: notaFiscal,
                    fornecedor,
                    data_emissao: dataEmissao,
                    data_recebimento: isDateUnknown ? 'Não informada' : dataRecebimento,
                    local_recebimento: localRecebimento,
                    local_recebimento_outros: localRecebimento === 'outros' ? localOutros : undefined,
                    responsavel,
                    valor: parseFloat(valor),
                    observacao,
                });
                onClose();
            } catch (error: any) {
                console.error('Erro ao atualizar registro:', error);
                alert(`Erro ao atualizar: ${error.message}`);
            } finally {
                setLoading(false);
            }
            return;
        }

        if (pendingItems.length === 0 || !user) return;

        setLoading(true);
        try {
            const itemsToSave = pendingItems.map(({ id, ...rest }) => ({
                ...rest,
                usuario_id: user.id,
                fazenda_id: user.fazenda_id!
            }));

            await onSave(itemsToSave);
            onClose();
        } catch (error: any) {
            console.error('Erro ao salvar lote:', error);
            alert(`Erro ao salvar: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200 font-sans">
            <div className="bg-white w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">

                <DirectReceiptHeader 
                    onClose={onClose} 
                />

                <div className="flex-1 flex overflow-hidden">
                    <DirectReceiptSidePanel
                        notaFiscal={notaFiscal} setNotaFiscal={setNotaFiscal}
                        fornecedor={fornecedor} setFornecedor={setFornecedor}
                        dataEmissao={dataEmissao} setDataEmissao={setDataEmissao}
                        isDateUnknown={isDateUnknown} setIsDateUnknown={setIsDateUnknown}
                        dataRecebimento={dataRecebimento} setDataRecebimento={setDataRecebimento}
                        localRecebimento={localRecebimento} setLocalRecebimento={setLocalRecebimento}
                        localOutros={localOutros} setLocalOutros={setLocalOutros}
                        responsavel={responsavel} setResponsavel={setResponsavel}
                        valor={valor} setValor={setValor}
                        observacao={observacao} setObservacao={setObservacao}
                        handleAddItem={handleAddItem}
                        currentFarm={currentFarm}
                        userName={user?.nome}
                        LOCAL_OPTIONS={LOCAL_OPTIONS}
                        isEditMode={!!initialReceipt}
                    />

                    <div className="flex-1 flex flex-col bg-slate-50/50 relative overflow-hidden">
                        <div className="flex-1 p-6 flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                                    ITEM NO LOTE ({pendingItems.length})
                                </h3>
                                {pendingItems.length > 0 && (
                                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg uppercase tracking-wider border border-blue-100">
                                        Pronto para processar
                                    </span>
                                )}
                            </div>

                            <div className="flex-1 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-sm">
                                {pendingItems.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-4">
                                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center shadow-inner border border-slate-100">
                                            <Receipt size={40} className="text-slate-200" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Nenhuma nota adicionada</p>
                                            <p className="text-xs font-medium text-slate-400 mt-1 uppercase">Use o formulário lateral para preencher os dados da nota</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="overflow-auto flex-1 custom-scrollbar">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap w-[80px]">NF</th>
                                                    <th className="px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap max-w-[140px]">FORNECEDOR</th>
                                                    <th className="px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap w-[85px]">EMISSÃO</th>
                                                    <th className="px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap w-[85px]">RECEBIDO</th>
                                                    <th className="px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap w-[110px]">LOCAL</th>
                                                    <th className="px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap max-w-[120px]">RESPONSÁVEL</th>
                                                    <th className="px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap max-w-[150px]">OBS.</th>
                                                    <th className="px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap text-right w-[100px]">VALOR DA NOTA</th>
                                                    <th className="px-4 py-4 w-12"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {pendingItems.map((item) => (
                                                    <tr key={item.id} className="hover:bg-blue-50/20 transition-all group">
                                                        <td className="px-4 py-4 font-mono font-bold text-blue-600 text-xs italic">#{item.nota_fiscal}</td>
                                                        <td className="px-4 py-4 text-xs font-bold text-slate-700 uppercase truncate max-w-[140px]" title={item.fornecedor}>{item.fornecedor}</td>
                                                        <td className="px-4 py-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">
                                                            {item.data_emissao ? item.data_emissao.split('-').reverse().join('/') : '---'}
                                                        </td>
                                                        <td className="px-4 py-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">
                                                            {item.data_recebimento === 'Não informada' 
                                                                ? 'NÃO INFO' 
                                                                : (item.data_recebimento ? item.data_recebimento.split('-').reverse().join('/') : '---')}
                                                        </td>
                                                        <td className="px-4 py-4 text-xs font-bold text-slate-500 uppercase truncate max-w-[110px]" title={item.local_recebimento === 'outros' ? item.local_recebimento_outros : item.local_recebimento}>
                                                            {item.local_recebimento === 'outros' ? item.local_recebimento_outros : item.local_recebimento}
                                                        </td>
                                                        <td className="px-4 py-4 text-xs font-bold text-slate-500 uppercase truncate max-w-[120px]" title={item.responsavel}>{item.responsavel}</td>
                                                        <td className="px-4 py-4 text-xs text-slate-500 truncate max-w-[150px]" title={item.observacao}>{item.observacao || '-'}</td>
                                                        <td className="px-4 py-4 text-xs font-black text-slate-800 text-right whitespace-nowrap">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
                                                        </td>
                                                        <td className="px-4 py-4 text-right">
                                                            <button
                                                                onClick={() => handleRemoveItem(item.id)}
                                                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 hover:shadow-sm active:scale-95"
                                                                title="Remover nota"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-4 transition-all hover:bg-blue-100/50">
                                <div className="p-2 bg-white rounded-xl shadow-sm border border-blue-200">
                                    <AlertCircle size={20} className="text-blue-600 shrink-0" />
                                </div>
                                <p className="text-xs text-blue-800 font-bold leading-relaxed uppercase tracking-tight">
                                    Confirmação: Ao salvar, um relatório será disparado para a gerência.
                                    Certifique-se de que os dados de cada nota física conferem com o lançamento.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <DirectReceiptFooter
                    loading={loading}
                    onClose={onClose}
                    handleFinalSave={handleFinalSave}
                    pendingCount={initialReceipt ? 1 : pendingItems.length}
                    isEditMode={!!initialReceipt}
                />
            </div>
        </div>
    );
}
