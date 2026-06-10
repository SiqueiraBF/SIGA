import React from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variantClasses = {
  primary:
    'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 active:scale-95',
  secondary:
    'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm active:scale-95',
  danger:
    'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/25 active:scale-95',
  ghost:
    'text-slate-500 hover:text-slate-700 hover:bg-slate-100 active:scale-95',
  success:
    'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25 active:scale-95',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-5 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
};

const iconSizes = {
  sm: 14,
  md: 18,
  lg: 20,
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  isLoading = false,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      className={`
        inline-flex items-center justify-center font-bold rounded-xl transition-all
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'opacity-50 cursor-not-allowed !active:scale-100' : ''}
        ${className}
      `}
      disabled={isDisabled}
      {...rest}
    >
      {isLoading ? (
        <Loader2 size={iconSizes[size]} className="animate-spin" />
      ) : (
        Icon && <Icon size={iconSizes[size]} />
      )}
      {children}
      {IconRight && !isLoading && <IconRight size={iconSizes[size]} />}
    </button>
  );
}
