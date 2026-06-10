import React, { useState } from 'react';
import { Calendar, User, Building2, DollarSign, Percent, Paperclip, ExternalLink, Trash2, FileText, Edit } from 'lucide-react';
import { Saving, savingService } from '../../services/savingService';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../ui/Modal';
import { ModalHeader } from '../ui/ModalHeader';
import { ModalFooter } from '../ui/ModalFooter';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';

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
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void | Promise<void>;
  }>({ isOpen: false, title: '', description: '', onConfirm: () => {} });

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
    setConfirmDialog({
      isOpen: true,
      title: 'Excluir Registro',
      description: 'Tem certeza que deseja excluir este registro de saving? Esta ação não pode ser desfeita.',
      variant: 'danger',
      onConfirm: () => {
        if (onDelete) {
          onDelete(saving.id);
          onClose();
        }
      }
    });
  };

  const compradorName = saving.usuario?.nome || saving.comprador || 'Não informado';
  const compradorInitials = compradorName.substring(0, 2).toUpperCase();

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader
        title="Detalhes do Saving"
        subtitle={`Cotação #${saving.n_cotacao}`}
        icon={DollarSign}
        onClose={onClose}
      />

      <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar bg-slate-50/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            
            {/* Bloco 1: Informações Gerais */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                <User size={12} /> Informações Gerais
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Comprador Responsável</label>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                      {compradorInitials}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 leading-tight">{compradorName}</p>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mt-0.5">Comprador</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Data Negociação</label>
                    <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-600 text-sm font-medium flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400" />
                      {saving.data.split('T')[0].split('-').reverse().join('/')}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Criado em</label>
                    <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-600 text-sm font-medium">
                      {new Date(saving.created_at).toLocaleString('pt-BR').substring(0, 10)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco 2: Fornecedor */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                <Building2 size={12} /> Fornecedor
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Razão Social</label>
                  <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-800 text-sm font-bold">
                    {saving.fornecedor?.razao_social || 'N/A'}
                  </div>
                </div>
                {saving.fornecedor?.cnpj && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">CNPJ</label>
                    <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-600 text-sm font-medium font-mono">
                      {saving.fornecedor.cnpj}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            
            {/* Bloco 3: Valores da Negociação */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                <DollarSign size={12} /> Valores da Negociação
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 border-dashed">
                  <span className="text-xs font-bold text-slate-500">Valor Inicial</span>
                  <span className="text-sm font-bold text-slate-600">
                    {saving.valor_inicial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 border-dashed">
                  <span className="text-xs font-bold text-slate-500">Valor Final Fechado</span>
                  <span className="text-sm font-black text-slate-800">
                    {saving.valor_final.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total Economizado</span>
                  <span className="text-lg font-black text-blue-600">
                    {saving.saving.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Percent size={12} /> Desconto Aplicado
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-sm font-black">
                    {saving.desconto_percentual.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Bloco 4: Anexos */}
            {saving.anexos && saving.anexos.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                  <Paperclip size={12} /> Anexos da Negociação ({saving.anexos.length})
                </div>
                
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {saving.anexos.map((anexo, idx) => (
                    <button 
                      key={idx}
                      type="button"
                      onClick={() => handleDownloadAttachment(anexo.path, anexo.name)}
                      disabled={downloading === anexo.path}
                      className="w-full flex items-center gap-3 p-3 border rounded-xl transition-all group active:scale-95 shadow-sm bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100 text-left"
                    >
                      <div className="p-2 rounded-lg group-hover:scale-110 transition-transform bg-white text-blue-600 flex items-center justify-center shrink-0">
                        {downloading === anexo.path ? (
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <FileText size={16} />
                        )}
                      </div>
                      <span className="text-xs font-bold truncate flex-1" title={anexo.name}>
                        {anexo.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ModalFooter
        eliteStyle
        startActions={
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        }
        endActions={
          canEdit && (
            <>
              <Button variant="secondary" icon={Edit} onClick={() => { if (onEdit) { onEdit(saving); onClose(); } }}>
                Editar Registro
              </Button>
              <Button variant="danger" icon={Trash2} onClick={handleDelete}>
                Excluir Registro
              </Button>
            </>
          )
        }
      />
      </Modal>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
      />
    </>
  );
}
