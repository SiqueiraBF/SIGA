import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, FileText, Calendar, DollarSign, Building2, User, Paperclip, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { savingService, Saving } from '../../services/savingService';
import { supplierService } from '../../services/supplierService';
import { SupplierFormModal } from '../suppliers/SupplierFormModal';
import { Supplier } from '../../types';
import toast from 'react-hot-toast';

interface SavingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Saving | null;
}

export function SavingFormModal({ isOpen, onClose, onSuccess, initialData }: SavingFormModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Fornecedor State
  const [supplierSearchOptionsOpen, setSupplierSearchOptionsOpen] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    comprador: user?.nome || '',
    n_cotacao: '',
    fornecedor_id: '',
    fornecedor_search: '',
    valor_inicial: '',
    valor_final: '',
  });

  const [attachments, setAttachments] = useState<File[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadSuppliers();
      if (initialData) {
        setFormData({
          data: initialData.data.split('T')[0],
          comprador: initialData.comprador,
          n_cotacao: initialData.n_cotacao,
          fornecedor_id: initialData.fornecedor_id,
          fornecedor_search: initialData.fornecedor?.razao_social 
            ? `${initialData.fornecedor.razao_social.toUpperCase()} - ${initialData.fornecedor.cnpj}` 
            : '',
          valor_inicial: initialData.valor_inicial.toString(),
          valor_final: initialData.valor_final.toString(),
        });
      } else {
        setFormData(prev => ({
          ...prev,
          comprador: user?.nome || '',
          data: new Date().toISOString().split('T')[0]
        }));
      }
    } else {
      // Reset
      setFormData({
        data: new Date().toISOString().split('T')[0],
        comprador: '',
        n_cotacao: '',
        fornecedor_id: '',
        fornecedor_search: '',
        valor_inicial: '',
        valor_final: '',
      });
      setAttachments([]);
    }
  }, [isOpen, user]);

  const loadSuppliers = async () => {
    try {
      const data = await supplierService.getActive();
      setSuppliers(data);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar fornecedores');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.data || !formData.comprador || !formData.n_cotacao || !formData.fornecedor_id || !formData.valor_inicial || !formData.valor_final) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);

    try {
      const valor_inicial = Number(formData.valor_inicial.replace(',', '.'));
      const valor_final = Number(formData.valor_final.replace(',', '.'));

      if (valor_final > valor_inicial) {
        toast.error('O valor final não pode ser maior que o valor inicial.');
        setLoading(false);
        return;
      }

      const normalizeBuyerName = (name: string) => {
        const upperName = name.trim().toUpperCase();
        if (upperName.startsWith('ENIO CARLOS')) return 'ENIO CARLOS NASCIMENTO';
        if (upperName.startsWith('LUCIANA SILVA')) return 'LUCIANA SILVA COSTA';
        if (upperName.startsWith('MAURICIO FIOR')) return 'MAURICIO FIOR GUTSTEIN';
        if (upperName.startsWith('RAIMUNDA MARQU')) return 'RAIMUNDA MARQUES SOUSA';
        return upperName;
      };

      const finalComprador = normalizeBuyerName(formData.comprador);

      if (initialData) {
        await savingService.update(initialData.id, {
          data: formData.data,
          comprador: finalComprador,
          n_cotacao: formData.n_cotacao.toUpperCase().trim(),
          fornecedor_id: formData.fornecedor_id,
          valor_inicial,
          valor_final
        }, attachments);
        toast.success('Saving atualizado com sucesso!');
      } else {
        await savingService.create({
          data: formData.data,
          comprador: finalComprador,
          n_cotacao: formData.n_cotacao.toUpperCase().trim(),
          fornecedor_id: formData.fornecedor_id,
          valor_inicial,
          valor_final,
          created_by: user?.id
        }, attachments);
        toast.success('Saving registrado com sucesso!');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erro ao registrar saving');
    } finally {
      setLoading(false);
    }
  };

  // Preview de calculos
  const calcValorInicial = Number(formData.valor_inicial.replace(',', '.') || 0);
  const calcValorFinal = Number(formData.valor_final.replace(',', '.') || 0);
  const savingReal = calcValorInicial > 0 ? calcValorInicial - calcValorFinal : 0;
  const descontoPercent = calcValorInicial > 0 ? (savingReal / calcValorInicial) * 100 : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 border border-white/20">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between z-10 sticky top-0 bg-white/80 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center border border-teal-100 shadow-sm">
              <DollarSign size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{initialData ? 'Editar Registro de Saving' : 'Novo Registro de Saving'}</h2>
              <p className="text-sm text-slate-500">Documente as negociações do setor de suprimentos.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-slate-50/50">
          <form id="saving-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Data e Comprador */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Data da Negociação *</label>
                  <input
                    type="date"
                    name="data"
                    value={formData.data}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Comprador *</label>
                  <input
                    type="text"
                    name="comprador"
                    value={formData.comprador}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all uppercase placeholder:normal-case"
                    required
                  />
                </div>
              </div>

              {/* Cotação e Fornecedor */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Nº da Cotação *</label>
                  <input
                    type="text"
                    name="n_cotacao"
                    value={formData.n_cotacao}
                    onChange={handleChange}
                    placeholder="Ex: 2030"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all uppercase placeholder:normal-case"
                    required
                  />
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
                      name="fornecedor_search"
                      value={formData.fornecedor_search}
                      onChange={(e) => {
                          handleChange(e);
                          setFormData(prev => ({ ...prev, fornecedor_id: '' })); // clear ID on manual edit
                          setSupplierSearchOptionsOpen(true);
                      }}
                      onFocus={() => setSupplierSearchOptionsOpen(true)}
                      onBlur={() => setTimeout(() => setSupplierSearchOptionsOpen(false), 200)}
                      autoComplete="off"
                      placeholder="Buscar Razão Social ou CNPJ..."
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all uppercase placeholder:normal-case"
                      required
                    />
                    {supplierSearchOptionsOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            {suppliers.filter(s => {
                                const searchTxt = formData.fornecedor_search.toLowerCase();
                                const searchNumbers = searchTxt.replace(/\D/g, '');
                                const cnpjNumbers = s.cnpj.replace(/\D/g, '');
                                
                                return s.razao_social.toLowerCase().includes(searchTxt) || 
                                       (searchNumbers && cnpjNumbers.includes(searchNumbers)) ||
                                       s.cnpj.includes(searchTxt);
                            }).length === 0 ? (
                                <div className="p-3 text-sm text-slate-500 text-center">Nenhum fornecedor encontrado.</div>
                            ) : (
                                suppliers.filter(s => {
                                    const searchTxt = formData.fornecedor_search.toLowerCase();
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
                                            setFormData(prev => ({ 
                                              ...prev, 
                                              fornecedor_search: `${s.razao_social.toUpperCase()} - ${s.cnpj}`,
                                              fornecedor_id: s.id
                                            }));
                                            setSupplierSearchOptionsOpen(false);
                                        }}
                                    >
                                        <div className="text-sm font-bold text-slate-700">{s.razao_social?.toUpperCase()}</div>
                                        <div className="text-xs text-slate-500 font-mono">{s.cnpj}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Valores Negociados */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <DollarSign size={16} className="text-teal-600" />
                Valores e Cálculo de Saving
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Valor Inicial (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="valor_inicial"
                    value={formData.valor_inicial}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Valor Final Negociado (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="valor_final"
                    value={formData.valor_final}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                    required
                  />
                </div>
              </div>
              
              {/* Display de Resultado */}
              {calcValorInicial > 0 && calcValorFinal > 0 && (
                <div className="mt-4 p-4 bg-teal-50 rounded-xl border border-teal-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-teal-800 mb-1">Saving Gerado</p>
                    <p className="text-xl font-black text-teal-700">
                      {savingReal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-teal-800 mb-1">Desconto</p>
                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-white text-teal-700 rounded-lg font-bold border border-teal-200">
                      {descontoPercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Anexos */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Paperclip size={16} className="text-teal-600" />
                Anexos (Comprovação da Cotação)
              </h3>
              <div className="space-y-4">
                <div className="flex flex-col items-start gap-2">
                  <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors text-sm font-medium">
                    <Paperclip size={16} />
                    Selecionar Arquivos
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv"
                    />
                  </label>
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
            form="saving-form"
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
              setFormData(prev => ({ 
                ...prev, 
                fornecedor_search: `${newSupplier.razao_social.toUpperCase()} - ${newSupplier.cnpj}`,
                fornecedor_id: newSupplier.id
              }));
              setIsQuickCreateOpen(false);
          }}
      />
    </div>
  );
}
