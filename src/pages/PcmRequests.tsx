import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { pcmService, PcmRequest } from '../services/pcmService';
import { farmService } from '../services/farmService';
import { Plus, MapPin, Loader2, FileText, LayoutGrid, Settings, ClipboardList, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { Loading } from '../components/Loading';
import { PageHeader } from '../components/ui/PageHeader';
import { FilterBar } from '../components/ui/FilterBar';
import { PcmRequestModal } from '../components/pcm/PcmRequestModal';
import { PcmConfirmModal } from '../components/pcm/PcmConfirmModal';
import { PcmEmailSettingsModal } from '../components/pcm/PcmEmailSettingsModal';
import { PcmDetailsModal } from '../components/pcm/PcmDetailsModal';
import toast from 'react-hot-toast';

type SortField = 'num_requisicao' | 'created_at' | 'fazenda' | 'usuario' | 'maquina' | 'prioridade' | 'status' | 'data_confirmacao';
type SortDirection = 'asc' | 'desc';

export function PcmRequests() {
  const { user, role } = useAuth();
  
  // Controle de Permissões PCM
  const pcmPerms = role?.permissoes?.['solicitacoes_pcm'];
  const canCreate = !!pcmPerms?.can_create;
  const canConfirm = !!pcmPerms?.can_confirm;
  const manageNotifications = !!pcmPerms?.manage_notifications;
  const canDelete = !!pcmPerms?.can_delete;
  const canEdit = !!pcmPerms?.can_edit;
  const [requests, setRequests] = useState<PcmRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFarm, setSelectedFarm] = useState<string>('');
  const [farms, setFarms] = useState<any[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PcmRequest | null>(null);
  const [requestToEdit, setRequestToEdit] = useState<PcmRequest | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    loadFarms();
  }, []);

  useEffect(() => {
    if (farms.length > 0) {
      loadRequests();
    }
  }, [farms, selectedFarm]);

  const loadFarms = async () => {
    try {
      const data = await farmService.getFarms();
      setFarms(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await pcmService.getRequests(selectedFarm || undefined);
      setRequests(data);
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao carregar solicitações.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta solicitação?')) {
      try {
        await pcmService.deleteRequest(id);
        toast.success('Solicitação excluída com sucesso!');
        loadRequests();
      } catch (error) {
        console.error(error);
        toast.error('Erro ao excluir solicitação');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING_ALMOXARIFADO':
        return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING_ALMOXARIFADO':
        return 'AGUARDANDO';
      case 'COMPLETED':
        return 'FINALIZADA';
      default:
        return 'DESCONHECIDO';
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} className="text-slate-400 opacity-50" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={14} className="text-blue-600" />
    ) : (
      <ArrowDown size={14} className="text-blue-600" />
    );
  };

  const filteredRequests = requests.filter(req => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return req.num_requisicao.toString().includes(searchLower) || 
             req.fazenda?.nome?.toLowerCase().includes(searchLower) ||
             req.usuario?.nome?.toLowerCase().includes(searchLower) ||
             req.maquina.toLowerCase().includes(searchLower);
    }
    if (showOnlyMine && user && req.created_by !== user.id) return false;

    // Filtro de Visualização por Filial
    if (pcmPerms?.view_scope === 'SAME_FARM' && user?.fazenda_id) {
       if (req.fazenda_id !== user.fazenda_id) return false;
    }

    // Se estiver restrito 'OWN_ONLY' que possivelmente foi incluído ou herdado
    if (pcmPerms?.view_scope === 'OWN_ONLY' && user && req.created_by !== user.id) {
       return false;
    }

    return true;
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    let aValue: any, bValue: any;

    switch (sortField) {
      case 'num_requisicao':
        aValue = a.num_requisicao;
        bValue = b.num_requisicao;
        break;
      case 'created_at':
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
      case 'fazenda':
        aValue = a.fazenda?.nome || '';
        bValue = b.fazenda?.nome || '';
        break;
      case 'usuario':
        aValue = a.usuario?.nome || '';
        bValue = b.usuario?.nome || '';
        break;
      case 'maquina':
        aValue = a.maquina;
        bValue = b.maquina;
        break;
      case 'prioridade':
        aValue = a.prioridade === 'Urgente' ? 1 : 0;
        bValue = b.prioridade === 'Urgente' ? 1 : 0;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'data_confirmacao':
        aValue = a.data_confirmacao ? new Date(a.data_confirmacao).getTime() : 0;
        bValue = b.data_confirmacao ? new Date(b.data_confirmacao).getTime() : 0;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Solicitações PCM"
        subtitle="Visualize e gerencie solicitações de peças e serviços de todas as fazendas"
        icon={ClipboardList}
      >
        {manageNotifications && (
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm bg-white border border-slate-200"
            title="Configurações de E-mail"
          >
            <Settings size={20} />
          </button>
        )}
        
        {canCreate && (
          <button
            onClick={() => {
              setRequestToEdit(null);
              setIsCreateModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/25 active:scale-95"
          >
            <Plus size={18} />
            Nova Solicitação
          </button>
        )}
      </PageHeader>

      <div className="border-b border-slate-200 mt-2">
        <div className="flex gap-8">
          <button className="pb-4 text-sm font-bold flex items-center gap-2 border-b-2 border-blue-600 text-blue-600 transition-colors">
            <FileText size={16} />
            Lista de Solicitações
          </button>
          <button className="pb-4 text-sm font-bold flex items-center gap-2 border-b-2 border-transparent text-slate-500 hover:text-slate-700 transition-colors">
            <LayoutGrid size={16} />
            Visão Geral
          </button>
        </div>
      </div>

      <FilterBar
        onSearch={setSearchTerm}
        searchValue={searchTerm}
        searchPlaceholder="Buscar por REQUISIÇÃO, Unidade ou Solicitante..."
        onClear={() => setSearchTerm('')}
        hasActiveFilters={!!searchTerm || showOnlyMine}
      >
          <button
            onClick={() => setShowOnlyMine(!showOnlyMine)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all text-sm h-full ${showOnlyMine
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {showOnlyMine ? '✅ Minhas SCs' : '👤 Minhas SCs'}
          </button>
      </FilterBar>

      {loading ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
          <Loading />
        </div>
      ) : sortedRequests.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <FileText className="text-slate-400" size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Nenhuma solicitação encontrada</h3>
          <p className="text-slate-500 max-w-sm mt-2">
            Não há registros de solicitação para os filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th 
                    className="px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
                    onClick={() => handleSort('num_requisicao')}
                  >
                    <div className="flex items-center gap-2">
                      Requisição <SortIcon field="num_requisicao" />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-2">
                      Data <SortIcon field="created_at" />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('fazenda')}
                  >
                    <div className="flex items-center gap-2">
                      Unidade <SortIcon field="fazenda" />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('usuario')}
                  >
                    <div className="flex items-center gap-2">
                      Solicitante <SortIcon field="usuario" />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-center cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('maquina')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      Equipamento <SortIcon field="maquina" />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-center cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('prioridade')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      Prioridade <SortIcon field="prioridade" />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-center cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      Status <SortIcon field="status" />
                    </div>
                  </th>
                  <th className="px-3 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">SC</th>
                  <th 
                    className="px-3 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('data_confirmacao')}
                  >
                    <div className="flex items-center gap-2">
                      Data SC <SortIcon field="data_confirmacao" />
                    </div>
                  </th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-right w-[100px]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {sortedRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => {
                      setSelectedRequest(req);
                      setIsDetailsModalOpen(true);
                  }}>
                    <td className="px-4 py-4">
                      <div className="text-sm font-mono font-medium text-slate-500">#{req.num_requisicao}</div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex flex-col text-xs font-mono leading-tight">
                        <span className="text-slate-500 font-medium">{new Date(req.created_at).toLocaleDateString('pt-BR')}</span>
                        <span className="text-slate-400 text-[10px]">{new Date(req.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4 max-w-[140px]">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 truncate">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate" title={req.fazenda?.nome}>{req.fazenda?.nome || '-'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600 max-w-[150px] truncate">
                         <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase shrink-0">
                           {(req.usuario?.nome || 'U').charAt(0)}
                         </div>
                         <span className="truncate">{req.usuario?.nome || 'Desconhecido'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-center">
                      <div className="text-sm font-bold text-slate-700 max-w-[120px] truncate" title={req.maquina}>{req.maquina}</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${
                        req.prioridade === 'Urgente' ? 'bg-red-50 text-red-500 border-red-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {req.prioridade}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider border whitespace-nowrap ${getStatusColor(req.status)}`}>
                        {getStatusLabel(req.status)}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      {req.sc_numero ? (
                        <div className="text-[11px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 inline-block whitespace-nowrap">
                          #{req.sc_numero}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      {req.data_confirmacao ? (
                        <div className="flex flex-col text-xs font-mono leading-tight items-start">
                          <span className="text-slate-500 font-medium">{new Date(req.data_confirmacao).toLocaleDateString('pt-BR')}</span>
                          <span className="text-slate-400 text-[10px]">{new Date(req.data_confirmacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right w-[100px]">
                      <div className="flex justify-end items-center gap-2">
                        {req.status === 'PENDING_ALMOXARIFADO' && canEdit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRequestToEdit(req);
                              setIsCreateModalOpen(true);
                            }}
                            className="p-2 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all shadow-sm active:scale-95"
                            title="Editar Solicitação"
                          >
                            <Pencil size={18} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(req.id);
                            }}
                            className="p-2 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-all shadow-sm active:scale-95"
                            title="Excluir Solicitação"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                        {req.status === 'PENDING_ALMOXARIFADO' && canConfirm && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRequest(req);
                              setIsConfirmModalOpen(true);
                            }}
                            className="p-2 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all shadow-sm active:scale-95"
                            title="Confirmar Solicitação"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                        )}
                        {/* Se não tem permissão ou já passou, não mostra nada além (exceto se houver delete livre) */}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PcmRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setRequestToEdit(null);
        }}
        onSuccess={loadRequests}
        farms={farms}
        requestDataToEdit={requestToEdit}
      />

      <PcmConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setSelectedRequest(null);
        }}
        onSuccess={loadRequests}
        request={selectedRequest}
      />

      <PcmEmailSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      <PcmDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedRequest(null);
        }}
        request={selectedRequest}
      />
    </div>
  );
}
