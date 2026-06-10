import React, { useEffect, useState } from 'react';
import { DataTable } from '../../ui/DataTable';
import { db } from '../../../services/supabaseService';
import { PdmAiLog } from '../../../types';
import { Copy, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { StatusBadge } from '../../ui/StatusBadge';

export function AiLogsTab() {
  const [logs, setLogs] = useState<PdmAiLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        setLoading(true);
        const data = await db.getPdmAiLogs();
        setLogs(data);
      } catch (error) {
        console.error('Error fetching AI logs:', error);
        toast.error('Erro ao carregar logs da IA.');
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência');
  };

  const columns = [
    {
      key: 'created_at',
      label: 'Data/Hora',
      render: (log: PdmAiLog) => new Date(log.created_at).toLocaleString(),
    },
    {
      key: 'descricao_bruta',
      label: 'Descrição Bruta',
      render: (log: PdmAiLog) => (
        <div className="flex items-center justify-between group gap-2">
          <span className="truncate max-w-[200px]" title={log.descricao_bruta}>
            {log.descricao_bruta}
          </span>
          <button
            onClick={() => handleCopy(log.descricao_bruta)}
            className="p-1 text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Copiar texto bruto"
          >
            <Copy size={14} />
          </button>
        </div>
      ),
    },
    {
      key: 'categoria_detectada',
      label: 'Categoria Detectada',
      render: (log: PdmAiLog) => log.categoria_detectada || '-',
    },
    {
      key: 'status_retornado',
      label: 'Status',
      render: (log: PdmAiLog) => {
        let variant: 'error' | 'default' | 'success' | 'warning' | 'orange' | 'purple' | 'info' = 'default';
        if (log.status_retornado === 'FALTANDO_INFO') variant = 'warning';
        if (log.status_retornado === 'ERRO') variant = 'error';
        return <StatusBadge status={log.status_retornado} variant={variant} />;
      },
    },
    {
      key: 'mensagem_erro',
      label: 'Mensagem/Erro',
      render: (log: PdmAiLog) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          {log.status_retornado === 'ERRO' && <AlertTriangle size={12} className="text-red-500" />}
          <span className="line-clamp-2" title={log.mensagem_erro || ''}>
            {log.mensagem_erro || '-'}
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm min-h-[500px]">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-800">Logs de Falhas na IA</h2>
        <p className="text-xs text-slate-500">
          Visualização de descrições que a IA não conseguiu aprovar automaticamente (FALTANDO_INFO ou ERRO).
        </p>
      </div>
      <DataTable
        data={logs}
        columns={columns}
        rowKey={(log) => log.id}
        isLoading={loading}
        emptyTitle="Nenhum log encontrado"
        emptyDescription="Não há registros de falhas recentes."
      />
    </div>
  );
}
