import React, { useState } from 'react';
import { X, Calendar, User, Hash, Building2, DollarSign, Percent, Paperclip, Download, ExternalLink, Trash2, FileText, Edit } from 'lucide-react';
import { Saving, savingService } from '../../services/savingService';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

interface SavingDetailModalProps {
  saving: Saving | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onEdit?: (saving: Saving) => void;
}

export function SavingDetailModal({ saving, isOpen, onClose, onDelete, onEdit }: SavingDetailModalProps) {
  const { role } = useAuth();
  const [downloading, setDownloading] = useState<string | null>(null);

  if (!isOpen || !saving) return null;

  const canEdit =
    role?.nome === 'Administrador' ||
    role?.permissoes?.controle_saving?.edit_scope === 'ALL';

  const handleDownloadAttachment = async (path: string, name: string) => {
    try {
      setDownloading(path);
      const url = await savingService.getAttachmentUrl(path);
      if (url) {
        window.open(url, '_blank');
      } else {
        toast.error('Não foi possível gerar o link do anexo');
      }
    } catch (error) {
      console.error('Error downloading attachment:', error);
      toast.error('Erro ao abrir o anexo');
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Tem certeza que deseja excluir este registro de saving? Esta ação não pode ser desfeita.')) {
      if (onDelete) {
        onDelete(saving.id);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
              <DollarSign size={20} className="stroke-[2.5px]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Detalhes do Saving</h2>
              <p className="text-sm text-slate-500 font-medium">Cotação #{saving.n_cotacao}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <User size={14} /> Informações Gerais
                </h3>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-1">Comprador Responsável</p>
                    <p className="font-semibold text-slate-800">{saving.comprador}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-1">Data da Negociação</p>
                    <p className="font-semibold text-slate-800 flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400" />
                      {saving.data.split('T')[0].split('-').reverse().join('/')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-1">Data de Criação do Registro</p>
                    <p className="text-sm text-slate-600">
                      {new Date(saving.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <Building2 size={14} /> Fornecedor
                </h3>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-1">Razão Social</p>
                    <p className="font-semibold text-slate-800">{saving.fornecedor?.razao_social || 'N/A'}</p>
                  </div>
                  {saving.fornecedor?.cnpj && (
                    <div>
                      <p className="text-xs text-slate-500 font-medium mb-1">CNPJ</p>
                      <p className="font-medium text-slate-600">{saving.fornecedor.cnpj}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <DollarSign size={14} /> Valores da Negociação
                </h3>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-200 border-dashed">
                    <p className="text-sm text-slate-500 font-medium">Valor Inicial (Sem choro)</p>
                    <p className="font-semibold text-slate-600">
                      {saving.valor_inicial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-200 border-dashed">
                    <p className="text-sm text-slate-500 font-medium">Valor Final Fechado</p>
                    <p className="font-bold text-slate-800">
                      {saving.valor_final.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <p className="text-sm font-bold text-teal-700">Total Economizado (Saving)</p>
                    <p className="text-xl font-black text-teal-600">
                      {saving.saving.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <div className="flex justify-between items-center mt-2 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                    <p className="text-sm font-bold text-emerald-700 flex items-center gap-1">
                      <Percent size={14} /> Percentual de Desconto
                    </p>
                    <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-md font-bold">
                      {saving.desconto_percentual.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>

              {saving.anexos && saving.anexos.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    <Paperclip size={14} /> Anexos ({saving.anexos.length})
                  </h3>
                  <div className="space-y-2">
                    {saving.anexos.map((anexo, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors group"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                            <FileText size={16} className="text-teal-600" />
                          </div>
                          <span className="text-sm font-medium text-slate-700 truncate" title={anexo.name}>
                            {anexo.name}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDownloadAttachment(anexo.path, anexo.name)}
                          disabled={downloading === anexo.path}
                          className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors flex-shrink-0"
                          title="Visualizar anexo"
                        >
                          {downloading === anexo.path ? (
                            <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <ExternalLink size={18} />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          <div className="flex gap-2">
            {canEdit && (
              <>
                <button
                  onClick={() => {
                    if (onEdit) {
                      onEdit(saving);
                      onClose();
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg font-medium transition-colors border border-teal-100"
                >
                  <Edit size={16} />
                  Editar Registro
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-medium transition-colors border border-red-100"
                >
                  <Trash2 size={16} />
                  Excluir Registro
                </button>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
