import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error = false, icon, className = '', ...rest }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`
            w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-slate-800
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none
            disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed
            placeholder:text-slate-400
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-200'}
            ${className}
          `}
          {...rest}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';
