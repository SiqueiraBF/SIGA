import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, FileText, Calendar, DollarSign, Building2, User, ChevronDown, Paperclip, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { farmService } from '../../services/farmService';
import { outOfDeadlinePaymentService, OutOfDeadlinePaymentSector, OutOfDeadlinePaymentResponsible } from '../../services/outOfDeadlinePaymentService';
import { userService } from '../../services/userService';
import { supplierService } from '../../services/supplierService';
import { SupplierFormModal } from '../suppliers/SupplierFormModal';
import { Supplier } from '../../types';
import toast from 'react-hot-toast';
import { Modal } from '../ui/Modal';
import { ModalHeader } from '../ui/ModalHeader';
import { ModalFooter } from '../ui/ModalFooter';

interface PaymentFormModalProps {
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

export function PaymentFormModal({ isOpen, onClose, onSuccess }: PaymentFormModalProps) {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [farms, setFarms] = useState<any[]>([]);
  const [sectors, setSectors] = useState<OutOfDeadlinePaymentSector[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [responsibles, setResponsibles] = useState<string[]>([]);

  // Fornecedor State
  const [supplierSearchOptionsOpen, setSupplierSearchOptionsOpen] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);

  // Custom Modals State
  const [isSectorModalOpen, setIsSectorModalOpen] = useState(false);
  const [newSectorName, setNewSectorName] = useState('');
  const [sectorModalLoading, setSectorModalLoading] = useState(false);

  const [isResponsibleModalOpen, setIsResponsibleModalOpen] = useState(false);
  const [newResponsibleName, setNewResponsibleName] = useState('');
  const [responsibleModalLoading, setResponsibleModalLoading] = useState(false);

  const [formData, setFormData] = useState({
    fazenda_id: '',
    data_doc: '',
    tipo_doc: '',
    n_doc: '',
    fornecedor: '',
    data_vencimento: '',
    data_pgto: '',
    valor: '',
    motivo: '',
    justificativa: '',
    action_plan: '',
    setor: '',
    responsavel: '',
  });

  const [actionPlanData, setActionPlanData] = useState({
    quando: '',
    como: '',
    quem: ''
  });

  const [attachments, setAttachments] = useState<File[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadFarms();
      loadSectors();
      loadSuppliers();
      loadResponsiblesData();

      // Pre-fill setor with user's function/role
      if (role?.nome) {
        setFormData(prev => ({ ...prev, setor: role.nome }));
      }
    } else {
      // Reset
      setFormData({
        fazenda_id: '',
        data_doc: '',
        tipo_doc: '',
        n_doc: '',
        fornecedor: '',
        data_vencimento: '',
        data_pgto: '',
        valor: '',
        motivo: '',
        justificativa: '',
        action_plan: '',
        setor: '',
        responsavel: '',
      });
      setActionPlanData({
        quando: '',
        como: '',
        quem: ''
      });
      setAttachments([]);
    }
  }, [isOpen]);

  const loadFarms = async () => {
    try {
      const data = await outOfDeadlinePaymentService.getUnits();
      setFarms(data);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar unidades');
    }
  };

  const loadSectors = async () => {
    try {
      const data = await outOfDeadlinePaymentService.getSectors(true);
      setSectors(data);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar setores');
    }
  };

  const loadSuppliers = async () => {
    try {
      const data = await supplierService.getActive();
      setSuppliers(data);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar fornecedores');
    }
  };

  const loadResponsiblesData = async () => {
    try {
      const [usersData, avulsosData] = await Promise.all([
        userService.listActiveUsers(),
        outOfDeadlinePaymentService.getResponsibles(true)
      ]);
      const nomes = new Set<string>();
      usersData.forEach((u: any) => {
        if (u.nome) nomes.add(u.nome.trim());
      });
      avulsosData.forEach((r: any) => {
        if (r.nome) nomes.add(r.nome.trim());
      });
      const sortedNomes = Array.from(nomes).sort((a, b) => a.localeCompare(b));
      setResponsibles(sortedNomes);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar responsáveis');
    }
  };

  const handleQuickCreateSector = (e: React.MouseEvent) => {
    e.preventDefault();
    setNewSectorName('');
    setIsSectorModalOpen(true);
  };

  const handleQuickCreateResponsible = (e: React.MouseEvent) => {
    e.preventDefault();
    setNewResponsibleName('');
    setIsResponsibleModalOpen(true);
  };

  const handleCreateSectorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectorName.trim()) {
      toast.error('O nome do setor é obrigatório');
      return;
    }
    setSectorModalLoading(true);
    try {
      const newSector = await outOfDeadlinePaymentService.createSector(newSectorName.trim());
      setSectors(prev => [...prev, newSector].sort((a, b) => a.nome.localeCompare(b.nome)));
      setFormData(prev => ({ ...prev, setor: newSector.nome }));
      toast.success('Setor cadastrado com sucesso!');
      setIsSectorModalOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erro ao cadastrar setor');
    } finally {
      setSectorModalLoading(false);
    }
  };

  const handleCreateResponsibleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResponsibleName.trim()) {
      toast.error('O nome do responsável é obrigatório');
      return;
    }
    setResponsibleModalLoading(true);
    try {
      const newResp = await outOfDeadlinePaymentService.createResponsible(newResponsibleName.trim());
      setResponsibles(prev => {
        const updated = Array.from(new Set([...prev, newResp.nome]));
        return updated.sort((a, b) => a.localeCompare(b));
      });
      setFormData(prev => ({ ...prev, responsavel: newResp.nome }));
      toast.success('Responsável cadastrado com sucesso!');
      setIsResponsibleModalOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erro ao cadastrar responsável');
    } finally {
      setResponsibleModalLoading(false);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const selectedMotivo = MOTIVOS.find(m => m.label === formData.motivo);
  const showActionPlan = selectedMotivo?.requiresActionPlan;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fazenda_id || !formData.data_doc || !formData.tipo_doc || !formData.n_doc || !formData.fornecedor || !formData.data_vencimento || !formData.data_pgto || !formData.valor || !formData.motivo || !formData.justificativa || !formData.setor || !formData.responsavel) {
      toast.error('Preencha todos os campos obrigatórios');
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
      // Formatar valor (assumindo que o usuario digitou como numero ou ponto)
      const numericValue = Number(formData.valor.replace(',', '.'));

      await outOfDeadlinePaymentService.createPayment({
        fazenda_id: formData.fazenda_id,
        data_doc: formData.data_doc,
        tipo_doc: formData.tipo_doc,
        n_doc: formData.n_doc,
        fornecedor: formData.fornecedor,
        data_vencimento: formData.data_vencimento,
        data_pgto: formData.data_pgto,
        valor: numericValue,
        motivo: formData.motivo,
        justificativa: formData.justificativa,
        action_plan: showActionPlan ? JSON.stringify(actionPlanData) : undefined,
        setor: formData.setor,
        responsavel: formData.responsavel,
      }, user ? { id: user.id, email: user.email || '' } : undefined, attachments);

      toast.success('Autorização gerada com sucesso! E-mails notificados.');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erro ao gerar autorização');
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
              <h2 className="text-xl font-bold text-slate-800">Nova Autorização Fora do Prazo</h2>
              <p className="text-sm text-slate-500">Preencha os dados do documento para aprovação.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-slate-50/50">
          <form id="payment-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* Bloco 1: Dados Base */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Building2 size={16} className="text-teal-600" />
                Dados Principais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Unidade Nadiana *</label>
                  <select
                    name="fazenda_id"
                    value={formData.fazenda_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                    required
                  >
                    <option value="" disabled>Selecione a Unidade...</option>
                    {farms.map((f) => (
                      <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    Setor Solicitante *
                    <button 
                        type="button" 
                        onClick={handleQuickCreateSector}
                        className="text-xs text-teal-600 hover:text-teal-800 font-bold hover:underline"
                    >
                        + Cadastrar Novo
                    </button>
                  </label>
                  <select
                    name="setor"
                    value={formData.setor}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                    required
                  >
                    <option value="" disabled>Selecione o Setor...</option>
                    {formData.setor && !sectors.some(s => s.nome === formData.setor) && (
                      <option value={formData.setor}>{formData.setor}</option>
                    )}
                    {sectors.map((s) => (
                      <option key={s.id} value={s.nome}>{s.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 relative">
                  <label className="text-sm font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    Fornecedor *
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
                      name="fornecedor"
                      value={formData.fornecedor}
                      onChange={(e) => {
                          handleChange(e);
                          setSupplierSearchOptionsOpen(true);
                      }}
                      onFocus={() => setSupplierSearchOptionsOpen(true)}
                      onBlur={() => setTimeout(() => setSupplierSearchOptionsOpen(false), 200)}
                      autoComplete="off"
                      placeholder="Buscar Razão Social ou CNPJ..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                      required
                    />
                    {supplierSearchOptionsOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            {suppliers.filter(s => {
                                const searchTxt = formData.fornecedor.toLowerCase();
                                const searchNumbers = searchTxt.replace(/\D/g, '');
                                const cnpjNumbers = s.cnpj.replace(/\D/g, '');
                                
                                return s.razao_social.toLowerCase().includes(searchTxt) || 
                                       (searchNumbers && cnpjNumbers.includes(searchNumbers)) ||
                                       s.cnpj.includes(searchTxt);
                            }).length === 0 ? (
                                <div className="p-3 text-sm text-slate-500 text-center">Nenhum fornecedor encontrado.</div>
                            ) : (
                                suppliers.filter(s => {
                                    const searchTxt = formData.fornecedor.toLowerCase();
                                    const searchNumbers = searchTxt.replace(/\D/g, '');
                                    const cnpjNumbers = s.cnpj.replace(/\D/g, '');
                                    
                                    return s.razao_social.toLowerCase().includes(searchTxt) || 
                                           (searchNumbers && cnpjNumbers.includes(searchNumbers)) ||
                                           s.cnpj.includes(searchTxt);
                                }).map(s => (
                                    <div 
                                        key={s.id}
                                        className="px-4 py-2 cursor-pointer hover:bg-teal-50 border-b border-slate-50 last:border-0"
                                        onClick={() => {
                                            setFormData(prev => ({ ...prev, fornecedor: `${s.razao_social} - ${s.cnpj}` }));
                                            setSupplierSearchOptionsOpen(false);
                                        }}
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
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    Responsável *
                    <button 
                        type="button" 
                        onClick={handleQuickCreateResponsible}
                        className="text-xs text-teal-600 hover:text-teal-800 font-bold hover:underline"
                    >
                        + Cadastrar Novo
                    </button>
                  </label>
                  <select
                    name="responsavel"
                    value={formData.responsavel}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                    required
                  >
                    <option value="" disabled>Selecione o Responsável...</option>
                    {responsibles.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Bloco 2: Documento */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText size={16} className="text-teal-600" />
                Informações do Documento
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Tipo do Doc *</label>
                  <select
                    name="tipo_doc"
                    value={formData.tipo_doc}
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
                    name="n_doc"
                    value={formData.n_doc}
                    onChange={handleChange}
                    placeholder="Ex: 12345"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Data do Doc *</label>
                  <input
                    type="date"
                    name="data_doc"
                    value={formData.data_doc}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Bloco 3: Financeiro */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <DollarSign size={16} className="text-teal-600" />
                Dados de Pagamento
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Data de Vencimento *</label>
                  <input
                    type="date"
                    name="data_vencimento"
                    value={formData.data_vencimento}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Data Programada Pgto *</label>
                  <input
                    type="date"
                    name="data_pgto"
                    value={formData.data_pgto}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="valor"
                    value={formData.valor}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                    required
                  />
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
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Motivo do Atraso *</label>
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
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Justificativa Detalhada *</label>
                  <textarea
                    name="justificativa"
                    value={formData.justificativa}
                    onChange={handleChange}
                    placeholder="Explique detalhadamente o contexto..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none resize-none transition-all"
                    required
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

            {/* Bloco 5: Anexos */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Paperclip size={16} className="text-teal-600" />
                Anexos
              </h3>
              <div className="space-y-4">
                <div className="flex flex-col items-start gap-4">
                  <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors text-sm font-medium">
                    <Paperclip size={18} />
                    Selecionar Arquivos
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    />
                  </label>
                  <p className="text-xs text-slate-500">Arquivos suportados: PDF, Imagens e Documentos Word.</p>
                </div>

                {attachments.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center shrink-0">
                            <FileText size={16} className="text-slate-400" />
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-medium text-slate-700 truncate">{file.name}</span>
                            <span className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Alerta Invisível para enviar Usuario logado */}
            <div className="flex items-center gap-2 text-xs text-slate-400 justify-end px-2">
              <User size={14} />
              Responsável pelo Lançamento: <span className="font-semibold text-slate-600">{user?.nome || 'Usuário'}</span>
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
            form="payment-form"
            disabled={loading}
            className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:active:scale-100 text-white px-8 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-teal-500/25 active:scale-95"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            Gerar Autorização
          </button>
        </div>
      </div>

      {/* Modal para criar Setor */}
      <Modal isOpen={isSectorModalOpen} onClose={() => setIsSectorModalOpen(false)} size="sm">
        <ModalHeader title="Cadastrar Novo Setor" icon={Building2} onClose={() => setIsSectorModalOpen(false)} eliteStyle />
        <form onSubmit={handleCreateSectorSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Nome do Setor *
              </label>
              <input
                type="text"
                value={newSectorName}
                onChange={(e) => setNewSectorName(e.target.value)}
                placeholder="Ex: Financeiro"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-800"
                required
                autoFocus
              />
            </div>
          </div>
          <ModalFooter eliteStyle>
            <button
              type="button"
              onClick={() => setIsSectorModalOpen(false)}
              className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={sectorModalLoading}
              className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-95 flex items-center gap-2"
            >
              {sectorModalLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Salvar Setor
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Modal para criar Responsável */}
      <Modal isOpen={isResponsibleModalOpen} onClose={() => setIsResponsibleModalOpen(false)} size="sm">
        <ModalHeader title="Cadastrar Novo Responsável" icon={User} onClose={() => setIsResponsibleModalOpen(false)} eliteStyle />
        <form onSubmit={handleCreateResponsibleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Nome do Responsável *
              </label>
              <input
                type="text"
                value={newResponsibleName}
                onChange={(e) => setNewResponsibleName(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-800"
                required
                autoFocus
              />
            </div>
          </div>
          <ModalFooter eliteStyle>
            <button
              type="button"
              onClick={() => setIsResponsibleModalOpen(false)}
              className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={responsibleModalLoading}
              className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-95 flex items-center gap-2"
            >
              {responsibleModalLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Salvar Responsável
            </button>
          </ModalFooter>
        </form>
      </Modal>

      <SupplierFormModal 
          isOpen={isQuickCreateOpen}
          onClose={() => setIsQuickCreateOpen(false)}
          onSuccess={(newSupplier) => {
              setSuppliers(prev => [...prev, newSupplier]);
              setFormData(prev => ({ ...prev, fornecedor: `${newSupplier.razao_social} - ${newSupplier.cnpj}` }));
              setIsQuickCreateOpen(false);
          }}
      />
    </div>
  );
}
