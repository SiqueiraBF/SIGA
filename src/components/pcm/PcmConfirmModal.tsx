import React, { useState, useEffect, useCallback } from 'react';
import { X, Upload, File as FileIcon, Loader2, Info, CheckCircle2, Package, MapPin, Clock, FileText, Send, User, ClipboardList } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { pcmService, PcmRequest } from '../../services/pcmService';
import { formatInSystemTime } from '../../utils/dateUtils';
import { differenceInMinutes } from 'date-fns';
import { Modal } from '../ui/Modal';
import { ModalHeader } from '../ui/ModalHeader';
import { ModalFooter } from '../ui/ModalFooter';
import toast from 'react-hot-toast';
import { FileUpload } from '../ui/FileUpload';
import { FileList } from '../ui/FileList';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';

interface PcmConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  request: PcmRequest | null;
}

export function PcmConfirmModal({ isOpen, onClose, onSuccess, request }: PcmConfirmModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [numSc, setNumSc] = useState('');
  const [obsAlmox, setObsAlmox] = useState('');
  const [files, setFiles] = useState<File[]>([]);

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

  if (!isOpen || !request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await pcmService.confirmRequest(request.id, {
        sc_numero: numSc,
        obs_almox: obsAlmox
      }, files.length > 0 ? files : undefined, user?.email ? { id: user.id, email: user.email } : undefined);

      toast.success('Solicitação confirmada e SC gerada com sucesso!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erro ao confirmar solicitação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="lg" className="max-w-4xl max-h-[90vh] flex flex-col !rounded-2xl">
        <ModalHeader 
          title="Confirmação Almoxarifado"
          icon={Package}
          onClose={onClose}
          iconClassName="text-emerald-600 bg-emerald-50 border-emerald-100"
          subtitle={
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-emerald-600/60">STATUS:</span>
              <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-600">AGUARDANDO SC</span>
            </div>
          }
        />

        {/* Body com Layout Ficha Vertical e Cards */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          <div className="max-w-3xl mx-auto space-y-6">
            
            {/* Topo: Histórico com os dados originais */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                <ClipboardList size={12} /> Detalhes Originais
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

            {/* Alerta de Tempo */}
            {(() => {
              const start = new Date(request.created_at || new Date());
              const diffMins = differenceInMinutes(new Date(), start);
              const hours = Math.floor(diffMins / 60);
              const mins = diffMins % 60;
              const timeText = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
              const isDelayed = hours >= 4; 
              
              return (
                <div className={`flex items-center gap-3 p-4 rounded-xl border shadow-sm ${isDelayed ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                  <Clock size={20} className={isDelayed ? 'text-amber-500 animate-pulse' : 'text-slate-400'} />
                  <div className="text-sm font-medium">
                    Esta requisição aguarda a geração da SC há <strong className="font-bold">{timeText}</strong>
                  </div>
                </div>
              );
            })()}

            {/* Rodapé/Base: Inputs de Ação */}
            <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">
                <span className="text-emerald-500 text-lg">+</span> INFORMAÇÕES DA SC (UNISISTEM)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Número da SC Gerada" required>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={numSc}
                    onChange={(e) => setNumSc(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ex: 88721"
                    className="font-mono"
                  />
                </FormField>
              </div>

              <FormField label="Observações Almoxarifado">
                <Textarea
                  value={obsAlmox}
                  onChange={(e) => setObsAlmox(e.target.value.toUpperCase())}
                  placeholder="Alguma divergência ou informação para compras?"
                  className="min-h-[80px]"
                />
              </FormField>

              <div className="pt-2">
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">
                  <span className="text-emerald-500 text-lg">+</span> COMPROVANTE / ANEXO (OBRIGATÓRIO)
                </div>
                <FileUpload files={files} onFilesChange={setFiles} color="emerald" compact />
              </div>
            </div>
            
          </div>
        </div>

        {/* Footer Padronizado */}
        <ModalFooter className="justify-between bg-white border-t border-slate-200 shadow-inner">
          <Button 
            variant="secondary"
            onClick={onClose} 
            disabled={loading} 
          >
            Fechar / Cancelar
          </Button>
          
          <div className="flex gap-3">
            <Button
              variant="success"
              onClick={handleSubmit}
              icon={CheckCircle2}
              isLoading={loading}
              disabled={loading || !numSc || files.length === 0}
            >
              Confirmar e Enviar
            </Button>
          </div>
        </ModalFooter>
      </Modal>
    </>
  );
}
