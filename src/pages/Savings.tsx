import React, { useState, useEffect, useMemo } from 'react';
import { Plus, DollarSign, List, BarChart3, Calendar, User, Building2, FileText } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { TableCells } from '../components/ui/TableCells';
import { savingService, Saving } from '../services/savingService';
import { SavingFormModal } from '../components/savings/SavingFormModal';
import { SavingDashboard } from '../components/savings/SavingDashboard';
import { SavingDetailModal } from '../components/savings/SavingDetailModal';
import { useAuth } from '../context/AuthContext';
import { DataTable, DataTableColumn } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { Button } from '../components/ui/Button';
import { TabBar } from '../components/ui/TabBar';
import { FormField } from '../components/ui/FormField';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import toast from 'react-hot-toast';

export function Savings() {
  const { role } = useAuth();
  const [savings, setSavings] = useState<Saving[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const canEdit =
    role?.nome === 'Administrador' ||
    role?.permissoes?.controle_saving?.edit_scope === 'ALL';
  
  const [activeTab, setActiveTab] = useState<'list' | 'dashboard'>('list');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSaving, setSelectedSaving] = useState<Saving | null>(null);
  const [savingToEdit, setSavingToEdit] = useState<Saving | null>(null);

  // Estados dos filtros
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [filterComprador, setFilterComprador] = useState('Todos');
  const [filterFornecedor, setFilterFornecedor] = useState('Todos');

  useEffect(() => {
    loadSavings();
  }, []);

  const loadSavings = async () => {
    try {
      setLoading(true);
      const data = await savingService.getAll();
      setSavings(data);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar registros de saving');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSaving = async (id: string) => {
    try {
      await savingService.delete(id);
      toast.success('Registro excluído com sucesso');
      loadSavings();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao excluir registro');
    }
  };

  const filteredSavings = useMemo(() => {
    return savings.filter(s => {
      const matchesSearch = 
        s.comprador?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.usuario?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.n_cotacao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.fornecedor?.razao_social?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const savingComprador = s.usuario?.nome || s.comprador;
      const matchesComprador = filterComprador === 'Todos' || savingComprador === filterComprador;
      const matchesFornecedor = filterFornecedor === 'Todos' || s.fornecedor?.razao_social === filterFornecedor;
      
      const savingDate = s.data.split('T')[0];
      const matchesDateStart = !dateStart || savingDate >= dateStart;
      const matchesDateEnd = !dateEnd || savingDate <= dateEnd;

      return matchesSearch && matchesComprador && matchesFornecedor && matchesDateStart && matchesDateEnd;
    });
  }, [savings, searchTerm, filterComprador, filterFornecedor, dateStart, dateEnd]);

  const uniqueBuyers = Array.from(new Set(savings.map(s => s.usuario?.nome || s.comprador).filter(Boolean))).sort();
  const uniqueSuppliers = Array.from(new Set(savings.map(s => s.fornecedor?.razao_social).filter((s): s is string => !!s))).sort();

  const hasActiveFilters = dateStart !== '' || dateEnd !== '' || filterComprador !== 'Todos' || filterFornecedor !== 'Todos';

  const clearFilters = () => {
    setDateStart('');
    setDateEnd('');
    setFilterComprador('Todos');
    setFilterFornecedor('Todos');
    setSearchTerm('');
  };

  const columns: DataTableColumn<Saving>[] = [
    {
      key: 'n_cotacao',
      label: 'Cotação',
      sortable: true,
      sortValue: (row) => row.n_cotacao,
      render: (row) => <TableCells.Id value={row.n_cotacao?.toUpperCase()} />
    },
    {
      key: 'comprador',
      label: 'Comprador',
      sortable: true,
      sortValue: (row) => row.usuario?.nome || row.comprador || '',
      render: (row) => {
        const nome = row.usuario?.nome || row.comprador || 'Usuário Desconhecido';
        return <TableCells.User name={nome} />
      },
    },
    {
      key: 'data',
      label: 'Data',
      sortable: true,
      sortValue: (row) => row.data,
      render: (row) => {
        const hasTime = row.data.includes('T') && row.data.split('T')[1] && !row.data.includes('00:00:00');
        const timeStr = hasTime ? new Date(row.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;
        return <TableCells.Date date={row.data.split('T')[0].split('-').reverse().join('/')} time={timeStr} />
      },
    },
    {
      key: 'fornecedor',
      label: 'Fornecedor',
      sortable: true,
      sortValue: (row) => row.fornecedor?.razao_social || '',
      render: (row) => (
        <span className="text-slate-600 break-words">
          {(row.fornecedor?.razao_social || 'Fornecedor não encontrado').toUpperCase()}
        </span>
      ),
    },
    {
      key: 'valor_inicial',
      label: 'Valor Inicial',
      align: 'right',
      sortable: true,
      sortValue: (row) => row.valor_inicial,
      render: (row) => (
        <span className="text-slate-500 whitespace-nowrap">
          {row.valor_inicial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      ),
    },
    {
      key: 'valor_final',
      label: 'Valor Final',
      align: 'right',
      sortable: true,
      sortValue: (row) => row.valor_final,
      render: (row) => (
        <span className="font-medium text-slate-800 whitespace-nowrap">
          {row.valor_final.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      ),
    },
    {
      key: 'saving',
      label: 'Saving (R$)',
      align: 'right',
      sortable: true,
      sortValue: (row) => row.saving,
      cellClassName: 'bg-blue-50/30',
      render: (row) => (
        <span className="font-bold text-blue-600 whitespace-nowrap">
          {row.saving.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      ),
    },
    {
      key: 'desconto_percentual',
      label: 'Desc. %',
      align: 'center',
      sortable: true,
      sortValue: (row) => row.desconto_percentual,
      render: (row) => (
        <div className="inline-flex items-center justify-center px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 whitespace-nowrap">
          {row.desconto_percentual.toFixed(2)}%
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 w-full animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="Saving de Compras"
        subtitle="Gestão de negociações e descontos do setor de suprimentos"
        icon={DollarSign}
      >
        {canEdit && (
          <Button icon={Plus} onClick={() => {
            setSavingToEdit(null);
            setIsFormModalOpen(true);
          }}>
            Novo Registro
          </Button>
        )}
      </PageHeader>

      {/* Tabs */}
      <div className="mt-2">
        <TabBar
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as 'list' | 'dashboard')}
          tabs={[
            { id: 'list', label: 'Lista de Solicitações', icon: FileText },
            { id: 'dashboard', label: 'Indicadores', icon: BarChart3 },
          ]}
        />
      </div>

      {activeTab === 'list' ? (
        <div className="space-y-4">
          <FilterBar
            searchValue={searchTerm}
            onSearch={setSearchTerm}
            searchPlaceholder="Buscar por comprador, cotação ou fornecedor..."
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
            advancedFilters={
              <>
                <FormField label="Data Inicial">
                  <Input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                  />
                </FormField>
                
                <FormField label="Data Final">
                  <Input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                  />
                </FormField>
                
                <FormField label="Comprador">
                  <Select
                    value={filterComprador}
                    onChange={(e) => setFilterComprador(e.target.value)}
                    options={[
                      { value: 'Todos', label: 'Todos' },
                      ...uniqueBuyers.map(buyer => ({ value: buyer || '', label: buyer?.toUpperCase() || '' }))
                    ]}
                  />
                </FormField>
                
                <FormField label="Fornecedor">
                  <Select
                    value={filterFornecedor}
                    onChange={(e) => setFilterFornecedor(e.target.value)}
                    options={[
                      { value: 'Todos', label: 'Todos' },
                      ...uniqueSuppliers.map(supplier => ({ value: supplier, label: supplier.toUpperCase() }))
                    ]}
                  />
                </FormField>
              </>
            }
          />

          <DataTable
            data={filteredSavings}
            columns={columns}
            rowKey={(row) => row.id}
            isLoading={loading}
            onRowClick={(row) => {
              setSelectedSaving(row);
              setIsDetailModalOpen(true);
            }}
            emptyTitle="Nenhum registro encontrado"
            emptyDescription="Você não tem nenhum saving registrado ou os filtros não retornaram resultados."
            emptyIcon={FileText}
          />
        </div>
      ) : (
        <SavingDashboard savings={filteredSavings} />
      )}

      <SavingFormModal 
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setTimeout(() => setSavingToEdit(null), 200);
        }}
        onSuccess={loadSavings}
        initialData={savingToEdit}
      />

      <SavingDetailModal
        saving={selectedSaving}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setTimeout(() => setSelectedSaving(null), 200);
        }}
        onDelete={handleDeleteSaving}
        onEdit={(saving) => {
          setSavingToEdit(saving);
          setIsFormModalOpen(true);
        }}
      />
    </div>
  );
}
