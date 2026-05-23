import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fuelService } from '../services/fuelService';
import type { Posto } from '../types';
import { Plus, Warehouse, CheckCircle2, Building2, Settings, Cloud, Database, Clock, Droplet, Scale } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { differenceInHours, parseISO } from 'date-fns';

// Hooks
import { useStationData } from '../hooks/useStationData';
import { useStationFilters } from '../hooks/useStationFilters';

// UI Kit
import { PageHeader } from '../components/ui/PageHeader';
import StatsCard from '../components/ui/StatsCard';
import { FilterBar } from '../components/ui/FilterBar';
import { EmptyState } from '../components/ui/EmptyState';
import { StationFormModal } from '../components/StationFormModal';
import { NuntecConfigModal } from '../components/NuntecConfigModal';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { StatsSkeleton } from '../components/ui/StatsSkeleton';

// Sub-components
import { StationCard } from '../components/station/StationCard';

export function StationManagement() {
  const { user, checkAccess } = useAuth();
  const queryClient = useQueryClient();

  // Fetch Data
  const {
    fazendas,
    postos,
    measurements,
    stationData,
    admeasurements,
    drainageData,
    transfers,
    isLoading,
    isLoadingAutonomy,
    refetch
  } = useStationData();

  // Filters & Derived State
  const {
    state: { viewType, selectedFazenda, filterStatus, monitoringFilter, searchTerm },
    setters: { setViewType, setSelectedFazenda, setFilterStatus, setMonitoringFilter, setSearchTerm },
    computed: { currentViewPostos, filteredPostos, monitoredCount }
  } = useStationFilters(postos, measurements, admeasurements, drainageData, stationData);

  // Local UI State for Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editingPosto, setEditingPosto] = useState<Posto | undefined>(undefined);

  // ACL Permissions
  const canManage = checkAccess({ module: 'gestao_postos', action: 'edit' });

  // Actions
  const handleSave = async (data: Partial<Posto>) => {
    try {
      if (editingPosto) await fuelService.updatePosto(editingPosto.id, data);
      else await fuelService.createPosto(data as any);

      queryClient.invalidateQueries({ queryKey: ['stations-core-data'] });
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
        queryClient.invalidateQueries({ queryKey: ['stations-core-data'] });
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

  if (isLoading) {
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
              <Settings size={18} /> Integração
            </button>
            <button
              onClick={handleNewPosto}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm hover:shadow-md"
            >
              <Plus size={18} /> Novo Posto
            </button>
          </div>
        )}
      </PageHeader>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-8">
          <button
            onClick={() => setViewType('FISICO')}
            className={`pb-4 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${viewType === 'FISICO' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Database size={16} /> Postos Físicos (Tanques)
          </button>
          <button
            onClick={() => setViewType('VIRTUAL')}
            className={`pb-4 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${viewType === 'VIRTUAL' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Cloud size={16} /> Estoques Virtuais (Gerentes)
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {viewType === 'FISICO' ? (
          <>
            <StatsCard
              title="TOTAL DE TANQUES"
              value={currentViewPostos.length}
              icon={Warehouse}
              description="Cadastrados"
              variant={!monitoringFilter ? 'blue' : 'default'}
              onClick={() => setMonitoringFilter(null)}
              className={!monitoringFilter ? 'ring-2 ring-blue-200' : 'hover:bg-slate-50 cursor-pointer'}
            />

            <StatsCard
              title="MEDIÇÃO ATRASADA"
              value={currentViewPostos.filter(p => {
                if (!p.nuntec_reservoir_id) return false;
                const m = measurements.find(m => String(m['reservoir-id']) === String(p.nuntec_reservoir_id));
                if (!m) return true;
                return differenceInHours(new Date(), parseISO(m['measured-at'])) >= 48;
              }).length}
              icon={Clock}
              description="Sem medição > 48h"
              variant={monitoringFilter === 'late' ? 'red' : 'default'}
              onClick={() => setMonitoringFilter(monitoringFilter === 'late' ? null : 'late')}
              className={monitoringFilter === 'late' ? 'ring-2 ring-red-200' : 'hover:bg-red-50 cursor-pointer'}
            />

            <StatsCard
              title="DRENAGEM ATRASADA"
              value={currentViewPostos.filter(p => {
                if (p.exibir_na_drenagem === false) return false;
                const lastDrainage = drainageData[p.id];
                if (!lastDrainage) return true;
                const days = differenceInHours(new Date(), new Date(lastDrainage)) / 24;
                return days > 7;
              }).length}
              icon={Droplet}
              description="Sem drenagem > 7 dias"
              variant={monitoringFilter === 'drainage_late' ? 'orange' : 'default'}
              onClick={() => setMonitoringFilter(monitoringFilter === 'drainage_late' ? null : 'drainage_late')}
              className={monitoringFilter === 'drainage_late' ? 'ring-2 ring-orange-200' : 'hover:bg-orange-50 cursor-pointer'}
            />

            <StatsCard
              title="AFERIÇÃO ATRASADA"
              value={currentViewPostos.filter(p => {
                if (!p.nuntec_reservoir_id) return false;
                const reservoirData = stationData.find(r => String(r.id) === String(p.nuntec_reservoir_id)) ||
                    stationData.find(r => r.nozzleIds?.includes(String(p.nuntec_reservoir_id)));
                if (!reservoirData) return false;
                const latestAdmeasurement = admeasurements.find(a => reservoirData.nozzleIds?.includes(a['nozzle-id']));
                if (!latestAdmeasurement) return true;
                const days = differenceInHours(new Date(), parseISO(latestAdmeasurement['updated-at'])) / 24;
                return days > 60;
              }).length}
              icon={Scale}
              description="Sem aferição > 60 dias"
              variant={monitoringFilter === 'admeasurement_late' ? 'red' : 'default'}
              onClick={() => setMonitoringFilter(monitoringFilter === 'admeasurement_late' ? null : 'admeasurement_late')}
              className={monitoringFilter === 'admeasurement_late' ? 'ring-2 ring-red-200' : 'hover:bg-red-50 cursor-pointer'}
            />
          </>
        ) : (
          <>
            <StatsCard title="TOTAL VIRTUAIS" value={currentViewPostos.length} icon={Cloud} description="Postos Gerenciais" variant="blue" />
            <StatsCard title="ATIVOS" value={currentViewPostos.filter(p => p.ativo).length} icon={CheckCircle2} description="Em operação" variant="green" />
            <StatsCard title="INTEGRAÇÃO" value={monitoredCount} icon={Building2} description="Apenas Saldo" variant="orange" />
          </>
        )}
      </div>

      <FilterBar onSearch={setSearchTerm} searchValue={searchTerm} searchPlaceholder="Buscar posto...">
        <div className="flex gap-2">
          <select
            value={selectedFazenda}
            onChange={(e) => setSelectedFazenda(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">Todas as Fazendas</option>
            {fazendas.map((f) => (
              <option key={f.id} value={f.id}>{f.nome}</option>
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
            const reservoirData = stationData.find(r => String(r.id) === String(posto.nuntec_reservoir_id)) ||
              stationData.find(r => r.nozzleIds?.includes(String(posto.nuntec_reservoir_id)));

            const measurement = measurements.find(m => String(m['reservoir-id']) === String(reservoirData?.id || posto.nuntec_reservoir_id));
            const latestAdmeasurement = admeasurements.find(a => reservoirData?.nozzleIds?.includes(a['nozzle-id']));

            const allMatchingIds = new Set<string>();
            if (posto.nuntec_reservoir_id) allMatchingIds.add(String(posto.nuntec_reservoir_id));
            if (reservoirData) {
              allMatchingIds.add(String(reservoirData.id));
              reservoirData.nozzleIds?.forEach(id => allMatchingIds.add(String(id)));
            }

            let dailyAvg = 0;
            if (transfers.length > 0 && allMatchingIds.size > 0) {
              const stationEntries = transfers.filter(t => allMatchingIds.has(String(t['reservoir-id'])) || allMatchingIds.has(String(t['nozzle-id'])));
              dailyAvg = stationEntries.reduce((sum, t) => sum + t.amount, 0) / 7;
            }

            return (
              <StationCard
                key={posto.id}
                posto={posto}
                measurement={measurement}
                reservoirData={reservoirData}
                latestAdmeasurement={latestAdmeasurement}
                lastDrainageDate={drainageData[posto.id]}
                dailyAverage={dailyAvg}
                loadingAutonomy={isLoadingAutonomy}
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
