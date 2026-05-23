import React, { useState, useEffect } from 'react';
import { Plus, Settings, Search, FileText, Printer, Trash2, Building2, BarChart3, List, Paperclip, AlertCircle, Calendar } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { outOfDeadlinePaymentService, OutOfDeadlinePayment } from '../services/outOfDeadlinePaymentService';
import { farmService } from '../services/farmService';
import { useAuth } from '../context/AuthContext';
import { Loading } from '../components/Loading';
import toast from 'react-hot-toast';

import { PaymentFormModal } from '../components/out-of-deadline-payments/PaymentFormModal';
import { PaymentSettingsModal } from '../components/out-of-deadline-payments/PaymentSettingsModal';
import { PaymentPrintModal } from '../components/out-of-deadline-payments/PaymentPrintModal';
import { PaymentDashboard } from '../components/out-of-deadline-payments/PaymentDashboard';
import { PaymentDetailsModal } from '../components/out-of-deadline-payments/PaymentDetailsModal';

export function OutOfDeadlinePayments() {
  const { user, role } = useAuth();
  const isAdmin = role?.nome === 'Administrador';

  // Permissões do módulo
  const perms = role?.permissoes?.pagamentos_fora_prazo;
  const canView = isAdmin || (perms?.view_scope && perms.view_scope !== 'NONE');
  const isOwnOnly = !isAdmin && perms?.view_scope === 'OWN_ONLY';
  const canConfig = isAdmin || !!perms?.manage_notifications;
  const canDelete = isAdmin || !!perms?.can_delete;
  const canCreate = canView;

  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<OutOfDeadlinePayment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<OutOfDeadlinePayment[]>([]);
  
  const [farms, setFarms] = useState<any[]>([]);
  const [selectedFarmFilter, setSelectedFarmFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  // Modais & Tabs
  const [activeTab, setActiveTab] = useState<'list' | 'dashboard'>('list');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [printPayment, setPrintPayment] = useState<OutOfDeadlinePayment | null>(null);
  const [detailsPayment, setDetailsPayment] = useState<OutOfDeadlinePayment | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    filterData();
  }, [search, selectedFarmFilter, payments]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [farmsData, paymentsData] = await Promise.all([
        outOfDeadlinePaymentService.getUnits(),
        outOfDeadlinePaymentService.getPayments()
      ]);
      setFarms(farmsData);
      setPayments(paymentsData);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = payments;

    if (isOwnOnly && user) {
      filtered = filtered.filter(p => p.user_id === user.id);
    }

    if (selectedFarmFilter) {
      filtered = filtered.filter(p => p.fazenda_id === selectedFarmFilter);
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(p => 
        p.fornecedor.toLowerCase().includes(lowerSearch) ||
        p.n_doc.toLowerCase().includes(lowerSearch) ||
        p.usuario?.nome?.toLowerCase().includes(lowerSearch)
      );
    }

    setFilteredPayments(filtered);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.')) {
      try {
        await outOfDeadlinePaymentService.deletePayment(id);
        toast.success('Lançamento excluído com sucesso');
        setDetailsPayment(null);
        loadInitialData();
      } catch (error) {
        console.error(error);
        toast.error('Erro ao excluir lançamento');
      }
    }
  };

  if (loading) return <Loading />;

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-slate-500 animate-in fade-in duration-300">
        <AlertCircle size={64} className="text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-700">Acesso Restrito</h2>
        <p className="mt-2 text-slate-500">Você não tem permissão para acessar o módulo de Pagamentos Fora do Prazo.</p>
      </div>
    );
  }

  return (
    <div className="p-6 w-full animate-in fade-in duration-500">
      <PageHeader
        title="Pagamentos Fora do Prazo"
        subtitle="Autorizações, justificativas e planos de ação"
        icon={AlertCircle}
      >
        {canConfig && (
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-medium transition-colors shadow-sm"
          >
            <Settings size={18} />
            <span className="hidden sm:inline">Configurações</span>
          </button>
        )}
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 text-white bg-teal-600 hover:bg-teal-700 rounded-xl font-bold transition-all shadow-lg shadow-teal-500/25 active:scale-95"
        >
          <Plus size={18} />
          Nova Autorização
        </button>
      </PageHeader>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-colors ${
            activeTab === 'list' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <List size={18} /> Lançamentos
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-colors ${
            activeTab === 'dashboard' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <BarChart3 size={18} /> Indicadores (Dashboard)
        </button>
      </div>

      {activeTab === 'list' ? (
        <>
          {/* Filtros */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por fornecedor, documento ou lançador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
              />
            </div>
            <div className="md:w-64">
              <select
                value={selectedFarmFilter}
                onChange={(e) => setSelectedFarmFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
              >
                <option value="">Todas as Unidades</option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>
          </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
                <th className="py-4 px-4 font-bold">Data Lanç.</th>
                <th className="py-4 px-4 font-bold">Documento</th>
                <th className="py-4 px-4 font-bold">Fornecedor</th>
                <th className="py-4 px-4 font-bold">Unidade</th>
                <th className="py-4 px-4 font-bold">Venc. / Pgto</th>
                <th className="py-4 px-4 font-bold">Valor (R$)</th>
                <th className="py-4 px-4 font-bold">Responsável</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <FileText size={48} className="text-slate-300" />
                      <p>Nenhum pagamento fora do prazo encontrado.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr 
                    key={payment.id} 
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    onClick={() => setDetailsPayment(payment)}
                  >
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(payment.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 whitespace-nowrap">{payment.tipo_doc}</div>
                      <div className="text-xs text-slate-500 whitespace-nowrap">Nº {payment.n_doc}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {payment.fornecedor}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {payment.fazenda?.nome}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-500 text-xs line-through whitespace-nowrap" title="Vencimento Original">
                        {new Date(payment.data_vencimento).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="font-bold text-red-600 whitespace-nowrap" title="Data Programada Pgto">
                        {new Date(payment.data_pgto).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                      R$ {Number(payment.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 leading-snug">{payment.usuario?.nome}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">{payment.setor}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      ) : (
        <PaymentDashboard payments={payments} />
      )}

      <PaymentFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={loadInitialData}
      />

      <PaymentSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {detailsPayment && (
        <PaymentDetailsModal
          payment={detailsPayment}
          isOpen={true}
          onClose={() => setDetailsPayment(null)}
          onPrint={() => {
            setPrintPayment(detailsPayment);
            setDetailsPayment(null);
          }}
          onDelete={() => handleDelete(detailsPayment.id)}
          canDelete={canDelete}
        />
      )}

      <PaymentPrintModal
        isOpen={!!printPayment}
        onClose={() => setPrintPayment(null)}
        payment={printPayment}
      />
    </div>
  );
}
