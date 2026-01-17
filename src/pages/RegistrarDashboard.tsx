import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/supabaseService';
import type { Solicitacao, Fazenda, Usuario } from '../types';
import {
  Clock,
  Package,
  TrendingUp,
  AlertCircle,
  ClipboardList,
  CheckCircle,
  User,
  Play,
  Settings,
  AlertTriangle,
} from 'lucide-react';
import { format, parseISO, differenceInHours, differenceInDays } from 'date-fns';
import { RequestFormModal } from '../components/RequestFormModal';

// UI Kit
import { PageHeader } from '../components/ui/PageHeader';
import { StatsCard } from '../components/ui/StatsCard';
import { FilterBar } from '../components/ui/FilterBar';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';

export function RegistrarDashboard() {
  const { user, hasPermission } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<Solicitacao[]>([]);
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Solicitacao[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Filtros de Card Interativos
  const [activeFilter, setActiveFilter] = useState<
    'ALL' | 'AGUARDANDO' | 'EM_CADASTRO' | 'URGENTES' | 'ATRASADOS'
  >('ALL');

  useEffect(() => {
    loadData();
  }, [user, hasPermission]);

  useEffect(() => {
    applyFilters();
  }, [pendingRequests, searchTerm, activeFilter]);

  const loadData = async () => {
    if (user && hasPermission('analisar_cadastros')) {
      const [allRequests, fazendasData, usuariosData] = await Promise.all([
        db.getRequests(user),
        db.getAllFarms(),
        db.getAllUsers(),
      ]);
      setFazendas(fazendasData);
      setUsuarios(usuariosData);

      const filtered = allRequests
        .filter((r) => r.status === 'Aguardando' || r.status === 'Em Cadastro')
        .sort((a, b) => {
          if (a.prioridade === 'Urgente' && b.prioridade !== 'Urgente') return -1;
          if (a.prioridade !== 'Urgente' && b.prioridade === 'Urgente') return 1;
          return new Date(a.data_abertura).getTime() - new Date(b.data_abertura).getTime();
        });
      setPendingRequests(filtered);

      // Load item counts for pending requests
      const counts: Record<string, number> = {};
      await Promise.all(
        filtered.map(async (req) => {
          const items = await db.getItemsByRequestId(req.id);
          counts[req.id] = items.length;
        }),
      );
      setItemCounts(counts);
    }
  };

  const applyFilters = () => {
    let filtered = [...pendingRequests];

    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.numero?.toString().includes(searchTerm) ||
          fazendas
            .find((f) => f.id === r.fazenda_id)
            ?.nome.toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }

    switch (activeFilter) {
      case 'AGUARDANDO':
        filtered = filtered.filter((r) => r.status === 'Aguardando');
        break;
      case 'EM_CADASTRO':
        filtered = filtered.filter((r) => r.status === 'Em Cadastro');
        break;
      case 'URGENTES':
        filtered = filtered.filter((r) => r.prioridade === 'Urgente');
        break;
      case 'ATRASADOS':
        filtered = filtered.filter(
          (r) => differenceInHours(new Date(), parseISO(r.data_abertura)) > 24,
        );
        break;
      case 'ALL':
      default:
        // No extra filter
        break;
    }

    setFilteredRequests(filtered);
  };

  const getTimeAgo = (dateString: string) => {
    const hours = differenceInHours(new Date(), parseISO(dateString));
    const days = differenceInDays(new Date(), parseISO(dateString));

    if (hours < 1) return 'Agora';
    if (hours < 24) return `${hours}h atrás`;
    return `${days}d atrás`;
  };

  const handleOpenRequest = (id: string) => {
    setSelectedRequestId(id);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedRequestId(null);
  };

  const handleModalSave = () => {
    loadData();
  };

  // KPI Calcs
  const aguardando = pendingRequests.filter((r) => r.status === 'Aguardando').length;
  const emCadastro = pendingRequests.filter((r) => r.status === 'Em Cadastro').length;
  const urgentes = pendingRequests.filter((r) => r.prioridade === 'Urgente').length;
  const atrasados = pendingRequests.filter(
    (r) => differenceInHours(new Date(), parseISO(r.data_abertura)) > 24,
  ).length;

  const handleCardClick = (filter: typeof activeFilter) => {
    setActiveFilter(activeFilter === filter ? 'ALL' : filter);
  };

  if (!user || !hasPermission('analisar_cadastros')) {
    return (
      <div className="p-8 text-center">
        <EmptyState
          title="Acesso Negado"
          description="Você não tem permissão para acessar esta área."
          icon={AlertCircle}
        />
      </div>
    );
  }

  const hasActiveFilters = searchTerm || activeFilter !== 'ALL';

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      <PageHeader
        title="Análise de Cadastros"
        subtitle="Gerencie solicitações pendentes e realize cadastros"
        icon={ClipboardList}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 duration-500">
        <StatsCard
          title="AGUARDANDO"
          value={aguardando}
          icon={Clock}
          description="solicitações"
          variant={activeFilter === 'AGUARDANDO' ? 'yellow' : 'default'}
          onClick={() => handleCardClick('AGUARDANDO')}
          className={`hover:bg-yellow-50 ${activeFilter === 'AGUARDANDO' ? 'ring-2 ring-yellow-200 bg-yellow-50' : ''}`}
        />
        <StatsCard
          title="EM CADASTRO"
          value={emCadastro}
          icon={Package}
          description="em progresso"
          variant={activeFilter === 'EM_CADASTRO' ? 'blue' : 'default'}
          onClick={() => handleCardClick('EM_CADASTRO')}
          className={`hover:bg-blue-50 ${activeFilter === 'EM_CADASTRO' ? 'ring-2 ring-blue-200 bg-blue-50' : ''}`}
        />
        <StatsCard
          title="URGENTES"
          value={urgentes}
          icon={AlertCircle}
          description="prioridade alta"
          variant={activeFilter === 'URGENTES' ? 'red' : 'default'}
          onClick={() => handleCardClick('URGENTES')}
          className={`hover:bg-red-50 ${activeFilter === 'URGENTES' ? 'ring-2 ring-red-200 bg-red-50' : ''}`}
        />
        <StatsCard
          title="ATRASADOS (>24h)"
          value={atrasados}
          icon={AlertTriangle}
          description="SLA crítico"
          variant={activeFilter === 'ATRASADOS' ? 'orange' : 'default'}
          onClick={() => handleCardClick('ATRASADOS')}
          className={`hover:bg-orange-50 ${activeFilter === 'ATRASADOS' ? 'ring-2 ring-orange-200 bg-orange-50' : ''}`}
        />
      </div>

      <FilterBar
        onSearch={setSearchTerm}
        searchValue={searchTerm}
        searchPlaceholder="Buscar por número ou fazenda..."
        onClear={() => {
          setSearchTerm('');
          setActiveFilter('ALL');
        }}
        hasActiveFilters={!!hasActiveFilters}
      />

      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="Nenhuma solicitação encontrada"
            description={
              activeFilter !== 'ALL'
                ? 'Tente limpar os filtros.'
                : 'Você está em dia com todas as solicitações.'
            }
          />
        ) : (
          filteredRequests.map((request) => {
            const fazenda = fazendas.find((f) => f.id === request.fazenda_id);
            const solicitante = usuarios.find((u) => u.id === request.usuario_id);
            const isUrgent = request.prioridade === 'Urgente';
            const timeAgo = getTimeAgo(request.data_abertura);

            // SLA Math
            const hours = differenceInHours(new Date(), parseISO(request.data_abertura));
            const maxHours = isUrgent ? 24 : 72;
            const slaPercent = Math.min(100, Math.max(0, (hours / maxHours) * 100));
            const progressColor =
              slaPercent < 50 ? 'bg-green-500' : slaPercent < 80 ? 'bg-yellow-500' : 'bg-red-500';

            const itemCount = itemCounts[request.id] || 0;

            return (
              <div
                key={request.id}
                className={`bg-white rounded-2xl p-0 border-2 transition-all cursor-pointer hover:shadow-lg overflow-hidden group ${
                  isUrgent
                    ? 'border-red-100 hover:border-red-300'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
                onClick={() => handleOpenRequest(request.id)}
              >
                <div className="p-6 flex flex-col md:flex-row items-start gap-6">
                  <div
                    className={`flex-shrink-0 w-16 h-16 rounded-2xl flex flex-col items-center justify-center border shadow-sm ${
                      isUrgent
                        ? 'bg-red-50 border-red-100 text-red-600'
                        : 'bg-blue-50 border-blue-100 text-blue-600'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider">SC</span>
                    <span className="text-2xl font-bold leading-none">#{request.numero}</span>
                  </div>

                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-3">
                      <StatusBadge
                        status={request.prioridade}
                        variant={isUrgent ? 'error' : 'default'}
                        size="sm"
                      />
                      <span className="text-slate-400 text-xs font-medium flex items-center gap-1">
                        <Clock size={12} /> {format(parseISO(request.data_abertura), 'dd/MM HH:mm')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
                      <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                        <Package size={16} className="text-slate-400" />
                        <span className="font-bold">{itemCount}</span> item(s)
                      </div>
                      <div className="flex items-center gap-2">
                        <span>📍 {fazenda?.nome || 'N/A'}</span>
                      </div>
                      <div className="hidden sm:block border-l border-slate-200 h-4 mx-2"></div>
                      <div className="flex items-center gap-2" title="Solicitante">
                        <User size={16} className="text-slate-400" />
                        <span>{solicitante?.nome || 'Desconhecido'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full md:w-auto mt-4 md:mt-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenRequest(request.id);
                      }}
                      className={`w-full md:w-auto px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 ${
                        request.status === 'Aguardando'
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {request.status === 'Aguardando' ? (
                        <Play size={16} fill="currentColor" />
                      ) : (
                        <Settings size={16} />
                      )}
                      {request.status === 'Aguardando' ? 'INICIAR' : 'CONTINUAR'}
                    </button>
                  </div>
                </div>

                {/* Footer Info e SLA */}
                <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex-1 w-full">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      <span>Tempo de Fila: {timeAgo}</span>
                      <span className={slaPercent > 90 ? 'text-red-600' : ''}>
                        SLA Consumido: {Math.round(slaPercent)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${progressColor}`}
                        style={{ width: `${slaPercent}%` }}
                      />
                    </div>
                  </div>
                  {request.observacao_geral && (
                    <div className="w-full sm:max-w-[40%] text-xs text-slate-500 truncate border-l-4 border-slate-200 pl-3 italic">
                      "{request.observacao_geral}"
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <RequestFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        requestId={selectedRequestId}
      />
    </div>
  );
}
