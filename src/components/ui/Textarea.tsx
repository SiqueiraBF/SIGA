import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error = false, className = '', ...rest }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`
          w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-slate-800 resize-none
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none
          disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed
          placeholder:text-slate-400 min-h-[100px]
          ${error ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-200'}
          ${className}
        `}
        {...rest}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
