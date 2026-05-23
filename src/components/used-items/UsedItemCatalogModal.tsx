import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { usedItemsService, UsedItemCatalog } from '../../services/usedItemsService';
import toast from 'react-hot-toast';

interface UsedItemCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingItem?: UsedItemCatalog | null;
}

export function UsedItemCatalogModal({ isOpen, onClose, onSuccess, editingItem }: UsedItemCatalogModalProps) {
  const [nome, setNome] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNome(editingItem?.nome || '');
    }
  }, [isOpen, editingItem]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error('O nome do item é obrigatório');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await usedItemsService.updateCatalogItem(editingItem.id, nome.trim());
        toast.success('Item atualizado com sucesso!');
      } else {
        await usedItemsService.createCatalogItem(nome.trim());
        toast.success('Item adicionado ao catálogo com sucesso!');
      }
      setNome('');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-0">
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">
            {editingItem ? 'Editar Item' : 'Novo Item no Catálogo'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Nome do Item (Peça/Equipamento)
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Pneu Dianteiro Trator"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                disabled={isSubmitting}
                autoFocus
              />
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !nome.trim()}
            className="px-5 py-2.5 text-sm font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {editingItem ? 'Salvar Alterações' : 'Salvar Item'}
          </button>
        </div>
      </div>
    </div>
  );
}
