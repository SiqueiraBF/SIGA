import React from 'react';
import { X, ArrowDownCircle, ArrowUpCircle, Calendar, User, Hash, Package, Tag, Truck, Pencil, Trash2 } from 'lucide-react';
import { UsedItemTransaction } from '../../services/usedItemsService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UsedTransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: UsedItemTransaction | null;
  onEdit?: (tx: UsedItemTransaction) => void;
  onDelete?: (id: string) => void;
  onPhotoClick?: (url: string) => void;
}

export function UsedTransactionDetailsModal({ isOpen, onClose, transaction, onEdit, onDelete, onPhotoClick }: UsedTransactionDetailsModalProps) {
  if (!isOpen || !transaction) return null;

  const isEntrada = transaction.tipo === 'ENTRADA';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="relative p-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${isEntrada ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {isEntrada ? <ArrowDownCircle size={24} /> : <ArrowUpCircle size={24} />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Detalhes da {isEntrada ? 'Entrada' : 'Saída'}
              </h2>
              <p className="text-sm text-slate-500">
                Registro de movimentação de estoque
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Foto (Se houver) */}
          {(transaction as any).foto_url && (
            <div 
              className="w-full aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 cursor-zoom-in hover:opacity-90 transition-opacity"
              onClick={() => onPhotoClick?.((transaction as any).foto_url)}
            >
              <img 
                src={(transaction as any).foto_url} 
                alt="Foto do item" 
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Produto Info */}
          <div className="bg-slate-50 rounded-xl p-4 flex items-start gap-4">
            <div className="p-2 bg-white rounded-lg shadow-sm text-teal-600">
              <Package size={20} />
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Produto</span>
              <h3 className="font-bold text-slate-800 leading-tight">
                {transaction.produto?.nome || 'Produto não identificado'}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Cód: {String(transaction.produto?.codigo_item || '').padStart(5, '0')}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quantidade</span>
              <div className={`text-lg font-black ${isEntrada ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isEntrada ? '+' : '-'}{transaction.quantidade} {transaction.unidade_medida}
              </div>
            </div>
          </div>

          {/* Grid de Informações */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Calendar size={14} />
                <span className="text-[11px] font-bold uppercase tracking-wider">Data e Hora</span>
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {format(new Date(transaction.created_at), "dd 'de' MMMM, HH:mm", { locale: ptBR })}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400">
                <User size={14} />
                <span className="text-[11px] font-bold uppercase tracking-wider">Operador</span>
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {transaction.usuario?.nome || 'Sistema'}
              </p>
            </div>

            {isEntrada ? (
              <div className="space-y-1 col-span-2">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Tag size={14} />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Marca / Identificação</span>
                </div>
                <p className="text-sm font-semibold text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {transaction.marca || 'Não informada'}
                </p>
              </div>
            ) : (
              <div className="space-y-1 col-span-2">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Truck size={14} />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Equipamento de Destino</span>
                </div>
                <p className="text-sm font-semibold text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {transaction.equipamento_destino || 'Não informado'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {onDelete && (
              <button
                onClick={() => {
                  onDelete(transaction.id);
                  onClose();
                }}
                className="flex items-center gap-2 px-4 py-2.5 text-rose-600 font-bold hover:bg-rose-50 rounded-xl transition-all active:scale-95"
              >
                <Trash2 size={18} />
                <span className="text-sm">Excluir</span>
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => {
                  onEdit(transaction);
                  onClose();
                }}
                className="flex items-center gap-2 px-4 py-2.5 text-blue-600 font-bold hover:bg-blue-50 rounded-xl transition-all active:scale-95"
              >
                <Pencil size={18} />
                <span className="text-sm">Editar</span>
              </button>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
