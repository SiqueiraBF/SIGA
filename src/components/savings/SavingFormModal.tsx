import React, { useState, useEffect } from 'react';
import { Save, FileText, DollarSign, Building2, Paperclip, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { savingService, Saving } from '../../services/savingService';
import { supplierService } from '../../services/supplierService';
import { SupplierFormModal } from '../suppliers/SupplierFormModal';
import { Supplier } from '../../types';
import { Modal } from '../ui/Modal';
import { ModalHeader } from '../ui/ModalHeader';
import { ModalFooter } from '../ui/ModalFooter';
import { FormField } from '../ui/FormField';
import toast from 'react-hot-toast';
import { FileUpload } from '../ui/FileUpload';
import { StatusBadge } from '../ui/StatusBadge';
import { Button } from '../ui/Button';

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
    n_cotacao: '',
    fornecedor_id: '',
    fornecedor_search: '',
    valor_inicial: '',
    valor_final: '',
  });

  const [attachments, setAttachments] = useState<File[]>([]);
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<{name: string, path: string, url: string}[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadSuppliers();
      if (initialData) {
        setFormData({
          data: initialData.data.split('T')[0],
          n_cotacao: initialData.n_cotacao,
          fornecedor_id: initialData.fornecedor_id,
          fornecedor_search: initialData.fornecedor?.razao_social 
            ? `${initialData.fornecedor.razao_social.toUpperCase()} - ${initialData.fornecedor.cnpj}` 
            : '',
          valor_inicial: formatCurrency(initialData.valor_inicial),
          valor_final: formatCurrency(initialData.valor_final),
        });

        if (initialData.anexos && initialData.anexos.length > 0) {
          const loadUrls = async () => {
            const mapped = await Promise.all(
              initialData.anexos.map(async (anexo) => {
                const url = await savingService.getAttachmentUrl(anexo.path);
                return { ...anexo, url };
              })
            );
            setExistingAttachments(mapped);
            setExistingUrls(mapped.map(m => m.url));
          };
          loadUrls();
        } else {
          setExistingAttachments([]);
          setExistingUrls([]);
        }
      } else {
        setFormData(prev => ({
          ...prev,
          data: new Date().toISOString().split('T')[0]
        }));
        setExistingAttachments([]);
        setExistingUrls([]);
      }
    } else {
      // Reset
      setFormData({
        data: new Date().toISOString().split('T')[0],
        n_cotacao: '',
        fornecedor_id: '',
        fornecedor_search: '',
        valor_inicial: '',
        valor_final: '',
      });
      setAttachments([]);
      setExistingAttachments([]);
      setExistingUrls([]);
    }
  }, [isOpen, initialData]);

  const loadSuppliers = async () => {
    try {
      const data = await supplierService.getActive();
      setSuppliers(data);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar fornecedores');
    }
  };

  const formatCurrency = (value: string | number) => {
    if (value === '' || value === null || value === undefined) return '';
    let stringValue = String(value);
    
    // Ensures floats from DB have 2 decimal places before stripping non-digits
    if (typeof value === 'number') {
      stringValue = value.toFixed(2);
    }

    const numericValue = stringValue.replace(/\D/g, '');
    if (!numericValue) return '';
    
    const number = Number(numericValue) / 100;
    return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: formatCurrency(value) }));
  };

  const handleExistingUrlsChange = (urls: string[]) => {
    setExistingUrls(urls);
    setExistingAttachments(prev => prev.filter(att => urls.includes(att.url)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.data || !formData.n_cotacao || !formData.fornecedor_id || !formData.valor_inicial || !formData.valor_final) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);

    try {
      const valor_inicial = Number(formData.valor_inicial.toString().replace(/\./g, '').replace(',', '.'));
      const valor_final = Number(formData.valor_final.toString().replace(/\./g, '').replace(',', '.'));

      if (valor_final > valor_inicial) {
        toast.error('O valor final não pode ser maior que o valor inicial.');
        setLoading(false);
        return;
      }

      if (initialData) {
        await savingService.update(initialData.id, {
          data: formData.data,
          comprador: initialData.comprador,
          n_cotacao: formData.n_cotacao.toUpperCase().trim(),
          fornecedor_id: formData.fornecedor_id,
          valor_inicial,
          valor_final
        }, attachments, existingAttachments.map(a => ({ name: a.name, path: a.path })));
        toast.success('Saving atualizado com sucesso!');
      } else {
        await savingService.create({
          data: formData.data,
          comprador: user?.nome || '',
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
  const calcValorInicial = Number(formData.valor_inicial.toString().replace(/\./g, '').replace(',', '.') || 0);
  const calcValorFinal = Number(formData.valor_final.toString().replace(/\./g, '').replace(',', '.') || 0);
  const savingReal = calcValorInicial > 0 ? calcValorInicial - calcValorFinal : 0;
  const descontoPercent = calcValorInicial > 0 ? (savingReal / calcValorInicial) * 100 : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader
        title={initialData ? 'Editar Registro de Saving' : 'Novo Registro de Saving'}
        subtitle="Documente as negociações do setor de suprimentos."
        icon={DollarSign}
        onClose={onClose}
        eliteStyle
        statusBadge={
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">STATUS:</span>
            <StatusBadge status={initialData ? 'EDITANDO' : 'NOVO REGISTRO'} variant="default" size="sm" />
          </div>
        }
      />

      <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar bg-slate-50/50">
        <form id="saving-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Data da Negociação" required>
              <input
                type="date"
                name="data"
                value={formData.data}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
              />
            </FormField>

            <FormField label="Nº da Cotação" required>
              <input
                type="text"
                name="n_cotacao"
                value={formData.n_cotacao}
                onChange={handleChange}
                placeholder="Ex: 2030"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase placeholder:normal-case"
                required
              />
            </FormField>
          </div>

          <FormField 
            label="Fornecedor" 
            required
            actionRight={
              <button 
                type="button" 
                onClick={(e) => { e.preventDefault(); setIsQuickCreateOpen(true); }}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline"
              >
                + Cadastrar Novo
              </button>
            }
          >
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
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase placeholder:normal-case"
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
                                  className="px-4 py-2 cursor-pointer hover:bg-blue-50 border-b border-slate-50 last:border-0"
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
          </FormField>

          {/* Valores Negociados */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <DollarSign size={16} className="text-blue-600" />
              Valores e Cálculo de Saving
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Valor Inicial (R$)" required>
                <input
                  type="text"
                  inputMode="numeric"
                  name="valor_inicial"
                  value={formData.valor_inicial}
                  onChange={handleCurrencyChange}
                  placeholder="0,00"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  required
                />
              </FormField>
              <FormField label="Valor Final Negociado (R$)" required>
                <input
                  type="text"
                  inputMode="numeric"
                  name="valor_final"
                  value={formData.valor_final}
                  onChange={handleCurrencyChange}
                  placeholder="0,00"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  required
                />
              </FormField>
            </div>
            
            {/* Display de Resultado */}
            {calcValorInicial > 0 && calcValorFinal > 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-blue-800 mb-1">Saving Gerado</p>
                  <p className="text-xl font-black text-blue-700">
                    {savingReal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-blue-800 mb-1">Desconto</p>
                  <div className="inline-flex items-center gap-1 px-3 py-1 bg-white text-blue-700 rounded-lg font-bold border border-blue-200">
                    {descontoPercent.toFixed(2)}%
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Anexos */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Paperclip size={16} className="text-blue-600" />
              Anexos (Comprovação da Cotação)
            </h3>
            <FileUpload 
              files={attachments} 
              onFilesChange={setAttachments} 
              existingUrls={existingUrls}
              onExistingUrlsChange={handleExistingUrlsChange}
              compact 
            />
          </div>
        </form>
      </div>

      <ModalFooter
        eliteStyle
        startActions={
          <Button variant="secondary" type="button" onClick={onClose}>
            Fechar / Cancelar
          </Button>
        }
        endActions={
          <Button
            type="submit"
            form="saving-form"
            variant="primary"
            icon={Save}
            isLoading={loading}
            disabled={loading}
          >
            Salvar Registro
          </Button>
        }
      />

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
    </Modal>
  );
}
