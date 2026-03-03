import React, { useState, useEffect } from 'react';
import { fuelService } from '../services/fuelService';
import { db } from '../services/supabaseService';
import { nuntecService } from '../services/nuntecService';
import { drainageService, StationDrainage } from '../services/drainageService'; // Import added
import type { Posto, Fazenda, NuntecMeasurement, NuntecReservoir, NuntecAdmeasurement, NuntecConsumption } from '../types';
import {
  Plus,
  MapPin,
  Edit2,
  Trash2,
  Warehouse,
  Fuel,
  CheckCircle2,
  XCircle,
  X,
  Building2,
  Settings,
  Database,
  Cloud,
  AlertTriangle,
  Clock,
  Droplet,
  Scale
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { format, differenceInHours, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// UI Kit
import { PageHeader } from '../components/ui/PageHeader';
import StatsCard from '../components/ui/StatsCard';
import { FilterBar } from '../components/ui/FilterBar';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { StationFormModal } from '../components/StationFormModal';
import { NuntecConfigModal } from '../components/NuntecConfigModal';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { StatsSkeleton } from '../components/ui/StatsSkeleton';

// --- Sub-component: Station Card ---
function StationCard({
  posto,
  measurement,
  reservoirData,
  latestAdmeasurement,
  lastDrainageDate, // Prop added
  dailyAverage,
  loadingAutonomy,
  onEdit,
  onDelete,
  canManage,
}: {
  posto: Posto & { fazenda: { nome: string } };
  measurement?: NuntecMeasurement;
  reservoirData?: NuntecReservoir;
  latestAdmeasurement?: NuntecAdmeasurement;
  lastDrainageDate?: string; // Type added
  dailyAverage?: number; // Consumo diário médio (litros)
  loadingAutonomy?: boolean;
  onEdit: (p: Posto) => void;
  onDelete: (id: string) => void;
  canManage: boolean;
}) {
  // Logic for Status Color based on Measurement Age
  let statusColor = 'bg-slate-100 text-slate-500';
  let statusText = 'Sem Medição';

  if (posto.tipo === 'FISICO' && measurement) {
    const hours = differenceInHours(new Date(), parseISO(measurement['measured-at']));
    if (hours < 24) {
      statusColor = 'bg-green-100 text-green-700 border-green-200';
      statusText = 'Em Dia';
    } else if (hours < 48) {
      statusColor = 'bg-amber-100 text-amber-700 border-amber-200';
      statusText = 'Atenção';
    } else {
      statusColor = 'bg-red-100 text-red-700 border-red-200';
      statusText = 'Atrasado';
    }
  }

  const isVirtual = posto.tipo === 'VIRTUAL';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 group flex flex-col h-full relative overflow-hidden">
      {/* Header Badge */}
      <div className="absolute top-4 right-4 flex gap-2">
        {isVirtual && (
          <span className="px-2 py-1 bg-sky-50 text-sky-600 text-[10px] font-bold uppercase rounded-lg border border-sky-100 flex items-center gap-1">
            <Cloud size={10} /> Virtual
          </span>
        )}
        <StatusBadge
          status={posto.ativo ? 'Ativo' : 'Inativo'}
          variant={posto.ativo ? 'success' : 'error'}
          icon={posto.ativo ? CheckCircle2 : XCircle}
          size="sm"
        />
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className={`p-3 rounded-2xl ${isVirtual ? 'bg-sky-50 text-sky-600' : 'bg-slate-50 text-slate-600'}`}>
          {isVirtual ? <Cloud size={24} /> : <Fuel size={24} />}
        </div>
      </div>

      <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-1" title={posto.nome}>
        {posto.nome}
      </h3>

      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4 font-medium">
        <Warehouse size={14} className="text-slate-400" />
        <span>{posto.fazenda.nome}</span>
      </div>

      {/* Measurement Info (Only for Physical or if data exists) */}
      {!isVirtual && posto.nuntec_reservoir_id && (
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400 uppercase font-bold tracking-wider">Tanque #{posto.nuntec_reservoir_id}</span>
          </div>

          {measurement ? (
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div className="flex justify-between items-end mb-1">
                <div className="flex items-center gap-1.5 text-slate-600 font-medium text-xs">
                  <Clock size={12} />
                  <span className="font-bold mr-1">Medição:</span>
                  {format(parseISO(measurement['measured-at']), "dd/MM HH:mm")}
                  {/* Minimalist Status Dot/Text */}
                  {(() => {
                    const hours = differenceInHours(new Date(), parseISO(measurement['measured-at']));
                    if (hours >= 24) {
                      const isCritical = hours >= 48;
                      return (
                        <span className={`text-[10px] font-bold ml-1 ${isCritical ? 'text-red-500' : 'text-amber-500'}`}>
                          {isCritical ? '• Atrasado' : '• Atenção'}
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div className="text-lg font-bold text-slate-800">
                  {/* Prioritize Real Stock from Station XML (reservoirData.stock) over Last Measurement (measurement.amount) */}
                  {reservoirData && reservoirData.capacity > 0 ? (
                    <span className="text-xs text-slate-500 font-normal">
                      <strong className="text-lg text-slate-800">
                        {(reservoirData.stock ?? measurement.amount).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </strong>
                      {' '}/ {reservoirData.capacity.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} L
                    </span>
                  ) : (
                    <span>{measurement.amount.toLocaleString('pt-BR')} L</span>
                  )}
                </div>
              </div>

              {reservoirData && reservoirData.capacity > 0 ? (
                (() => {
                  // Use Real Stock if available
                  const currentStock = reservoirData.stock ?? measurement.amount;
                  const percentage = Math.min(100, Math.max(0, (currentStock / reservoirData.capacity) * 100));

                  let barColor = 'bg-blue-600';
                  if (percentage < 10) barColor = 'bg-red-500';
                  else if (percentage < 20) barColor = 'bg-amber-500';
                  else barColor = 'bg-green-500';

                  return (
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden relative">
                      <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  );
                })()
              ) : (
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400 w-full opacity-50"></div>
                </div>
              )}

              {/* Footer Info: Percentage & Calibration & Drainage (Minimalist Line) */}
              <div className="flex flex-col gap-1 mt-2">
                <div className="flex justify-between items-center">
                  {/* Calibration Minimalist */}
                  {latestAdmeasurement ? (
                    (() => {
                      const days = differenceInHours(new Date(), parseISO(latestAdmeasurement['updated-at'])) / 24;
                      const isExpired = days > 60;

                      return (
                        <div className="flex items-center gap-1.5" title={`Fator: ${latestAdmeasurement['pulse-factor']} | Dias: ${Math.round(days)}`}>
                          <Scale size={10} className={isExpired ? 'text-red-500' : 'text-slate-400'} />
                          <span className={`text-[10px] font-medium ${isExpired ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                            {isExpired ? 'Aferição Vencida' : `Aferido em ${format(parseISO(latestAdmeasurement['updated-at']), "dd/MM/yy")}`}
                          </span>
                        </div>
                      );
                    })()
                  ) : (
                    <span></span> // Spacer
                  )}

                  {reservoirData && reservoirData.capacity > 0 && (
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono gap-4">
                      {/* Autonomy Display */}
                      {loadingAutonomy ? (
                        <span className="text-slate-400 animate-pulse italic">
                          Calculando...
                        </span>
                      ) : (
                        dailyAverage && dailyAverage > 0 && (
                          (() => {
                            const currentStock = reservoirData.stock ?? measurement.amount;
                            const days = currentStock / dailyAverage;
                            const isLow = days < 3;
                            return (
                              <span className={isLow ? 'text-amber-600 font-bold' : ''}>
                                Autonomia: ~{Math.round(days)} dias
                              </span>
                            );
                          })()
                        )
                      )}
                      <span>
                        {(() => {
                          const currentStock = reservoirData.stock ?? measurement.amount;
                          return Math.round((currentStock / reservoirData.capacity) * 100);
                        })()}%
                      </span>
                    </div>
                  )}
                </div>

                {/* DRAINAGE STATUS ROW - Only if configured to show */}
                {(posto.exibir_na_drenagem !== false) && (
                  <div className="flex items-center gap-1.5">
                    {lastDrainageDate ? (
                      (() => {
                        const days = differenceInHours(new Date(), new Date(lastDrainageDate)) / 24;
                        const isOverdue = days > 7;

                        return (
                          <div className="flex items-center gap-1.5">
                            <Droplet size={10} className={isOverdue ? 'text-red-500' : 'text-sky-500'} />
                            <span className={`text-[10px] font-medium ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                              {isOverdue ? `Drenagem Vencida (${Math.floor(days)}d)` : `Drenado em ${format(new Date(lastDrainageDate), "dd/MM")}`}
                            </span>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Droplet size={10} className="text-red-500" />
                        <span className="text-[10px] font-bold text-red-600">Sem Registro de Drenagem</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-center py-4">
              <p className="text-xs text-slate-400">Nenhuma medição recente encontrada.</p>
            </div>
          )}
        </div>
      )}

      {isVirtual && (
        <div className="mb-6">
          <div className="p-3 bg-sky-50 border border-sky-100 rounded-lg text-sky-800 text-xs">
            Este é um posto <strong>Gerencial/Virtual</strong>. Não requer medição física de estoque, apenas controle de saldo contábil.
          </div>
        </div>
      )}

      {/* Actions Footer */}
      <div className="mt-auto pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
        {canManage ? (
          <>
            <button
              onClick={() => onEdit(posto)}
              className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold uppercase text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors"
            >
              <Edit2 size={14} /> Editar
            </button>
            <button
              onClick={() => onDelete(posto.id)}
              className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold uppercase text-red-600 hover:bg-red-50 border border-red-100 rounded-xl transition-colors"
            >
              <Trash2 size={14} /> Excluir
            </button>
          </>
        ) : (
          <span className="col-span-2 text-center text-xs text-slate-400 py-2">
            Somente visualização
          </span>
        )}
      </div>
    </div>
  );
}

// --- Main Page Component ---
export function StationManagement() {
  const { user, role, checkAccess } = useAuth();

  // Data State
  const [postos, setPostos] = useState<(Posto & { fazenda: { nome: string } })[]>([]);
  const [measurements, setMeasurements] = useState<NuntecMeasurement[]>([]);
  const [stationData, setStationData] = useState<NuntecReservoir[]>([]);
  const [admeasurements, setAdmeasurements] = useState<NuntecAdmeasurement[]>([]);
  const [transfers, setTransfers] = useState<NuntecConsumption[]>([]);
  const [autonomyLoading, setAutonomyLoading] = useState(false);
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [loading, setLoading] = useState(true);

  // New State for Drainage Data
  const [drainageData, setDrainageData] = useState<Record<string, string>>({}); // posto_id -> last_date

  // UI State
  const [viewType, setViewType] = useState<'FISICO' | 'VIRTUAL'>('FISICO');
  const [selectedFazenda, setSelectedFazenda] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active'); // 'all', 'active', 'inactive' (from FilterBar)
  const [monitoringFilter, setMonitoringFilter] = useState<'ok' | 'late' | null>(null); // New filter
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editingPosto, setEditingPosto] = useState<Posto | undefined>(undefined);

  // ACL Permissions
  const canManage = checkAccess({ module: 'gestao_postos', action: 'edit' });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const targetFarmId = role?.permissoes?.gestao_postos?.view_scope === 'SAME_FARM' ? user?.fazenda_id : undefined;

      // 1. Load Essential Data First (Fast)
      const [fetchedFazendas, fetchedPostos] = await Promise.all([
        db.getFazendas(),
        fuelService.getPostos(targetFarmId),
      ]);
      setFazendas(fetchedFazendas.filter((f) => f.ativo));
      setPostos(fetchedPostos);

      const allowedReservoirs = fetchedPostos
        .map(p => p.nuntec_reservoir_id ? String(p.nuntec_reservoir_id) : null)
        .filter(Boolean) as string[];

      // 2. Load Nuntec and Drainages Filtered Data
      const [fetchedMeasurements, fetchedStationData, fetchedAdmeasurements, fetchedDrainages] = await Promise.all([
        nuntecService.getStockMeasurements(allowedReservoirs),
        nuntecService.getStationsData(allowedReservoirs),
        nuntecService.getAdmeasurements(allowedReservoirs),
        drainageService.getLatestDrainagesByStation(targetFarmId)
      ]);

      setMeasurements(fetchedMeasurements);
      setStationData(fetchedStationData);
      setAdmeasurements(fetchedAdmeasurements);

      // Process Drainages
      const drainExample: Record<string, string> = {};
      fetchedDrainages.forEach(d => {
        if (!drainExample[d.posto_id] || new Date(d.data_drenagem) > new Date(drainExample[d.posto_id])) {
          drainExample[d.posto_id] = d.data_drenagem;
        }
      });
      setDrainageData(drainExample);

      // 3. Page is usable now
      setLoading(false);

      // 4. Load Autonomy Data in Background (Slow)
      loadAutonomyData(allowedReservoirs);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setLoading(false);
    }
  }

  async function loadAutonomyData(allowedReservoirs: string[]) {
    setAutonomyLoading(true);
    try {
      const fetchedTransfers = await nuntecService.getConsumptions(7, undefined, allowedReservoirs);
      setTransfers(fetchedTransfers);
    } catch (error) {
      console.error('Erro ao carregar autonomia:', error);
    } finally {
      setAutonomyLoading(false);
    }
  }

  const handleSave = async (data: Partial<Posto>) => {
    try {
      if (editingPosto) {
        await fuelService.updatePosto(editingPosto.id, data);
      } else {
        await fuelService.createPosto(data as any);
      }
      loadData();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar posto:', error);
      alert('Erro ao salvar posto.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este posto?')) {
      try {
        await fuelService.deletePosto(id);
        loadData();
      } catch (error) {
        console.error('Erro ao excluir:', error);
        alert('Erro ao excluir posto.');
      }
    }
  };

  const handleEdit = (posto: Posto) => {
    setEditingPosto(posto);
    setIsModalOpen(true);
  };

  const handleNewPosto = () => {
    setEditingPosto(undefined);
    setIsModalOpen(true);
  };

  // Filter Logic
  const filteredPostos = postos.filter((p) => {
    // 0. Permission Check: Same Farm
    if (role?.permissoes?.gestao_postos?.view_scope === 'SAME_FARM') {
      if (user?.fazenda_id && p.fazenda_id !== user.fazenda_id) return false;
    }

    // 1. Filter by View Type (Physical vs Virtual)
    // Default to FISICO if tipo is undefined/null (Legacy compatibility)
    const pType = p.tipo || 'FISICO';
    if (pType !== viewType) return false;

    const matchesFazenda = selectedFazenda === 'all' || p.fazenda_id === selectedFazenda;
    const matchesStatus = filterStatus === 'all' ? true : filterStatus === 'active' ? p.ativo : !p.ativo;
    const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase());

    // Monitoring Status Filter
    let matchesMonitoring = true;
    if (monitoringFilter && viewType === 'FISICO') {
      if (!p.nuntec_reservoir_id) {
        matchesMonitoring = false; // By default exclude non-monitored if filtering by specific status? 
        // Actually, 'late' filter implies "monitored but late" OR "monitored but no reading". 
        // 'ok' means "monitored and ok".
        // If a tank has NO ID, it is neither ok nor late in this context, or arguably 'late' if we consider it unmanaged.
        // Let's stick to the card logic:
        // Late = has ID but no reading (>48h) OR has ID and reading > 48h.
        // OK = has ID and reading < 48h.
        // If monitoringFilter is set, we generally only show monitored stations matching criteria.
      } else {
        const m = measurements.find(m => String(m['reservoir-id']) === String(p.nuntec_reservoir_id));

        if (monitoringFilter === 'ok') {
          if (!m) matchesMonitoring = false;
          else {
            const hours = differenceInHours(new Date(), parseISO(m['measured-at']));
            matchesMonitoring = hours < 48;
          }
        } else if (monitoringFilter === 'late') {
          if (!m) matchesMonitoring = true; // No reading = late
          else {
            const hours = differenceInHours(new Date(), parseISO(m['measured-at']));
            matchesMonitoring = hours >= 48;
          }
        }
      }
      if (!p.nuntec_reservoir_id) matchesMonitoring = false; // Hard exclude unmonitored from these status filters
    }

    return matchesFazenda && matchesStatus && matchesSearch && matchesMonitoring;
  });

  const activePostos = postos.filter((p) => p.ativo).length;

  // Stats for the current view
  const currentViewPostos = postos.filter(p => {
    // Permission Check: Same Farm
    if (role?.permissoes?.gestao_postos?.view_scope === 'SAME_FARM') {
      if (user?.fazenda_id && p.fazenda_id !== user.fazenda_id) return false;
    }
    return (p.tipo || 'FISICO') === viewType;
  });
  const monitoredCount = currentViewPostos.filter(p => p.nuntec_reservoir_id).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <PageHeader
            title="Gestão de Postos"
            subtitle="Cadastre e gerencie os postos de abastecimento internos"
            icon={Warehouse}
          />
          <StatsSkeleton count={3} />
          <TableSkeleton rows={5} columns={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <PageHeader
        title="Gestão de Postos"
        subtitle="Cadastre e gerencie os postos de abastecimento internos"
        icon={Warehouse}
      >
        {canManage && (
          <div className="flex gap-2">
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
              <Settings size={18} />
              Integração
            </button>
            <button
              onClick={handleNewPosto}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm hover:shadow-md"
            >
              <Plus size={18} />
              Novo Posto
            </button>
          </div>
        )}
      </PageHeader>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-8">
          <button
            onClick={() => setViewType('FISICO')}
            className={`pb-4 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${viewType === 'FISICO'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
          >
            <Database size={16} />
            Postos Físicos (Tanques)
          </button>
          <button
            onClick={() => setViewType('VIRTUAL')}
            className={`pb-4 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${viewType === 'VIRTUAL'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
          >
            <Cloud size={16} />
            Estoques Virtuais (Gerentes)
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {viewType === 'FISICO' ? (
          <>
            {/* Card 1: Total Tanques (Contexto) */}
            <StatsCard
              title="TOTAL DE TANQUES"
              value={currentViewPostos.length}
              icon={Warehouse}
              description="Cadastrados"
              variant={!monitoringFilter ? 'blue' : 'default'}
              onClick={() => setMonitoringFilter(null)}
              className={!monitoringFilter ? 'ring-2 ring-blue-200' : 'hover:bg-slate-50'}
            />

            {/* Card 2: Saúde (Monitoramento Em Dia) */}
            <StatsCard
              title="MONITORAMENTO EM DIA"
              value={`${currentViewPostos.filter(p => {
                if (!p.nuntec_reservoir_id) return false;
                const m = measurements.find(m => String(m['reservoir-id']) === String(p.nuntec_reservoir_id));
                if (!m) return false;
                const hours = differenceInHours(new Date(), parseISO(m['measured-at']));
                return hours < 48;
              }).length} / ${monitoredCount}`}
              icon={CheckCircle2}
              description="Tanques Atualizados (<48h)"
              variant={monitoringFilter === 'ok' ? 'green' : 'default'}
              onClick={() => setMonitoringFilter(monitoringFilter === 'ok' ? null : 'ok')}
              className={monitoringFilter === 'ok' ? 'ring-2 ring-green-200' : 'hover:bg-green-50'}
            />

            {/* Card 3: Crítico (Atrasados) */}
            <StatsCard
              title="ATENÇÃO NECESSÁRIA"
              value={currentViewPostos.filter(p => {
                if (!p.nuntec_reservoir_id) return false;
                const m = measurements.find(m => String(m['reservoir-id']) === String(p.nuntec_reservoir_id));
                // Se não tem medição ou a medição é velha
                if (!m) return true;
                const hours = differenceInHours(new Date(), parseISO(m['measured-at']));
                return hours >= 48;
              }).length}
              icon={AlertTriangle}
              description="Sem medição > 48h"
              variant={monitoringFilter === 'late' ? 'red' : 'default'}
              onClick={() => setMonitoringFilter(monitoringFilter === 'late' ? null : 'late')}
              className={monitoringFilter === 'late' ? 'ring-2 ring-red-200' : 'hover:bg-red-50'}
            />
          </>
        ) : (
          <>
            <StatsCard
              title="TOTAL VIRTUAIS"
              value={currentViewPostos.length}
              icon={Cloud}
              description="Postos Gerenciais"
              variant="blue"
            />
            <StatsCard
              title="ATIVOS"
              value={currentViewPostos.filter(p => p.ativo).length}
              icon={CheckCircle2}
              description="Em operação"
              variant="green"
            />
            <StatsCard
              title="INTEGRAÇÃO"
              value={monitoredCount}
              icon={Building2}
              description="Apenas Saldo"
              variant="orange"
            />
          </>
        )}
      </div>

      <FilterBar
        onSearch={setSearchTerm}
        searchValue={searchTerm}
        searchPlaceholder="Buscar posto..."
      >
        <div className="flex gap-2">
          <select
            value={selectedFazenda}
            onChange={(e) => setSelectedFazenda(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">Todas as Fazendas</option>
            {fazendas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>
      </FilterBar>

      {/* List */}
      {filteredPostos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPostos.map((posto) => {
            // Find "Real Nuntec Reservoir" - Prioritize direct Reservoir ID match
            const reservoirData =
              stationData.find(r => String(r.id) === String(posto.nuntec_reservoir_id)) ||
              stationData.find(r => r.nozzleIds?.includes(String(posto.nuntec_reservoir_id)));

            const measurement = measurements.find(m =>
              String(m['reservoir-id']) === String(reservoirData?.id || posto.nuntec_reservoir_id)
            );

            const latestAdmeasurement = admeasurements.find(a =>
              reservoirData?.nozzleIds?.includes(a['nozzle-id'])
            );

            const allMatchingIds = new Set<string>();
            if (posto.nuntec_reservoir_id) allMatchingIds.add(String(posto.nuntec_reservoir_id));
            if (reservoirData) {
              allMatchingIds.add(String(reservoirData.id));
              reservoirData.nozzleIds?.forEach(id => allMatchingIds.add(String(id)));
            }

            // Calculate Average Consumption (7 Days) using the set of IDs
            let dailyAvg = 0;
            if (transfers.length > 0 && allMatchingIds.size > 0) {
              const stationEntries = transfers.filter(t =>
                allMatchingIds.has(String(t['reservoir-id'])) ||
                allMatchingIds.has(String(t['nozzle-id']))
              );
              const totalVolume7Days = stationEntries.reduce((sum, t) => sum + t.amount, 0);
              dailyAvg = totalVolume7Days / 7;
            }

            return (
              <StationCard
                key={posto.id}
                posto={posto}
                measurement={measurement}
                reservoirData={reservoirData}
                latestAdmeasurement={latestAdmeasurement}
                lastDrainageDate={drainageData[posto.id]} // Prop Passed
                dailyAverage={dailyAvg}
                loadingAutonomy={autonomyLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                canManage={canManage}
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={`Nenhum posto ${viewType === 'FISICO' ? 'físico' : 'virtual'} encontrado`}
          description="Tente ajustar os filtros ou cadastre um novo posto."
          icon={Warehouse}
        />
      )}

      <StationFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        fazendas={fazendas}
        initialData={editingPosto}
      />

      <NuntecConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        currentUser={user}
      />
    </div>
  );
}
