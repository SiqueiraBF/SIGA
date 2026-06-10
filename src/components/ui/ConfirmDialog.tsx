import { AlertTriangle, Trash2, Info, LucideIcon } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  icon?: LucideIcon;
}

const variants = {
  danger: {
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    defaultIcon: Trash2,
    buttonClass:
      'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/25 active:scale-95',
  },
  warning: {
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    defaultIcon: AlertTriangle,
    buttonClass:
      'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/25 active:scale-95',
  },
  info: {
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    defaultIcon: Info,
    buttonClass:
      'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 active:scale-95',
  },
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  isLoading = false,
  icon,
}: ConfirmDialogProps) {
  const config = variants[variant];
  const Icon = icon || config.defaultIcon;

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" closeOnOverlayClick={!isLoading}>
      <div className="p-8 text-center">
        <div className={`w-16 h-16 ${config.iconBg} rounded-full flex items-center justify-center mx-auto mb-5`}>
          <Icon size={28} className={config.iconColor} />
        </div>

        <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>

        {description && (
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-8">{description}</p>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${config.buttonClass}`}
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
