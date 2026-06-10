import React, { useState, useEffect, useCallback } from 'react';
import { X, Upload, File as FileIcon, Loader2, Info, CheckCircle2, Package, MapPin, Clock, FileText, Send, User, ClipboardList } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { pcmService } from '../../services/pcmService';
import { formatInSystemTime } from '../../utils/dateUtils';
import { Modal } from '../ui/Modal';
import { ModalHeader } from '../ui/ModalHeader';
import { ModalFooter } from '../ui/ModalFooter';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { StatusBadge } from '../ui/StatusBadge';
import { IconButton } from '../ui/IconButton';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';
import { FileUpload } from '../ui/FileUpload';

interface PcmRequestModalProps {
  isOpen: boolean;
  onClose: (success?: boolean) => void;
  onSuccess: () => void;
  farms: any[];
  requestDataToEdit?: any;
}

export function PcmRequestModal({ isOpen, onClose, onSuccess, farms, requestDataToEdit }: PcmRequestModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [maquina, setMaquina] = useState('');
  const [prioridade, setPrioridade] = useState<'Normal' | 'Urgente'>('Normal');
  const [numRequisicao, setNumRequisicao] = useState('');
  const [obsPcm, setObsPcm] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [existingUrls, setExistingUrls] = useState<string[]>([]);

  const [selectedFarm, setSelectedFarm] = useState('');
  const [now] = useState(new Date().toISOString());

  useEffect(() => {
    if (isOpen) {
      if (requestDataToEdit) {
        setMaquina(requestDataToEdit.maquina || '');
        setPrioridade(requestDataToEdit.prioridade || 'Normal');
        setNumRequisicao(requestDataToEdit.num_requisicao || '');
        setObsPcm(requestDataToEdit.obs_pcm || '');
        setSelectedFarm(requestDataToEdit.fazenda_id || '');
        setFiles([]);
        
        let urls: string[] = [];
        if (requestDataToEdit.anexo_pcm_url) {
          try {
            urls = JSON.parse(requestDataToEdit.anexo_pcm_url);
            if (!Array.isArray(urls)) urls = [requestDataToEdit.anexo_pcm_url];
          } catch (e) {
            urls = [requestDataToEdit.anexo_pcm_url];
          }
        }
        setExistingUrls(urls);
      } else {
        // Nova Solicitação
        setMaquina('');
        setPrioridade('Normal');
        setNumRequisicao('');
        setObsPcm('');
        setFiles([]);
        setExistingUrls([]);
        
        // Default para a fazenda do usuário ou primeira da lista
        if (user?.fazenda_id) {
          setSelectedFarm(user.fazenda_id);
        } else if (farms.length > 0) {
          setSelectedFarm(farms[0].id);
        }
      }
    }
  }, [isOpen, requestDataToEdit, user, farms]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm) {
      toast.error('Selecione uma fazenda/unidade para a solicitação');
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        fazenda_id: selectedFarm,
        maquina,
        prioridade,
        num_requisicao: numRequisicao,
        obs_pcm: obsPcm,
        ...(requestDataToEdit && { anexo_pcm_url: JSON.stringify(existingUrls) })
      };

      if (requestDataToEdit) {
         await pcmService.updateRequest(requestDataToEdit.id, requestData, files.length > 0 ? files : undefined, user?.email ? { id: user.id, email: user.email } : undefined);
         toast.success('Solicitação atualizada com sucesso!');
      } else {
         await pcmService.createRequest(requestData, files.length > 0 ? files : undefined, user?.email ? { id: user.id, email: user.email } : undefined);
         toast.success('Solicitação criada com sucesso!');
      }

      onSuccess();
      onClose(true);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erro ao criar solicitação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Modal isOpen={isOpen} onClose={() => onClose(false)} size="lg" className="max-w-4xl max-h-[90vh] flex flex-col !rounded-2xl" closeOnOverlayClick={false}>
        <ModalHeader
          title={requestDataToEdit ? 'Editar Solicitação PCM' : 'Nova Solicitação PCM'}
          icon={Package}
          onClose={() => onClose(false)}
          eliteStyle
          statusBadge={
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">STATUS:</span>
              <StatusBadge status="RASCUNHO" variant="default" size="sm" />
            </div>
          }
        />

        {/* Body com Layout Vertical Focado */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          <div className="space-y-6">
            {/* Bloco 1: Contexto e Prioridade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Filial / Fazenda" required>
                <Select
                  value={selectedFarm}
                  onChange={(e) => setSelectedFarm(e.target.value)}
                  options={farms.map((f) => ({ value: f.id, label: f.nome }))}
                  placeholder="Selecione..."
                />
              </FormField>
              
              <FormField label="Prioridade">
                <div className="bg-slate-100 p-1 rounded-lg grid grid-cols-2 gap-1 h-[42px]">
                  <button
                    type="button"
                    onClick={() => setPrioridade('Normal')}
                    className={`py-1.5 text-xs font-bold rounded shadow-sm transition-all ${
                      prioridade === 'Normal' 
                        ? 'bg-white text-blue-600' 
                        : 'bg-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrioridade('Urgente')}
                    className={`py-1.5 text-xs font-bold rounded shadow-sm transition-all ${
                      prioridade === 'Urgente' 
                        ? 'bg-white text-red-600' 
                        : 'bg-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Urgente
                  </button>
                </div>
              </FormField>
            </div>

            {/* Bloco 2: Equipamento e Requisição */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Equipamento ou Máquina" required>
                <Input
                  type="text"
                  value={maquina}
                  onChange={(e) => setMaquina(e.target.value.toUpperCase())}
                  placeholder="Ex: TRATOR JOHN DEERE"
                />
              </FormField>

              <FormField label="Nº da Requisição (Unisistem)" required>
                <Input
                  type="text"
                  value={numRequisicao}
                  onChange={(e) => setNumRequisicao(e.target.value.toUpperCase())}
                  placeholder="Ex: 12345"
                  className="font-mono"
                />
              </FormField>
            </div>

            {/* Bloco 3: Observação em Destaque */}
            <FormField 
              label="Observação" 
              required 
              error={!obsPcm ? "Obrigatório para adicionar itens" : undefined}
            >
              <Textarea
                value={obsPcm}
                onChange={(e) => setObsPcm(e.target.value.toUpperCase())}
                placeholder="Descreva a aplicação ou motivo..."
                error={!obsPcm}
                className="min-h-[120px] uppercase bg-white"
              />
            </FormField>

            {/* Bloco 4: Anexos */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span className="text-blue-500 text-lg">+</span> DOCUMENTAÇÃO E ANEXOS (OBRIGATÓRIO)
              </div>
              <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200/60">
                <FileUpload 
                  files={files} 
                  onFilesChange={setFiles} 
                  existingUrls={existingUrls} 
                  onExistingUrlsChange={setExistingUrls} 
                  color="blue"
                  compact
                />
              </div>
            </div>
            
          </div>
        </div>

        <ModalFooter
          eliteStyle
          startActions={
            <Button variant="secondary" onClick={() => onClose(false)} disabled={loading}>
              Fechar / Cancelar
            </Button>
          }
          endActions={
            <Button
              variant="primary"
              icon={Send}
              isLoading={loading}
              onClick={handleSubmit}
              disabled={loading || !obsPcm || !maquina || !numRequisicao || (files.length === 0 && existingUrls.length === 0)}
            >
              {loading ? 'Enviando...' : 'Enviar Solicitação'}
            </Button>
          }
        />
      </Modal>
    </>
  );
}

