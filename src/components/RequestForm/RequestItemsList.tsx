
import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';

interface RequestItemsListProps {
    items: any[];
    contextData: any;
    isAnalystMode: boolean;
    canEditItems: boolean;
    analystSelectedItem: any;
    setAnalystSelectedItem: (item: any) => void;
    handleEditItem: (item: any) => void;
    handleDeleteItem: (item: any) => void;
}

export const RequestItemsList: React.FC<RequestItemsListProps> = ({
    items,
    contextData,
    isAnalystMode,
    canEditItems,
    analystSelectedItem,
    setAnalystSelectedItem,
    handleEditItem,
    handleDeleteItem
}) => {
    return (
        <div className="flex-1 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 py-2 px-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest z-10">
                <span>Itens da Solicitação</span>
                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">{items.length}</span>
            </div>
            <div className="h-full pt-10 overflow-y-auto">
                <div className="min-w-full inline-block align-middle">
                    <div className="border-b border-gray-200">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase w-10 text-center">#</th>
                                    <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase w-24 text-center">Status</th>
                                    <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase">Descrição</th>
                                    <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase w-24">Marca</th>
                                    <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase w-20">Ref</th>
                                    <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase w-16 text-center">UN</th>
                                    {(isAnalystMode || ['Finalizado', 'Devolvido'].includes(contextData.status)) && (
                                        <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase w-24">Cód. Uni</th>
                                    )}
                                    {(isAnalystMode || ['Finalizado', 'Devolvido'].includes(contextData.status)) && (
                                        <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase w-28 text-center">Classificação</th>
                                    )}
                                    <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase w-16 text-center">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.map((item, index) => (
                                    <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${analystSelectedItem?.id === item.id ? 'bg-purple-50 hover:bg-purple-50' : ''}`}>
                                        <td className="py-2 px-4 text-center text-xs text-slate-400 font-medium">{index + 1}</td>
                                        <td className="py-2 px-4 text-center">
                                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border ${item.status === 'Aprovado' ? 'bg-green-50 text-green-600 border-green-200' :
                                                item.status === 'Reprovado' || item.status === 'Devolvido' ? 'bg-red-50 text-red-600 border-red-200' :
                                                    'bg-slate-100 text-slate-500 border-slate-200'
                                                }`}>
                                                {item.status === 'Pendente' ? 'Pendente' : item.status}
                                            </span>
                                        </td>
                                        <td className="py-2 px-4 text-xs text-slate-700 font-semibold">{item.descricao}</td>
                                        <td className="py-2 px-4 text-xs text-slate-500">{item.marca || '-'}</td>
                                        <td className="py-2 px-4 text-xs text-slate-500">{item.referencia || '-'}</td>
                                        <td className="py-2 px-4 text-center text-xs text-slate-500">{item.unidade}</td>
                                        {(isAnalystMode || ['Finalizado', 'Devolvido'].includes(contextData.status)) && (
                                            <td
                                                className={`py-2 px-4 text-xs font-mono font-bold truncate max-w-[150px] ${item.status === 'Aprovado' || item.status === 'Existente' || item.status === 'Reativado' ? 'text-green-600' :
                                                    (item.status === 'Reprovado' || item.status === 'Devolvido') ? 'text-red-500' :
                                                        'text-slate-400'
                                                    }`}
                                                title={item.status === 'Reprovado' ? (item.motivo_reprovacao || item.cod_reduzido_unisystem) : item.cod_reduzido_unisystem}
                                            >
                                                {(item.status === 'Reprovado' || item.status === 'Devolvido')
                                                    ? (item.motivo_reprovacao || item.cod_reduzido_unisystem || 'Sem motivo')
                                                    : (item.cod_reduzido_unisystem || '-')}
                                            </td>
                                        )}
                                        {(isAnalystMode || ['Finalizado', 'Devolvido'].includes(contextData.status)) && (
                                            <td className="py-2 px-4 text-center">
                                                {item.tipo_tratativa ? (
                                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border ${item.tipo_tratativa === 'NOVO' ? 'text-green-700 bg-green-50 border-green-200' :
                                                        item.tipo_tratativa === 'REATIVADO' ? 'text-blue-700 bg-blue-50 border-blue-200' :
                                                            item.tipo_tratativa === 'EXISTENTE' ? 'text-amber-700 bg-amber-50 border-amber-200' :
                                                                'text-red-700 bg-red-50 border-red-200'
                                                        }`}>
                                                        {item.tipo_tratativa}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 text-[10px]">-</span>
                                                )}
                                            </td>
                                        )}
                                        <td className="py-2 px-4 text-center">
                                            {isAnalystMode ? (
                                                <button
                                                    onClick={() => setAnalystSelectedItem(item)}
                                                    className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                                    title="Analisar Item"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                            ) : canEditItems ? (
                                                contextData.status === 'Devolvido' && item.status === 'Aprovado' ? (
                                                    <span className="text-slate-300">-</span>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={() => handleEditItem(item)}
                                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteItem(item)}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {items.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="py-8 text-center text-slate-400 text-sm italic">
                                            Nenhum item adicionado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>         </div>
                </div>
            </div>
        </div>
    );
};
