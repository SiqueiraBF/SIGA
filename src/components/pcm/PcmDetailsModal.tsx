import React from 'react';
import { X, File as FileIcon, Package, MapPin, Clock, FileText, User, ClipboardList, CheckCircle2, Pencil, XCircle, Trash2 } from 'lucide-react';
import { PcmRequest } from '../../services/pcmService';
import { formatInSystemTime } from '../../utils/dateUtils';
import { differenceInMinutes } from 'date-fns';
import { Modal } from '../ui/Modal';
import { ModalHeader } from '../ui/ModalHeader';
import { ModalFooter } from '../ui/ModalFooter';
import { FileList } from '../ui/FileList';
import { Button } from '../ui/Button';

interface PcmDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: PcmRequest | null;
  onEdit?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onConfirm?: () => void;
}

export function PcmDetailsModal({ isOpen, onClose, request, onEdit, onCancel, onDelete, onConfirm }: PcmDetailsModalProps) {
  if (!isOpen || !request) return null;

  const parseUrls = (urlStr: string | undefined): string[] => {
    if (!urlStr) return [];
    try {
      const parsed = JSON.parse(urlStr);
      return Array.isArray(parsed) ? parsed : [urlStr];
    } catch {
      return [urlStr];
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_ALMOXARIFADO':
        return { text: 'AGUARDANDO SC', colorClass: 'text-amber-600', labelClass: 'text-amber-600/60' };
      case 'COMPLETED':
        return { text: 'FINALIZADO', colorClass: 'text-emerald-600', labelClass: 'text-emerald-600/60' };
      case 'CANCELLED':
        return { text: 'CANCELADO', colorClass: 'text-red-600', labelClass: 'text-red-600/60' };
      default:
        return { text: status, colorClass: 'text-slate-600', labelClass: 'text-slate-400' };
    }
  };
  const statusConfig = getStatusBadge(request.status);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="lg" className="max-w-4xl max-h-[90vh] flex flex-col !rounded-2xl">
        <ModalHeader 
          title="Detalhes da Solicitação"
          icon={ClipboardList}
          onClose={onClose}
          iconClassName="text-blue-600 bg-blue-50 border-blue-100"
          subtitle={
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${statusConfig.labelClass}`}>STATUS:</span>
              <span className={`text-[11px] font-bold uppercase tracking-wide ${statusConfig.colorClass}`}>{statusConfig.text}</span>
            </div>
          }
        />

        {/* Body com Layout Ficha Vertical */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          <div className="space-y-6">
            
            {/* Bloco 1 (Criador/PCM) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                <User size={12} /> Dados da Solicitação
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Data Solicitação</label>
                  <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-600 text-sm font-medium">
                    {formatInSystemTime(new Date(request.created_at || ''))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Solicitante PCM</label>
                  <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-600 text-sm font-medium">
                    {request.usuario?.nome || 'N/A'}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Unidade / Fazenda</label>
                  <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-600 text-sm font-medium">
                    {request.fazenda?.nome || 'N/A'}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Equipamento</label>
                  <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-600 text-sm font-medium">
                    {request.maquina}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Requisição PCM</label>
                  <div className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-700 text-sm font-mono font-bold">
                    #{request.num_requisicao}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Prioridade</label>
                  <div className="flex items-center px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg h-[38px]">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      request.prioridade === 'Urgente' ? 'bg-red-50 text-red-500 border-red-200' : 'bg-white text-slate-500 border-slate-200'
                    }`}>
                      {request.prioridade}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Observação PCM</label>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-slate-600 text-xs italic leading-relaxed">
                  "{request.obs_pcm || 'Sem observações.'}"
                </div>
              </div>

              {request.anexo_pcm_url && (
                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Anexos Originais do PCM</label>
                  <FileList urls={parseUrls(request.anexo_pcm_url)} color="blue" labelPrefix="Documento PCM" />
                </div>
              )}
            </div>

            {/* Cancelamento se houver */}
            {request.status === 'CANCELLED' && request.motivo_cancelamento && (
              <div className="bg-red-50 p-6 rounded-2xl border border-red-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-red-800 uppercase tracking-widest mb-2">
                  <XCircle size={12} /> Motivo do Cancelamento
                </div>
                <div className="p-3 bg-white border border-red-100 rounded-lg text-red-800 text-xs italic leading-relaxed">
                  {request.motivo_cancelamento}
                </div>
              </div>
            )}

            {/* Bloco 2 (Almoxarifado/SC) */}
            {(request.data_confirmacao || request.status === 'COMPLETED') && (
              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-4">
                  <Package size={12} /> Confirmação Almoxarifado
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-emerald-800/70 mb-1.5 ml-1">Número da SC</label>
                    <div className="px-4 py-2 bg-white border border-emerald-200 rounded-lg text-emerald-800 text-sm font-mono font-bold">
                      #{request.sc_numero}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-800/70 mb-1.5 ml-1">Confirmado em</label>
                    <div className="px-4 py-2 bg-white border border-emerald-200 rounded-lg text-emerald-800 text-sm font-medium">
                      {formatInSystemTime(new Date(request.data_confirmacao || request.created_at))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-800/70 mb-1.5 ml-1">SLA Atendimento</label>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-emerald-200 rounded-lg text-emerald-800 text-sm font-bold shadow-sm h-[38px]">
                      <Clock size={14} className="text-emerald-500/70"/>
                      {(() => {
                          const start = new Date(request.created_at);
                          const end = new Date(request.data_confirmacao || request.created_at);
                          const diffMins = differenceInMinutes(end, start);
                          const hours = Math.floor(diffMins / 60);
                          const mins = diffMins % 60;
                          return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
                      })()}
                    </div>
                  </div>
                </div>

                {request.obs_almox && (
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-emerald-800/70 mb-1.5 ml-1">Observações Almoxarifado</label>
                    <div className="p-3 bg-white border border-emerald-200 rounded-lg text-emerald-800 text-xs italic leading-relaxed">
                      "{request.obs_almox}"
                    </div>
                  </div>
                )}

                {request.anexo_almox_url && (
                  <div className="pt-4 border-t border-emerald-200/50">
                    <label className="block text-[10px] font-bold text-emerald-800/70 uppercase tracking-widest mb-2 ml-1">Comprovantes SC</label>
                    <FileList urls={parseUrls(request.anexo_almox_url)} color="emerald" labelPrefix="Comprovante SC" />
                  </div>
                )}
              </div>
            )}
            
          </div>
        </div>

        {/* Footer */}
        <ModalFooter className="justify-between bg-white border-t border-slate-200 shadow-inner">
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {request.status === 'PENDING_ALMOXARIFADO' && onEdit && (
              <Button variant="secondary" onClick={onEdit} icon={Pencil}>
                Editar
              </Button>
            )}
            {request.status === 'PENDING_ALMOXARIFADO' && onCancel && (
              <Button variant="danger" onClick={onCancel} icon={XCircle}>
                Cancelar Requisição
              </Button>
            )}
            {request.status === 'PENDING_ALMOXARIFADO' && onConfirm && (
              <Button variant="success" onClick={onConfirm} icon={CheckCircle2}>
                Confirmar SC
              </Button>
            )}
            {onDelete && (
              <Button variant="danger" onClick={onDelete} icon={Trash2}>
                Excluir
              </Button>
            )}
          </div>
        </ModalFooter>
      </Modal>
    </>
  );
}
