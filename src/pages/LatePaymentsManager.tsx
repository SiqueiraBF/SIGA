import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { latePaymentService, LatePayment } from '../services/latePaymentService';
import { outOfDeadlinePaymentService } from '../services/outOfDeadlinePaymentService';
import { useAuth } from '../context/AuthContext';
import { Loading } from '../components/Loading';
import toast from 'react-hot-toast';

import { LatePaymentFormModal } from '../components/late_payments/LatePaymentFormModal';
import { LatePaymentDetailsModal } from '../components/late_payments/LatePaymentDetailsModal';
import { LatePaymentPrintModal } from '../components/late_payments/LatePaymentPrintModal';

export function LatePaymentsManager() {
  const { user, role } = useAuth();
  const isAdmin = role?.nome === 'Administrador';

  // Permissões do módulo (usando a mesma premissa do out-of-deadline, ajustar conforme necessário)
  // Como definido nas regras, vamos utilizar a permissão existente ou apenas liberar para admins por agora (já que não foi especificado uma permissão exata no token do user)
  // "deve seguir o padrão do gestão de perfil, somente quem tem acesso a este modulo pode ver,"
  // Vamos assumir que quem acessa Pagamentos Fora do Prazo também acessa ou tem uma permissão similar, mas vamos simplificar para ver se a rota está ativa
  const canView = isAdmin || (role?.permissoes?.pagamentos_fora_prazo?.view_scope && role?.permissoes?.pagamentos_fora_prazo?.view_scope !== 'NONE');
  
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<LatePayment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<LatePayment[]>([]);
  
  const [farms, setFarms] = useState<any[]>([]);
  const [selectedFarmFilter, setSelectedFarmFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [detailsPayment, setDetailsPayment] = useState<LatePayment | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

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
        latePaymentService.getLatePayments()
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

    if (selectedFarmFilter) {
      // O selectedFarmFilter guarda o id da fazenda.
      // O LatePayment guarda o nome em `company`. Precisamos encontrar o nome.
      const farm = farms.find(f => f.id === selectedFarmFilter);
      if (farm) {
        filtered = filtered.filter(p => p.company === farm.nome);
      }
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(p => 
        p.supplier_client.toLowerCase().includes(lowerSearch) ||
        p.document_number?.toLowerCase().includes(lowerSearch) ||
        p.responsible?.toLowerCase().includes(lowerSearch) ||
        p.cpf_cnpj?.toLowerCase().includes(lowerSearch)
      );
    }

    setFilteredPayments(filtered);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.')) {
      try {
        await latePaymentService.deleteLatePayment(id);
        toast.success('Registro excluído com sucesso');
        loadInitialData();
      } catch (error) {
        console.error(error);
        toast.error('Erro ao excluir registro');
      }
    }
  };

  if (loading) return <Loading />;

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-slate-500 animate-in fade-in duration-300">
        <AlertCircle size={64} className="text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-700">Acesso Restrito</h2>
        <p className="mt-2 text-slate-500">Você não tem permissão para acessar este módulo.</p>
      </div>
    );
  }

  return (
    <div className="p-6 w-full animate-in fade-in duration-500">
      <PageHeader
        title="Registro de Pagamentos (Atrasos)"
        subtitle="Controle de Notas Fiscais/Boletos com Juros ou Desconto"
        icon={TrendingDown}
      >
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 text-white bg-teal-600 hover:bg-teal-700 rounded-xl font-bold transition-all shadow-lg shadow-teal-500/25 active:scale-95"
        >
          <Plus size={18} />
          Novo Registro
        </button>
      </PageHeader>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por fornecedor, documento, CNPJ ou responsável..."
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
                <th className="py-4 px-4 font-bold">Data Lanç.</th>
                <th className="py-4 px-4 font-bold">Documento</th>
                <th className="py-4 px-4 font-bold">Empresa (Unidade)</th>
                <th className="py-4 px-4 font-bold">Fornecedor / Cliente</th>
                <th className="py-4 px-4 font-bold">Juros/Desconto</th>
                <th className="py-4 px-4 font-bold">Valor Final (R$)</th>
                <th className="py-4 px-4 font-bold">Responsável</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <FileText size={48} className="text-slate-300" />
                      <p>Nenhum registro encontrado.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr 
                    key={payment.id} 
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => setDetailsPayment(payment)}
                  >
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(payment.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 whitespace-nowrap">Nº {payment.document_number}</div>
                      {payment.due_date && <div className="text-xs text-slate-500 whitespace-nowrap">Venc: {new Date(payment.due_date).toLocaleDateString('pt-BR')}</div>}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {payment.company}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {payment.supplier_client}
                      <div className="text-xs text-slate-500">{payment.cpf_cnpj}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className={`font-bold text-xs px-2 py-1 inline-flex items-center gap-1 rounded-md ${
                        payment.adjustment_type === 'JUROS' 
                          ? 'bg-red-50 text-red-700 border border-red-200' 
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {payment.adjustment_type === 'JUROS' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {payment.adjustment_type === 'JUROS' ? 'Juros' : 'Desc.'}: R$ {Number(payment.adjustment_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-slate-500 text-[10px] mt-1 line-through" title="Valor Original">
                        Orig: R$ {Number(payment.original_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                      R$ {Number(payment.final_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 leading-snug">{payment.responsible}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <LatePaymentFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={loadInitialData}
      />

      <LatePaymentDetailsModal
        payment={detailsPayment!}
        isOpen={!!detailsPayment && !isPrintModalOpen}
        onClose={() => setDetailsPayment(null)}
        onPrint={() => setIsPrintModalOpen(true)}
        onDelete={() => handleDelete(detailsPayment!.id)}
        canDelete={isAdmin}
      />

      <LatePaymentPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        payment={detailsPayment}
      />
    </div>
  );
}
