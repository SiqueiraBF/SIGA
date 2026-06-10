import React from 'react';
import { twMerge } from 'tailwind-merge';

interface ModalFooterProps {
  children?: React.ReactNode;
  className?: string;
  noBorder?: boolean;
  startActions?: React.ReactNode;
  endActions?: React.ReactNode;
  eliteStyle?: boolean;
}

export function ModalFooter({ children, className = '', noBorder = false, startActions, endActions, eliteStyle }: ModalFooterProps) {
  const hasActions = startActions || endActions;

  return (
    <div
      className={twMerge(
        "flex flex-col-reverse sm:flex-row gap-3 items-center shrink-0",
        eliteStyle ? "px-6 py-4 bg-white" : "px-6 py-4 bg-slate-50",
        hasActions ? "justify-between" : "justify-end",
        !noBorder && (eliteStyle ? "border-t border-slate-200" : "border-t border-slate-100"),
        className
      )}
    >
      {hasActions ? (
        <>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-start">
            {startActions}
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
            {children}
            {endActions}
          </div>
        </>
      ) : (
        children
      )}
    </div>
  );
}
