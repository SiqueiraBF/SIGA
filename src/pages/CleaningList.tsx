import { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { CleaningFormModal } from '../components/cleaning/CleaningFormModal';
import { CleaningDetailsModal } from '../components/cleaning/CleaningDetailsModal';
import { CleaningEmailSettingsModal } from '../components/cleaning/CleaningEmailSettingsModal';
import { CleaningFarmSettingsModal } from '../components/cleaning/CleaningFarmSettingsModal';
import { StatsSkeleton } from '../components/ui/StatsSkeleton';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { useAuth } from '../context/AuthContext';
import {
  useGetCleanings,
  useGetWeeklyStatus,
  useGetAllFarmsWeeklyStatus,
} from '../hooks/useCleaningData';
import { StatusCard } from '../components/cleaning/StatusCard';
import { AdminStatusTable } from '../components/cleaning/AdminStatusTable';
import { CleaningCard } from '../components/cleaning/CleaningCard';
import { CleaningRegistry } from '../services/cleaningService';
import { Sparkles, Plus, MapPin, Search, Settings, Mail, AlertTriangle } from 'lucide-react';

export function CleaningList() {
  const { user, role, hasPermission, checkAccess } = useAuth();
  const isAdmin = role?.nome === 'Administrador' || (user as any)?.funcao === 'Administrador';
  const canEdit = checkAccess({ module: 'gestao_limpeza', action: 'edit' });
  const viewScope = role?.permissoes?.gestao_limpeza?.view_scope || 'NONE';
  const canViewAll = isAdmin || viewScope === 'ALL';

  // State for Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRegistry, setSelectedRegistry] = useState<CleaningRegistry | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isFarmModalOpen, setIsFarmModalOpen] = useState(false);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // React Query Hooks
  const cleaningsQueryFilters = canViewAll ? {} : { fazenda_id: user?.fazenda_id };
  const { data: registries = [], isLoading: loadingCleanings } =
    useGetCleanings(cleaningsQueryFilters);

  // KPI Queries
  const { data: allFarmsStatus = [], isLoading: loadingAdminKPI } =
    useGetAllFarmsWeeklyStatus(canViewAll);
  const { data: weeklyStatus, isLoading: loadingFarmKPI } = useGetWeeklyStatus(
    canViewAll ? undefined : user?.fazenda_id,
  );

  const loading = loadingCleanings || (canViewAll ? loadingAdminKPI : loadingFarmKPI);

  const filteredRegistries = registries.filter((r) => {
    const matchesSearch =
      r.fazenda?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.usuario?.nome.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter ? r.tipo === typeFilter : true;

    return matchesSearch && matchesType;
  });

  if (!hasPermission('gestao_limpeza')) {
    return (
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-xl p-6">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-800 mb-2">Acesso Negado</h2>
          <p className="text-red-600">
            Você não tem permissão para acessar a Limpeza e Organização.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Limpeza e Organização"
        subtitle="Registro semanal de organização do Almoxarifado e Posto"
        icon={Sparkles}
      >
        <div className="flex gap-2">
          {(isAdmin || role?.permissoes?.gestao_limpeza?.manage_notifications) && (
            <div className="relative group">
              <button className="bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-colors">
                <Settings size={20} />
              </button>
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 p-2 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all z-20">
                <button
                  onClick={() => setIsEmailModalOpen(true)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-sm text-slate-600 flex items-center gap-2"
                >
                  <Mail size={16} /> Configurar E-mails
                </button>
                <button
                  onClick={() => setIsFarmModalOpen(true)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-sm text-slate-600 flex items-center gap-2"
                >
                  <MapPin size={16} /> Fazendas Monitoradas
                </button>
              </div>
            </div>
          )}
          {canEdit && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200"
            >
              <Plus size={20} /> Novo Registro
            </button>
          )}
        </div>
      </PageHeader>

      {loading ? (
        <div className="space-y-6">
          <StatsSkeleton count={canViewAll ? 1 : 2} />
          <TableSkeleton rows={5} columns={4} showActions={false} />
        </div>
      ) : (
        <>
          {/* KPI Section */}
          {canViewAll ? (
            <AdminStatusTable statusData={allFarmsStatus} />
          ) : (
            user?.fazenda_id &&
            weeklyStatus && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatusCard
                  title="Almoxarifado"
                  day="Segunda-feira"
                  isDone={weeklyStatus.almoxarifado}
                />
                <StatusCard
                  title="Posto de Abastecimento"
                  day="Sexta-feira"
                  isDone={weeklyStatus.posto}
                />
              </div>
            )
          )}

          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por fazenda ou usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Todos os Tipos</option>
              <option value="ALMOXARIFADO">Almoxarifado</option>
              <option value="POSTO">Posto</option>
            </select>
          </div>

          {/* List */}
          {filteredRegistries.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl text-center border border-slate-100">
              <Sparkles size={48} className="mx-auto text-slate-200 mb-4" />
              <h3 className="font-bold text-slate-600">Nenhum registro encontrado</h3>
              <p className="text-slate-400 text-sm">Clique em "Novo Registro" para começar.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRegistries.map((registry) => (
                <CleaningCard key={registry.id} registry={registry} onClick={setSelectedRegistry} />
              ))}
            </div>
          )}
        </>
      )}

      <CleaningFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      <CleaningDetailsModal
        isOpen={!!selectedRegistry}
        onClose={() => setSelectedRegistry(null)}
        registry={selectedRegistry}
      />

      {isEmailModalOpen && (
        <CleaningEmailSettingsModal onClose={() => setIsEmailModalOpen(false)} />
      )}

      {isFarmModalOpen && <CleaningFarmSettingsModal onClose={() => setIsFarmModalOpen(false)} />}
    </div>
  );
}
