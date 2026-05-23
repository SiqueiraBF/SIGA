import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { PcmRequest } from '../../services/pcmService';

interface PcmCancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (motivo: string, request: PcmRequest) => Promise<void>;
  request: PcmRequest | null;
}

export function PcmCancelModal({ isOpen, onClose, onConfirm, request }: PcmCancelModalProps) {
  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) return;

    setIsSubmitting(true);
    try {
      await onConfirm(motivo, request);
      setMotivo('');
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3 text-red-600">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Cancelar Solicitação</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-500 hover:bg-slate-50 p-2 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-sm text-slate-600 mb-6">
            Você está prestes a cancelar a requisição <strong className="text-slate-800">#{request.num_requisicao}</strong>. 
            Esta ação não pode ser desfeita e um e-mail será enviado ao almoxarifado informando o cancelamento.
          </p>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 block">
              Motivo do Cancelamento <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none h-32"
              placeholder="Descreva detalhadamente o motivo do cancelamento..."
              autoFocus
            />
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={!motivo.trim() || isSubmitting}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-red-500/25 active:scale-95 disabled:active:scale-100 flex items-center gap-2"
            >
              {isSubmitting ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
