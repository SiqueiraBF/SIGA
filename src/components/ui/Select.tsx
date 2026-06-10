import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ error = false, options, placeholder, className = '', ...rest }, ref) => {
    return (
      <select
        ref={ref}
        className={`
          w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-slate-800 appearance-none
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none
          disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed
          bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]
          bg-[length:20px] bg-[position:right_12px_center] bg-no-repeat pr-10
          ${error ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-200'}
          ${className}
        `}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }
);

Select.displayName = 'Select';
