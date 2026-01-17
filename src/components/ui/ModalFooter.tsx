import React from 'react';

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
  noBorder?: boolean;
}

export function ModalFooter({ children, className = '', noBorder = false }: ModalFooterProps) {
  return (
    <div
      className={`px-6 py-4 bg-slate-50 flex flex-col-reverse sm:flex-row gap-3 justify-end items-center ${!noBorder ? 'border-t border-slate-100' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
