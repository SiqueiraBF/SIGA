import React from 'react';
import { Building2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export const TableCells = {
  // Célula de ID (Ex: #1234)
  Id: ({ value, badge }: { value: string | number, badge?: React.ReactNode }) => (
    <div className="flex items-center gap-2 font-mono text-slate-500 font-medium">
      #{value}
      {badge}
    </div>
  ),

  // Célula de Data em Duas Linhas (Data em cima, Hora embaixo)
  Date: ({ date, time }: { date: string, time?: string | null }) => (
    <div className="flex flex-col leading-tight items-start">
      <span className="text-sm text-slate-700">{date}</span>
      {time && <span className="text-xs text-slate-400">{time}</span>}
    </div>
  ),

  // Célula de Usuário/Comprador/Solicitante (Avatar circular com Iniciais)
  User: ({ name, initials }: { name?: string | null, initials?: string | null }) => {
    const fallbackName = name || 'Desconhecido';
    const displayInitials = initials || fallbackName.charAt(0);
    return (
      <div className="flex items-center gap-2 text-slate-600 max-w-[150px] truncate">
        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 uppercase shrink-0">
          {displayInitials}
        </div>
        <span className="truncate">{fallbackName}</span>
      </div>
    );
  },

  // Célula de Filial / Fazenda
  Farm: ({ name }: { name?: string | null }) => (
    <div className="flex items-center gap-2 text-slate-700">
      <Building2 size={14} className="text-slate-700 shrink-0" />
      <span className="font-medium truncate max-w-[150px]">
        {name || 'N/A'}
      </span>
    </div>
  ),

  // Célula de Texto Padrão (Ex: SLA, Itens, Equipamentos)
  Text: ({ text, bold = false, align = 'left' }: { text: string | number, bold?: boolean, align?: 'left' | 'center' | 'right' }) => (
    <div className={`text-sm text-slate-600 ${bold ? 'font-bold' : 'font-medium'} text-${align}`}>
      {text}
    </div>
  ),

  // Célula de Status (Aproveitando o StatusBadge)
  Status: ({ status, variant }: { status: string, variant: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' | 'orange' }) => (
    <StatusBadge status={status} variant={variant} size="sm" />
  ),

  // Célula de Prioridade (Encapsulando StatusBadge com regras prontas se necessário, ou só wrapper genérico)
  Priority: ({ priority }: { priority: string }) => (
    <StatusBadge
      status={priority}
      variant={priority.toLowerCase() === 'urgente' || priority.toLowerCase() === 'alta' ? 'error' : 'default'}
      size="sm"
    />
  )
};
