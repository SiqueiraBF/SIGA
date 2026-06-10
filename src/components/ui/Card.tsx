import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({
  children,
  className = '',
  padding = false,
  hover = false,
  onClick,
}: CardProps) {
  return (
    <div
      className={`
        bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden
        ${hover ? 'hover:shadow-md transition-all cursor-pointer' : ''}
        ${padding ? 'p-6' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
