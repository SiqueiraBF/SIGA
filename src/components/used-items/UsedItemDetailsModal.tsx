import React, { useState } from 'react';
import { X, ArrowUpRight, ArrowDownRight, Image as ImageIcon, PackageOpen, History, Printer, ChevronDown } from 'lucide-react';
import { UsedItemStock, UsedItemTransaction } from '../../services/usedItemsService';
import { printUsedItemLabel } from '../../utils/printLabel';
import { ImageLightbox } from '../ImageLightbox';

interface UsedItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  produtoId: string;
  produtoNome: string;
  produtoCodigo?: number;
  stock: UsedItemStock[];
  transactions: UsedItemTransaction[];
}

export function UsedItemDetailsModal({ 
  isOpen, 
  onClose, 
  produtoId, 
  produtoNome, 
  produtoCodigo,
  stock, 
  transactions 
}: UsedItemDetailsModalProps) {
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  if (!isOpen || !produtoId) return null;

  // Filtrar os dados específicos deste produto
  const itemStock = stock.find(s => s.produto_id === produtoId);
  const itemTransactions = transactions.filter(t => t.produto_id === produtoId);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <PackageOpen className="text-teal-600" size={24} />
              Detalhes do Item
            </h2>
            <p className="text-sm text-slate-500 mt-1">Ficha completa e histórico de movimentações</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button 
                onClick={() => setShowPrintMenu(!showPrintMenu)}
                onBlur={() => setTimeout(() => setShowPrintMenu(false), 200)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold shadow-sm inline-flex items-center gap-2 hover:bg-slate-700 transition-colors"
              >
                <Printer size={16} />
                Imprimir Etiqueta
                <ChevronDown size={14} />
              </button>
              
              {showPrintMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-20 animate-in fade-in slide-in-from-top-2">
                  <button 
                    onClick={() => printUsedItemLabel(produtoNome, '100x50', produtoCodigo)}
                    className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 border-b border-slate-100 flex items-center gap-2"
                  >
                    Tamanho 100x50 mm
                  </button>
                  <button 
                    onClick={() => printUsedItemLabel(produtoNome, '50x30', produtoCodigo)}
                    className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    Tamanho 50x30 mm
                  </button>
                </div>
              )}
            </div>

            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Card de Resumo do Estoque */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row gap-6 shadow-sm">
            <div 
              className={`w-full md:w-40 h-40 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 ${itemStock?.foto_url ? 'cursor-zoom-in hover:opacity-90 transition-opacity' : ''}`}
              onClick={() => itemStock?.foto_url && setIsLightboxOpen(true)}
            >
              {itemStock?.foto_url ? (
                <img src={itemStock.foto_url} alt={produtoNome} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <ImageIcon size={32} />
                  <span className="text-xs font-medium">Sem foto</span>
                </div>
              )}
            </div>
            
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">
                Cód: {produtoCodigo ? String(produtoCodigo).padStart(5, '0') : '-'}
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-4">{produtoNome}</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <span className="block text-sm font-semibold text-slate-500 mb-1">Saldo Atual</span>
                  <div className="text-3xl font-black text-teal-600">
                    {itemStock?.quantidade || 0}
                    <span className="text-sm font-bold text-teal-600/60 ml-1">
                      {itemStock?.unidade_medida || 'UN'}
                    </span>
                  </div>
                </div>
                
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <span className="block text-sm font-semibold text-slate-500 mb-1">Última Movimentação</span>
                  <div className="text-sm font-bold text-slate-700 mt-2">
                    {itemTransactions.length > 0 
                      ? new Date(itemTransactions[0].created_at).toLocaleDateString('pt-BR')
                      : 'Nenhuma'
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Histórico de Movimentações */}
          <div>
            <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <History className="text-slate-500" size={20} />
              Histórico de Movimentações (Nesta Fazenda)
            </h4>

            {itemTransactions.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-8 text-center text-slate-500">
                Nenhuma movimentação registrada para este item nesta fazenda.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-y-auto max-h-[300px] shadow-inner relative">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
                    <tr className="text-slate-600">
                      <th className="py-3 px-4 font-bold">Data</th>
                      <th className="py-3 px-4 font-bold">Tipo</th>
                      <th className="py-3 px-4 font-bold text-center">Quantidade</th>
                      <th className="py-3 px-4 font-bold">Detalhes</th>
                      <th className="py-3 px-4 font-bold">Usuário</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {itemTransactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                          {new Date(tx.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold ${
                            tx.tipo === 'ENTRADA' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {tx.tipo === 'ENTRADA' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                            {tx.tipo}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">
                          {tx.quantidade} <span className="text-[10px] text-slate-400 font-normal ml-1">{tx.unidade_medida || 'UN'}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-xs">
                          {tx.tipo === 'ENTRADA' ? `Marca: ${tx.marca || '-'}` : `Destino: ${tx.equipamento_destino || '-'}`}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs">{tx.usuario?.nome}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>

      {itemStock?.foto_url && (
        <ImageLightbox 
          src={itemStock.foto_url}
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          alt={produtoNome}
        />
      )}
    </div>
  );
}
