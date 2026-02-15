import { db } from '../services/supabaseService';
import { format } from 'date-fns';
import { formatInSystemTime } from '../utils/dateUtils';
import { Clock, User, Edit, Plus, Trash, ArrowRight, Fuel } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { AuditLog, Fazenda, Usuario, Funcao } from '../types';

// UI Kit
import { ModalHeader } from './ui/ModalHeader';
import { ModalFooter } from './ui/ModalFooter';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  registroId: string;
  useSimpleFetch?: boolean; // If true, fetches logs by parent ID only. If false, fetches recursive (request + items)
}

// Helper to get readable field names
const fieldLabels: Record<string, string> = {
  nome: 'Nome',
  login: 'Login',
  ativo: 'Status Ativo',
  usuario_id: 'Usuário',
  fazenda_id: 'Filial',
  funcao_id: 'Função',
  prioridade: 'Prioridade',
  status: 'Status',
  observacao_geral: 'Observação Geral',
  data_abertura: 'Data de Abertura',
  descricao: 'Descrição',
  unidade: 'Unidade',
  marca: 'Marca',
  status_item: 'Status do Item',
  cod_reduzido_unisystem: 'Código Unisystem',
  motivo_reprovacao: 'Motivo da Reprovação',
  item: 'Item',
  status_anterior: 'Status Anterior',
  status_novo: 'Status Novo',
  alteracoes: 'Dados Alterados',
  item_removido: 'Item Removido',
  // Fueling
  veiculo_nome: 'Veículo',
  veiculo_id: 'ID Veículo',
  posto_id: 'Posto',
  volume: 'Volume (L)',
  operador: 'Operador',
  operacao: 'Operação',
  cultura: 'Cultura',
  tipo_marcador: 'Tipo Marcador',
  leitura_marcador: 'Leitura',
  motivo_sem_marcador: 'Motivo s/ Marcador',
};

export function AuditLogModal({
  isOpen,
  onClose,
  registroId,
  useSimpleFetch = false,
}: AuditLogModalProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [postos, setPostos] = useState<{ id: string; nome: string }[]>([]);

  useEffect(() => {
    if (isOpen && registroId) {
      loadData();
    }
  }, [isOpen, registroId]);

  const loadData = async () => {
    try {
      // Usa a nova busca recursiva que traz logs da solicitação E dos itens relacionados
      const [logsData, fazendasData, usuariosData, postosData] = await Promise.all([
        useSimpleFetch ? db.getLogs(registroId) : db.getRequestWithItemLogs(registroId),
        db.getAllFarms(),
        db.getAllUsers(),
        db.getPostos(),
      ]);

      setLogs(logsData);
      setFazendas(fazendasData);
      setUsuarios(usuariosData);
      setPostos(postosData);

      // Load funcoes from unique IDs in usuarios
      const uniqueFuncaoIds = new Set<string>();
      usuariosData.forEach((u) => u.funcao_id && uniqueFuncaoIds.add(u.funcao_id));
      const allFuncoes = await Promise.all(Array.from(uniqueFuncaoIds).map((id) => db.getRole(id)));
      setFuncoes(allFuncoes.filter((f): f is Funcao => f !== null));
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    }
  };

  // Helper to format values - now using local state
  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return '-';

    // Resolve fazenda_id
    if (key === 'fazenda_id' && typeof value === 'string') {
      const farm = fazendas.find((f) => f.id === value);
      return farm ? farm.nome : value;
    }

    // Resolve funcao_id
    if (key === 'funcao_id' && typeof value === 'string') {
      const role = funcoes.find((r) => r.id === value);
      return role ? role.nome : value;
    }

    // Resolve usuario_id
    if (key === 'usuario_id' && typeof value === 'string') {
      const user = usuarios.find((u) => u.id === value);
      return user ? user.nome : value;
    }

    // Resolve posto_id
    if (key === 'posto_id' && typeof value === 'string') {
      const posto = postos.find((p) => p.id === value);
      return posto ? posto.nome : value;
    }

    // Format dates
    if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
      try {
        return formatInSystemTime(value);
      } catch {
        return value;
      }
    }

    // Boolean
    if (typeof value === 'boolean') {
      return value ? 'Sim' : 'Não';
    }

    // Arrays
    if (Array.isArray(value)) {
      return value.join(', ');
    }

    // Objects
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }

    return String(value);
  };

  const getChangedFields = (
    before: any,
    after: any,
  ): { field: string; before: string; after: string }[] => {
    const changes: { field: string; before: string; after: string }[] = [];
    // Se ambos forem nulos, não há mudanças
    if (!before && !after) return [];

    // Unir todas as chaves
    const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

    allKeys.forEach((key) => {
      // 1. Ignorar campos técnicos e de controle interno
      if (
        [
          'id',
          'solicitacao_id',
          'usuario_id',
          'fazenda_id',
          'funcao_id',
          'senha',
          'usuario',
          'fazenda',
          'created_at',
          'updated_at',
          'numero',
        ].includes(key)
      )
        return;

      const rawBefore = before ? before[key] : null;
      const rawAfter = after ? after[key] : null;

      const beforeVal = formatValue(key, rawBefore);
      const afterVal = formatValue(key, rawAfter);

      // 2. Ignorar se ambos forem considerados "vazios" (evita poluição visual de campos opcionais não preenchidos)
      const isBeforeEmpty = rawBefore === null || rawBefore === undefined || rawBefore === '';
      const isAfterEmpty = rawAfter === null || rawAfter === undefined || rawAfter === '';

      if (isBeforeEmpty && isAfterEmpty) return;

      // 3. Ignorar se os valores formatados forem iguais
      if (beforeVal === afterVal) return;

      changes.push({
        field: key,
        before: isBeforeEmpty ? '' : beforeVal,
        after: isAfterEmpty ? '' : afterVal,
      });
    });

    return changes;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader
          title="Histórico de Auditoria"
          subtitle={`Registro ID: ${registroId.substring(0, 8)}`}
          icon={Clock}
          iconClassName="text-purple-600 bg-purple-100/50 border-purple-100"
          onClose={onClose}
        />

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {logs.length === 0 ? (
            <div className="text-center py-16">
              <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">Nenhum registro de auditoria encontrado.</p>
            </div>
          ) : (
            logs.map((log, index) => {
              const user = usuarios.find((u) => u.id === log.usuario_id);
              const changes = getChangedFields(log.dados_anteriores, log.dados_novos);
              const action = log.acao?.toUpperCase() || 'EDITAR';

              // Ocultar logs de edição que não resultaram em mudanças visíveis (ex: salvamento sem alteração)
              if (changes.length === 0 && (action === 'EDITAR' || action === 'UPDATE')) {
                return null;
              }

              // Lógica refinada de Exibição (Título e Estilo)
              const getActionDisplay = () => {
                const table = log.tabela || '';

                // Logs de Itens
                if (table === 'ItemSolicitacao' || action.includes('ITEM')) {
                  if (action === 'CRIAR' || action === 'ITEM_ADICIONADO')
                    return {
                      label: 'ITEM ADICIONADO',
                      icon: Plus,
                      style: {
                        bg: 'bg-green-50',
                        border: 'border-green-500',
                        text: 'text-green-700',
                      },
                    };
                  if (action === 'EDITAR' || action === 'ITEM_ALTERADO') {
                    // Tenta pegar a descrição do item (dos dados novos ou anteriores)
                    const itemDesc =
                      (log.dados_novos as any)?.descricao ||
                      (log.dados_anteriores as any)?.descricao ||
                      '';

                    return {
                      label: itemDesc ? `ITEM ALTERADO: ${itemDesc}` : 'ITEM ALTERADO',
                      icon: Edit,
                      style: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-700' },
                    };
                  }
                  if (
                    action === 'EXCLUIR' ||
                    action === 'ITEM_EXCLUIDO' ||
                    action.includes('DELETAR')
                  )
                    return {
                      label: 'ITEM REMOVIDO',
                      icon: Trash,
                      style: { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-700' },
                    };
                }

                // Logs de Solicitação
                if (action === 'CRIAR')
                  return {
                    label: 'REGISTRO CRIADO',
                    icon: Plus,
                    style: {
                      bg: 'bg-green-50',
                      border: 'border-green-500',
                      text: 'text-green-700',
                    },
                  };
                if (action === 'EDITAR')
                  return {
                    label: 'REGISTRO EDITADO',
                    icon: Edit,
                    style: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-700' },
                  };
                if (action === 'EXCLUIR')
                  return {
                    label: 'REGISTRO EXCLUÍDO',
                    icon: Trash,
                    style: { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-700' },
                  };

                // Abastecimento specific
                if (table === 'Abastecimento') {
                  if (action === 'CRIAR')
                    return {
                      label: 'ABASTECIMENTO LANÇADO',
                      icon: Fuel,
                      style: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-700' },
                    };
                  // Check for CONFIRM (legacy/theoretical) or EDITAR with status change to BAIXADO
                  if (
                    action === 'CONFIRM' ||
                    (action === 'EDITAR' && (log.dados_novos as any)?.status === 'BAIXADO')
                  )
                    return {
                      label: 'BAIXA CONFIRMADA',
                      icon: Fuel,
                      style: {
                        bg: 'bg-green-50',
                        border: 'border-green-500',
                        text: 'text-green-700',
                      },
                    };
                }

                if (action === 'STATUS')
                  return {
                    label: 'ALTERAÇÃO DE STATUS',
                    icon: Edit,
                    style: { bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-700' },
                  };

                // Fallback
                return {
                  label: action,
                  icon: Edit,
                  style: { bg: 'bg-slate-50', border: 'border-slate-500', text: 'text-slate-700' },
                };
              };

              const { label, icon: ActionIcon, style } = getActionDisplay();

              return (
                <div
                  key={log.id}
                  className={`relative bg-white rounded-xl shadow-sm border-l-4 ${style.border} overflow-hidden hover:shadow-md transition-shadow`}
                >
                  {/* Header */}
                  <div className={`${style.bg} px-5 py-3 border-b border-slate-100`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${style.bg}`}>
                          <ActionIcon className={`w-5 h-5 ${style.text}`} />
                        </div>
                        <div>
                          <h4 className={`font-bold ${style.text} uppercase text-sm tracking-wide`}>
                            {label}
                          </h4>
                          <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <User size={12} />
                            <span>{user?.nome || 'Sistema'}</span>
                            <span>•</span>
                            <span>{formatInSystemTime(log.data_hora, 'dd/MM/yyyy HH:mm:ss')}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Changes */}
                  {changes.length > 0 && (
                    <div className="px-5 py-4">
                      <div className="space-y-3">
                        {changes.map((change, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-4 text-sm border-b last:border-0 border-slate-50 pb-2 last:pb-0"
                          >
                            <span
                              className="font-semibold text-slate-500 w-[150px] shrink-0 truncate"
                              title={fieldLabels[change.field] || change.field}
                            >
                              {fieldLabels[change.field] || change.field}
                            </span>

                            <div className="flex-1 flex items-center gap-3 overflow-hidden">
                              {/* Se tinha valor anterior, mostra riscado */}
                              {change.before && (
                                <>
                                  <div className="bg-red-50 text-red-600 px-2 py-1 rounded text-xs line-through opacity-75 truncate max-w-[40%]">
                                    {change.before}
                                  </div>
                                  <ArrowRight size={14} className="text-slate-300 shrink-0" />
                                </>
                              )}

                              {/* Valor novo */}
                              <div className="bg-emerald-50 text-emerald-700 font-medium px-2 py-1 rounded text-xs border border-emerald-100 truncate flex-1 block">
                                {change.after || '(Vazio)'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <ModalFooter>
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            Fechar
          </button>
        </ModalFooter>
      </div>
    </div>
  );
}
