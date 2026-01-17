import { Edit2, Trash2, History, Eye, LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface TableActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onHistory?: () => void;
  onView?: () => void;
  children?: ReactNode; // Custom actions
}

interface ActionButtonProps {
  onClick: (() => void) | undefined;
  icon: LucideIcon;
  variant: 'blue' | 'red' | 'purple' | 'slate';
  title: string;
}

function ActionButton({ onClick, icon: Icon, variant, title }: ActionButtonProps) {
  if (!onClick) return null;

  const variants = {
    blue: 'text-blue-600 hover:bg-blue-50 hover:text-blue-700',
    red: 'text-slate-400 hover:bg-red-50 hover:text-red-600',
    purple: 'text-slate-400 hover:bg-purple-50 hover:text-purple-600',
    slate: 'text-slate-400 hover:bg-slate-50 hover:text-slate-600',
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`p-1.5 rounded-lg transition-colors ${variants[variant]}`}
      title={title}
    >
      <Icon size={18} />
    </button>
  );
}

export function TableActions({ onEdit, onDelete, onHistory, onView, children }: TableActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      {onHistory && (
        <ActionButton onClick={onHistory} icon={History} variant="purple" title="Histórico" />
      )}
      {onView && <ActionButton onClick={onView} icon={Eye} variant="slate" title="Visualizar" />}
      {onEdit && <ActionButton onClick={onEdit} icon={Edit2} variant="blue" title="Editar" />}
      {onDelete && <ActionButton onClick={onDelete} icon={Trash2} variant="red" title="Excluir" />}
      {children}
    </div>
  );
}
