import type { Solicitacao } from '../../types';
import { Ban, Check, CheckCircle2, Play, RefreshCw, RotateCcw, Save, Send, X } from 'lucide-react';
import { ModalFooter } from '../ui/ModalFooter';

interface RequestActionsProps {
  status: string;
  isOwner: boolean;
  canAnalyst: boolean; // Pode analisar
  hasFullManagement: boolean; // Pode tudo (admin)
  isSubmitting: boolean;
  onAction: (
    action: 'SAVE_CHANGES' | 'SEND_CADASTRO' | 'START_CADASTRO' | 'FINISH_OR_RETURN' | 'REOPEN',
  ) => void;
  onClose: () => void;
  onDelete: () => void;
}

export function RequestActions({
  status,
  isOwner,
  canAnalyst,
  hasFullManagement,
  isSubmitting,
  onAction,
  onClose,
  onDelete,
}: RequestActionsProps) {
  const renderActions = () => {
    // 1. DRAFT (Aberto)
    if (status === 'Aberto') {
      if (!isOwner && !hasFullManagement) {
        return (
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">
            Fechar
          </button>
        );
      }
      return (
        <>
          <button
            type="button"
            onClick={onDelete}
            className="mr-auto px-4 py-2 text-red-500 hover:bg-red-50 rounded flex items-center gap-2 transition-colors text-sm font-medium"
          >
            <Ban size={16} /> Excluir Rascunho
          </button>

          <button
            type="button"
            onClick={() => onAction('SAVE_CHANGES')}
            disabled={isSubmitting}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded flex items-center gap-2 transition-colors text-sm font-medium shadow-sm"
          >
            <Save size={16} /> Salvar Rascunho
          </button>

          <button
            type="button"
            onClick={() => onAction('SEND_CADASTRO')}
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded flex items-center gap-2 transition-colors shadow-sm text-sm font-medium"
          >
            {isSubmitting ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
            Enviar Solicitação
          </button>
        </>
      );
    }

    // 2. WAITING (Aguardando)
    if (status === 'Aguardando') {
      if (canAnalyst) {
        return (
          <>
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded mr-auto"
            >
              Fechar Visualização
            </button>
            <button
              onClick={() => onAction('START_CADASTRO')}
              className="px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded flex items-center gap-2 shadow-sm font-medium transition-colors"
            >
              <Play size={16} /> Iniciar Análise
            </button>
          </>
        );
      }
      // Owner waiting
      return (
        <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">
          Fechar
        </button>
      );
    }

    // 3. IN PROGRESS (Em Cadastro)
    if (status === 'Em Cadastro') {
      if (canAnalyst) {
        return (
          <>
            <button
              onClick={() => onAction('SAVE_CHANGES')}
              disabled={isSubmitting}
              className="mr-auto px-4 py-2 text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded flex items-center gap-2 text-sm font-medium"
            >
              <Save size={16} /> Salvar Progresso
            </button>

            <button
              onClick={() => onAction('FINISH_OR_RETURN')}
              disabled={isSubmitting}
              className="px-6 py-2 bg-green-600 text-white hover:bg-green-700 rounded flex items-center gap-2 shadow-sm font-medium"
            >
              <CheckCircle2 size={16} /> Finalizar / Devolver
            </button>
          </>
        );
      }
      return (
        <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">
          Fechar
        </button>
      );
    }

    // 4. RETURNED (Devolvido)
    if (status === 'Devolvido') {
      if (isOwner || hasFullManagement) {
        return (
          <>
            <button
              onClick={() => onAction('SAVE_CHANGES')}
              disabled={isSubmitting}
              className="mr-auto px-4 py-2 text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded flex items-center gap-2 text-sm font-medium"
            >
              <Save size={16} /> Salvar Correções
            </button>

            <button
              onClick={() => onAction('SEND_CADASTRO')}
              disabled={isSubmitting}
              className="px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 rounded flex items-center gap-2 shadow-sm font-medium"
            >
              <RotateCcw size={16} /> Reenviar para Análise
            </button>
          </>
        );
      }
    }

    // 5. FINALIZED (Finalizado)
    if (status === 'Finalizado') {
      if (hasFullManagement || canAnalyst) {
        return (
          <>
            <button
              type="button"
              onClick={() => onAction('REOPEN')}
              className="mr-auto px-4 py-2 text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded flex items-center gap-2 transition-colors text-sm font-medium"
            >
              <RotateCcw size={16} /> Reabrir Chamado
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded"
            >
              Fechar
            </button>
          </>
        );
      }
    }

    // Default Fallback
    return (
      <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">
        Fechar
      </button>
    );
  };

  return <ModalFooter>{renderActions()}</ModalFooter>;
}
