import React from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  label: string; // Required for accessibility (renders as title + aria-label)
  isLoading?: boolean;
  badge?: boolean; // Show a small dot indicator
}

const variantClasses = {
  default:
    'text-slate-400 hover:text-blue-600 hover:bg-blue-50 bg-white border border-slate-200 shadow-sm',
  primary:
    'text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 shadow-sm',
  danger:
    'text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 shadow-sm',
  success:
    'text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 shadow-sm',
  warning:
    'text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 shadow-sm',
};

const sizeClasses = {
  sm: 'p-1.5',
  md: 'p-2.5',
  lg: 'p-3',
};

const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
};

export function IconButton({
  icon: Icon,
  variant = 'default',
  size = 'md',
  label,
  isLoading = false,
  badge = false,
  className = '',
  disabled,
  ...rest
}: IconButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      className={`
        relative rounded-xl transition-all active:scale-95
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${isDisabled ? 'opacity-50 cursor-not-allowed !active:scale-100' : ''}
        ${className}
      `}
      title={label}
      aria-label={label}
      disabled={isDisabled}
      {...rest}
    >
      {isLoading ? (
        <Loader2 size={iconSizes[size]} className="animate-spin" />
      ) : (
        <Icon size={iconSizes[size]} />
      )}
      {badge && (
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
      )}
    </button>
  );
}
