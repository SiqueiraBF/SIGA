import { useRef, useEffect } from 'react';
import { History, X, User, Pencil } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { AuditLog, Fazenda } from '../../types';

interface RequestHistoryProps {
  logs: AuditLog[];
  usersMap: Record<string, string>;
  isLoading: boolean;
  onClose: () => void;
  fazendas: Fazenda[];
}

export function RequestHistory({
  logs,
  usersMap,
  isLoading,
  onClose,
  fazendas,
}: RequestHistoryProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const formatValue = (key: string, val: any) => {
    if (val === null || val === undefined || val === '') return '(Vazio)';
    if (key === 'fazenda_id') {
      const f = fazendas.find((faz) => faz.id === String(val));
      return f ? f.nome : val;
    }
    if (key === 'status') {
      if (val === 'Aberto') return 'Rascunho';
    }
    if (key === 'status_item') {
      if (val === 'Reprovado') return 'Devolvido';
    }
    return String(val);
  };

  const renderLogDetails = (log: AuditLog) => {
    const labels: Record<string, string> = {
      descricao: 'Descrição',
      unidade: 'UN',
      marca: 'Marca',
      referencia: 'Ref',
      status_item: 'Status',
      status: 'Status',
      cod_reduzido_unisystem: 'Cód. UNI',
      motivo_reprovacao: 'Motivo',
      prioridade: 'Prioridade',
      fazenda_id: 'Filial',
      observacao_geral: 'Obs',
    };

    const oldData: any = log.dados_anteriores || {};
    const newData: any = log.dados_novos || {};

    // Creation: Show all new fields
    if (log.acao === 'CRIAR') {
      return (
        <div className="mt-2 text-xs bg-slate-50 p-2 rounded border border-slate-100 text-slate-600 space-y-0.5">
          {Object.entries(newData).map(([key, value]) => {
            if (!value || !labels[key]) return null;
            return (
              <div key={key} className="flex gap-1">
                <span className="font-bold min-w-[60px]">{labels[key]}:</span>{' '}
                <span>{formatValue(key, value)}</span>
              </div>
            );
          })}
        </div>
      );
    }

    // Deletion: Show what was removed
    if (log.acao === 'EXCLUIR' || log.acao === 'ITEM_EXCLUIDO') {
      const target = log.dados_anteriores ? log.dados_anteriores : log.dados_novos; // Fallback
      return (
        <div className="mt-2 text-xs bg-red-50 p-2 rounded border border-red-100 text-red-600 space-y-0.5">
          <span className="font-bold text-[10px] uppercase mb-1 block">Item Removido:</span>
          {Object.entries(target || {}).map(([key, value]) => {
            if (!value || !labels[key]) return null;
            return (
              <div key={key} className="flex gap-1">
                <span className="font-bold min-w-[60px]">{labels[key]}:</span>{' '}
                <span>{formatValue(key, value)}</span>
              </div>
            );
          })}
        </div>
      );
    }

    // Item Modified (Request Summary)
    if (log.acao === 'ITEM_ALTERADO') {
      const dNov = newData as any;
      const changes = dNov.alteracoes || {};
      return (
        <div className="mt-2 text-xs bg-blue-50/50 p-2 rounded border border-blue-100 text-slate-600 space-y-1">
          <p className="font-bold text-blue-700 text-[10px] uppercase mb-0.5 flex items-center gap-1">
            <Pencil size={10} /> Alteração no Item: {dNov.item}
          </p>
          {Object.entries(changes).map(([k, v]) => {
            if (k === 'id' || !labels[k]) return null;
            // Verify if it is status change to highlight
            if (k === 'status_item') {
              const oldStatus = (log.dados_anteriores as any)?.status_anterior;
              return (
                <div key={k} className="flex gap-1 items-center">
                  <span className="font-bold">{labels[k]}:</span>
                  {oldStatus && (
                    <span className="line-through text-red-400 opacity-70 text-[10px]">
                      {formatValue(k, oldStatus)}
                    </span>
                  )}
                  {oldStatus && <span className="text-[10px] text-slate-400">➜</span>}
                  <span className="font-medium text-green-700">{formatValue(k, v)}</span>
                </div>
              );
            }
            return (
              <div key={k} className="flex gap-1">
                <span className="font-bold">{labels[k]}:</span>
                <span className="font-medium">{formatValue(k, v)}</span>
              </div>
            );
          })}
        </div>
      );
    }

    // Edit/Status: Show Diff
    if (log.acao === 'EDITAR' || log.acao === 'STATUS') {
      const changes = [];
      const allKeys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]));

      for (const key of allKeys) {
        if (!labels[key]) continue;
        if (key === 'id' || key === 'solicitacao_id' || key === 'item_id') continue;
        // Simple equality check (loose for numbers/strings)
        if (oldData[key] == newData[key]) continue;

        changes.push({
          key,
          label: labels[key],
          oldVal: oldData[key],
          newVal: newData[key],
        });
      }

      if (changes.length === 0) return null;

      return (
        <div className="mt-2 text-xs bg-yellow-50/50 p-2 rounded border border-yellow-100 text-slate-600 space-y-1">
          {changes.map((c) => (
            <div key={c.key} className="flex flex-wrap items-center gap-1">
              <span className="font-bold text-slate-700 min-w-[60px]">{c.label}:</span>
              <span className="line-through text-red-400 opacity-70 bg-white px-1 rounded border border-red-100 decoration-red-400/50">
                {formatValue(c.key, c.oldVal)}
              </span>
              <span className="text-slate-400 text-[10px]">➜</span>
              <span className="text-green-600 font-bold bg-white px-1 rounded border border-green-100">
                {formatValue(c.key, c.newVal)}
              </span>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="absolute top-0 right-0 w-80 h-full bg-white shadow-xl border-l border-slate-200 z-50 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2 text-slate-700">
          <History size={18} className="text-blue-600" />
          <h3 className="font-bold text-sm">Histórico de Atividades</h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={panelRef}>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <span className="text-slate-400 text-sm animate-pulse">Carregando histórico...</span>
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center text-slate-400 text-sm italic">Nenhuma atividade registrada.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="relative pl-6 pb-2 last:pb-0 group">
              {/* Timeline Line */}
              <div className="absolute left-[9px] top-6 bottom-[-24px] w-[2px] bg-slate-100 group-last:hidden"></div>

              {/* Timeline Dot */}
              <div
                className={`absolute left-0 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 ${
                  log.acao === 'CRIAR'
                    ? 'border-green-200 bg-green-50 text-green-600'
                    : log.acao === 'EXCLUIR' || log.acao === 'ITEM_EXCLUIDO'
                      ? 'border-red-200 bg-red-50 text-red-600'
                      : 'border-blue-200 bg-blue-50 text-blue-600'
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
              </div>

              {/* Content */}
              <div>
                <p className="text-xs text-slate-400 font-mono mb-0.5">
                  {format(parseISO(log.data_hora), "dd/MM/yy 'às' HH:mm")}
                </p>
                <div className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <User size={12} className="text-slate-400" />
                  {usersMap[log.usuario_id] || 'Desconhecido'}
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5 mb-1 bg-slate-100/50 inline-block px-1.5 py-0.5 rounded">
                  {log.acao === 'CRIAR' && 'Criou registro'}
                  {log.acao === 'EDITAR' && 'Editou informações'}
                  {log.acao === 'STATUS' && 'Alterou status'}
                  {log.acao === 'EXCLUIR' && 'Excluiu registro'}
                  {log.acao === 'ITEM_EXCLUIDO' && 'Removeu item'}
                  {log.acao === 'ITEM_ALTERADO' && 'Alterou item'}
                </div>

                {/* Details Diff */}
                {renderLogDetails(log)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
