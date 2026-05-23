import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, FileText, DollarSign, Building2, User, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { outOfDeadlinePaymentService } from '../../services/outOfDeadlinePaymentService';
import { latePaymentService, CreateLatePaymentInput } from '../../services/latePaymentService';
import { supplierService } from '../../services/supplierService';
import { SupplierFormModal } from '../suppliers/SupplierFormModal';
import { Supplier } from '../../types';
import toast from 'react-hot-toast';

interface LatePaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TIPOS_DOC = ['Guia', 'NFE', 'Recibo'];

const MOTIVOS = [
  { label: 'Primeira Compra', requiresActionPlan: true },
  { label: 'Sem cadastro no fornecedor', requiresActionPlan: true },
  { label: 'Pagamento apenas a vista', requiresActionPlan: true },
  { label: 'Máquina Parada', requiresActionPlan: true },
  { label: 'Atraso na solicitação da NF ou Boleto ao Fornecedor', requiresActionPlan: true },
  { label: 'Atraso no envio da NF ou Boleto pelo Fornecedor', requiresActionPlan: true },
  { label: 'Solicitação da Diretoria, com evidência', requiresActionPlan: true },
  { label: 'Solicitação da Diretoria, sem evidência', requiresActionPlan: true },
  { label: 'Pagamento compulsório de processos fiscais', requiresActionPlan: true },
  { label: 'Falta de Programação Prévia (planejamento)', requiresActionPlan: true },
  { label: 'Falha no processo administrativo', requiresActionPlan: true },
  { label: 'Falta de Saldo / Fluxo de Caixa', requiresActionPlan: true },
  { label: 'Falta de aceite/tratativas em tempo hábil', requiresActionPlan: true },
];

export function LatePaymentFormModal({ isOpen, onClose, onSuccess }: LatePaymentFormModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [farms, setFarms] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Fornecedor State
  const [supplierSearchOptionsOpen, setSupplierSearchOptionsOpen] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    company: '',
    document_number: '',
    document_type: '',
    supplier_client: '',
    cpf_cnpj: '',
    original_value: '',
    adjustment_type: 'JUROS' as 'JUROS' | 'DESCONTO',
    adjustment_value: '',
    issue_date: '',
    due_date: '',
    payment_date: '',
    justification: '',
    motivo: '',
  });

  const [actionPlanData, setActionPlanData] = useState({
    quando: '',
    como: '',
    quem: ''
  });

  const finalValue = React.useMemo(() => {
    const original = Number(formData.original_value.replace(',', '.')) || 0;
    const adjustment = Number(formData.adjustment_value.replace(',', '.')) || 0;
    
    if (formData.adjustment_type === 'JUROS') {
      return original + adjustment;
    }
    return original - adjustment > 0 ? original - adjustment : 0;
  }, [formData.original_value, formData.adjustment_value, formData.adjustment_type]);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      setFormData({
        company: '',
        document_number: '',
        document_type: '',
        supplier_client: '',
        cpf_cnpj: '',
        original_value: '',
        adjustment_type: 'JUROS',
        adjustment_value: '',
        issue_date: '',
        due_date: '',
        payment_date: '',
        justification: '',
        motivo: '',
      });
      setActionPlanData({
        quando: '',
        como: '',
        quem: ''
      });
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    try {
      const [farmsData, suppliersData] = await Promise.all([
        outOfDeadlinePaymentService.getUnits(),
        supplierService.getActive()
      ]);
      setFarms(farmsData);
      setSuppliers(suppliersData);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar dados iniciais');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleActionPlanChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setActionPlanData(prev => ({ ...prev, [name]: value }));
  };

  const selectedMotivo = MOTIVOS.find(m => m.label === formData.motivo);
  const showActionPlan = selectedMotivo?.requiresActionPlan;

  const selectSupplier = (s: Supplier) => {
    setFormData(prev => ({ 
      ...prev, 
      supplier_client: s.razao_social,
      cpf_cnpj: s.cnpj
    }));
    setSupplierSearchOptionsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.company || !formData.supplier_client || !formData.document_number || !formData.document_type || !formData.original_value || !formData.adjustment_value || !formData.motivo) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    if (showActionPlan) {
      if (!actionPlanData.quando || !actionPlanData.como || !actionPlanData.quem) {
        toast.error('Todos os campos do Plano de Ação são obrigatórios para o motivo selecionado');
        return;
      }
    }

    setLoading(true);

    try {
      const input: CreateLatePaymentInput = {
        company: formData.company,
        document_number: formData.document_number,
        document_type: formData.document_type,
        supplier_client: formData.supplier_client,
        cpf_cnpj: formData.cpf_cnpj,
        original_value: Number(formData.original_value.replace(',', '.')) || 0,
        adjustment_type: formData.adjustment_type,
        adjustment_value: Number(formData.adjustment_value.replace(',', '.')) || 0,
        final_value: finalValue,
        issue_date: formData.issue_date,
        due_date: formData.due_date,
        payment_date: formData.payment_date,
        justification: formData.justification,
        motivo: formData.motivo,
        action_plan: showActionPlan ? JSON.stringify(actionPlanData) : undefined,
        responsible: user?.nome || user?.email || 'Usuário Desconhecido'
      };

      await latePaymentService.createLatePayment(input);

      toast.success('Registro de pagamento criado com sucesso!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erro ao salvar registro');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 border border-white/20">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between z-10 sticky top-0 bg-white/80 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center border border-teal-100 shadow-sm">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Novo Registro (Juros / Desconto)</h2>
              <p className="text-sm text-slate-500">Informe os detalhes do pagamento com acréscimo ou decréscimo.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-slate-50/50">
          <form id="late-payment-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* Bloco 1: Dados Base */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Building2 size={16} className="text-teal-600" />
                Dados Principais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Unidade (Empresa) *</label>
                  <select
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                    required
                  >
                    <option value="" disabled>Selecione a Empresa...</option>
                    {farms.map((f) => (
                      <option key={f.id} value={f.nome}>{f.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 relative">
                  <label className="text-sm font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    Fornecedor / Cliente *
                    <button 
                        type="button" 
                        onClick={(e) => { e.preventDefault(); setIsQuickCreateOpen(true); }}
                        className="text-xs text-teal-600 hover:text-teal-800 font-bold hover:underline"
                    >
                        + Cadastrar Novo
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="supplier_client"
                      value={formData.supplier_client}
                      onChange={(e) => {
                          handleChange(e);
                          setSupplierSearchOptionsOpen(true);
                      }}
                      onFocus={() => setSupplierSearchOptionsOpen(true)}
                      onBlur={() => setTimeout(() => setSupplierSearchOptionsOpen(false), 200)}
                      autoComplete="off"
                      placeholder="Buscar Fornecedor..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                      required
                    />
                    {supplierSearchOptionsOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            {suppliers.filter(s => {
                                const searchTxt = formData.supplier_client.toLowerCase();
                                const searchNumbers = searchTxt.replace(/\D/g, '');
                                const cnpjNumbers = s.cnpj.replace(/\D/g, '');
                                
                                return s.razao_social.toLowerCase().includes(searchTxt) || 
                                       (searchNumbers && cnpjNumbers.includes(searchNumbers)) ||
                                       s.cnpj.includes(searchTxt);
                            }).length === 0 ? (
                                <div className="p-3 text-sm text-slate-500 text-center">Nenhum fornecedor encontrado.</div>
                            ) : (
                                suppliers.filter(s => {
                                    const searchTxt = formData.supplier_client.toLowerCase();
                                    const searchNumbers = searchTxt.replace(/\D/g, '');
                                    const cnpjNumbers = s.cnpj.replace(/\D/g, '');
                                    
                                    return s.razao_social.toLowerCase().includes(searchTxt) || 
                                           (searchNumbers && cnpjNumbers.includes(searchNumbers)) ||
                                           s.cnpj.includes(searchTxt);
                                }).map(s => (
                                    <div 
                                        key={s.id}
                                        className="px-4 py-2 cursor-pointer hover:bg-teal-50 border-b border-slate-50 last:border-0"
                                        onClick={() => selectSupplier(s)}
                                    >
                                        <div className="text-sm font-bold text-slate-700">{s.razao_social}</div>
                                        <div className="text-xs text-slate-500 font-mono">{s.cnpj}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">CPF / CNPJ *</label>
                  <input
                    type="text"
                    name="cpf_cnpj"
                    value={formData.cpf_cnpj}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none"
                    readOnly
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Tipo do Doc *</label>
                  <select
                    name="document_type"
                    value={formData.document_type}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                    required
                  >
                    <option value="" disabled>Selecione...</option>
                    {TIPOS_DOC.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Nº do Documento *</label>
                  <input
                    type="text"
                    name="document_number"
                    value={formData.document_number}
                    onChange={handleChange}
                    placeholder="Ex: 12345"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Bloco 2: Datas */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText size={16} className="text-teal-600" />
                Datas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Data de Emissão</label>
                  <input
                    type="date"
                    name="issue_date"
                    value={formData.issue_date}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Vencimento Original</label>
                  <input
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Data de Pagamento</label>
                  <input
                    type="date"
                    name="payment_date"
                    value={formData.payment_date}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Bloco 3: Financeiro */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <DollarSign size={100} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <RefreshCw size={16} className="text-teal-600" />
                Valores
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Valor Original *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="original_value"
                    value={formData.original_value}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Tipo *</label>
                  <select
                    name="adjustment_type"
                    value={formData.adjustment_type}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                    required
                  >
                    <option value="JUROS">Juros (+)</option>
                    <option value="DESCONTO">Desconto (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Valor ({formData.adjustment_type === 'JUROS' ? 'Juros' : 'Desconto'}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="adjustment_value"
                    value={formData.adjustment_value}
                    onChange={handleChange}
                    placeholder="0.00"
                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:bg-white focus:ring-2 outline-none transition-all ${
                      formData.adjustment_type === 'JUROS' 
                        ? 'border-red-200 focus:ring-red-500 text-red-700' 
                        : 'border-emerald-200 focus:ring-emerald-500 text-emerald-700'
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Valor Final</label>
                  <div className="w-full px-4 py-2.5 bg-slate-800 text-white font-bold border border-slate-700 rounded-xl text-sm shadow-inner flex items-center justify-between">
                    <span>R$</span>
                    <span>{finalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco 4: Justificativa */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <AlertCircle size={16} className="text-teal-600" />
                Motivo e Justificativa
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Motivo *</label>
                  <select
                    name="motivo"
                    value={formData.motivo}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                    required
                  >
                    <option value="" disabled>Selecione o motivo...</option>
                    {MOTIVOS.map((m) => (
                      <option key={m.label} value={m.label}>{m.label}</option>
                    ))}
                  </select>
                  {formData.motivo === 'Pagamento compulsório de processos fiscais' && (
                    <div className="mt-3 text-xs text-amber-700 bg-amber-50/80 p-3 rounded-xl border border-amber-200/50 flex items-start gap-2">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <p className="leading-relaxed">
                        <strong>Obs:</strong> São guias e taxas que devem ser pagas no mesmo dia da geração do documento, ex: Guias de Cancelamento Extemporâneo, Taxas para Certidões entre outros.
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Justificativa Detalhada</label>
                  <textarea
                    name="justification"
                    value={formData.justification}
                    onChange={handleChange}
                    placeholder="Explique o contexto..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none resize-none transition-all"
                  />
                </div>

                {showActionPlan && (
                  <div className="mt-4 p-5 bg-teal-50/50 border border-teal-100 rounded-xl animate-in slide-in-from-top-2">
                    <label className="block text-sm font-bold text-teal-800 mb-2 flex items-center gap-2">
                      <AlertCircle size={16} />
                      Plano de Ação Obrigatório
                    </label>
                    <p className="text-xs text-teal-600 mb-3">
                      Devido ao motivo selecionado, é necessário registrar um plano de ação para evitar que isso aconteça novamente.
                    </p>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-teal-800 mb-1">Quando? (Data Limite)</label>
                          <input
                            type="date"
                            name="quando"
                            value={actionPlanData.quando}
                            onChange={handleActionPlanChange}
                            className="w-full px-4 py-2.5 bg-white border border-teal-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                            required={showActionPlan}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-teal-800 mb-1">Quem? (Responsável)</label>
                          <input
                            type="text"
                            name="quem"
                            value={actionPlanData.quem}
                            onChange={handleActionPlanChange}
                            placeholder="Nome do responsável"
                            className="w-full px-4 py-2.5 bg-white border border-teal-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                            required={showActionPlan}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-teal-800 mb-1">Como? (Ação a ser tomada)</label>
                        <textarea
                          name="como"
                          value={actionPlanData.como}
                          onChange={handleActionPlanChange}
                          placeholder="Detalhar o plano de ações para evitar recorrências"
                          rows={2}
                          className="w-full px-4 py-2.5 bg-white border border-teal-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none transition-all"
                          required={showActionPlan}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end text-xs text-slate-400 px-2">
              <User size={14} className="mr-1" />
              Responsável pelo Lançamento: <span className="font-semibold text-slate-600 ml-1">{user?.nome || 'Usuário'}</span>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3 z-10 sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          
          <button
            type="submit"
            form="late-payment-form"
            disabled={loading}
            className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:active:scale-100 text-white px-8 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-teal-500/25 active:scale-95"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            Salvar Registro
          </button>
        </div>
      </div>

      <SupplierFormModal 
          isOpen={isQuickCreateOpen}
          onClose={() => setIsQuickCreateOpen(false)}
          onSuccess={(newSupplier) => {
              setSuppliers(prev => [...prev, newSupplier]);
              selectSupplier(newSupplier);
          }}
      />
    </div>
  );
}
