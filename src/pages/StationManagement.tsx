import React, { useState, useEffect } from 'react';
import { fuelService } from '../services/fuelService';
import { db } from '../services/supabaseService';
import type { Posto, Fazenda } from '../types';
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
  Settings, // Added
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// UI Kit
import { PageHeader } from '../components/ui/PageHeader';
import { StatsCard } from '../components/ui/StatsCard';
import { FilterBar } from '../components/ui/FilterBar';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { StationFormModal } from '../components/StationFormModal';
import { NuntecConfigModal } from '../components/NuntecConfigModal'; // New import

// --- Sub-component: Station Card ---
function StationCard({
  posto,
  onEdit,
  onDelete,
  canManage,
}: {
  posto: Posto & { fazenda: { nome: string } };
  onEdit: (p: Posto) => void;
  onDelete: (id: string) => void;
  canManage: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 group flex flex-col h-full relative overflow-hidden">
      {/* Status Badge */}
      <div className="absolute top-4 right-4">
        <StatusBadge
          status={posto.ativo ? 'Ativo' : 'Inativo'}
          variant={posto.ativo ? 'success' : 'error'}
          icon={posto.ativo ? CheckCircle2 : XCircle}
          size="sm"
        />
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
          <Fuel size={24} />
        </div>
      </div>

      <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-1" title={posto.nome}>
        {posto.nome}
      </h3>

      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4 font-medium">
        <Warehouse size={14} className="text-slate-400" />
        <span>{posto.fazenda.nome}</span>
      </div>

      {posto.nuntec_reservoir_id && (
        <div className="mb-6 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-lg flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">
            Integ. Nuntec: #{posto.nuntec_reservoir_id}
          </span>
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
  const [postos, setPostos] = useState<(Posto & { fazenda: { nome: string } })[]>([]);
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedFazenda, setSelectedFazenda] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false); // Valid state
  const [editingPosto, setEditingPosto] = useState<Posto | undefined>(undefined);

  // ACL Permissions
  const canManage = checkAccess({ module: 'gestao_postos', action: 'edit' });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [fetchedFazendas, fetchedPostos] = await Promise.all([
        db.getFazendas(),
        fuelService.getPostos(),
      ]);
      setFazendas(fetchedFazendas.filter((f) => f.ativo));
      setPostos(fetchedPostos);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
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
    const matchesFazenda = selectedFazenda === 'all' || p.fazenda_id === selectedFazenda;
    const matchesStatus =
      filterStatus === 'all' ? true : filterStatus === 'active' ? p.ativo : !p.ativo;
    const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFazenda && matchesStatus && matchesSearch;
  });

  const activePostos = postos.filter((p) => p.ativo).length;
  const inactivePostos = postos.length - activePostos;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-blue-600">
        Carregando postos...
      </div>
    );
  }

  const hasActiveFilters = searchTerm || selectedFazenda !== 'all' || filterStatus !== 'all';

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <PageHeader
        title="Gestão de Postos"
        subtitle="Cadastre e gerencie os postos de abastecimento internos"
        icon={MapPin}
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

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="TOTAL DE POSTOS"
          value={postos.length}
          icon={Warehouse}
          description="Cadastrados no sistema"
          variant={filterStatus === 'all' ? 'blue' : 'default'}
          onClick={() => setFilterStatus('all')}
          className={filterStatus === 'all' ? 'ring-2 ring-blue-200 bg-blue-50' : ''}
        />
        <StatsCard
          title="ATIVOS"
          value={activePostos}
          icon={CheckCircle2}
          description="Em operação"
          variant={filterStatus === 'active' ? 'green' : 'default'}
          onClick={() => setFilterStatus('active')}
          className={filterStatus === 'active' ? 'ring-2 ring-green-200 bg-green-50' : ''}
        />
        <StatsCard
          title="INTEGRADOS NUNTEC"
          value={postos.filter((p) => p.nuntec_reservoir_id).length}
          icon={Building2}
          description="Reservatórios monitorados"
          variant="orange"
        />
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
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      ) : filteredPostos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPostos.map((posto) => (
            <StationCard
              key={posto.id}
              posto={posto}
              onEdit={handleEdit}
              onDelete={handleDelete}
              canManage={canManage}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nenhum posto encontrado"
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
