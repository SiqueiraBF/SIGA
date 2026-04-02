import React, { useState, useEffect, useCallback } from 'react';
import { X, Upload, File as FileIcon, Loader2, Info, CheckCircle2, Package, MapPin, Clock, FileText, Send, User, ClipboardList } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { pcmService } from '../../services/pcmService';
import { formatInSystemTime } from '../../utils/dateUtils';
import toast from 'react-hot-toast';

interface PcmRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        setFile(e.clipboardData.files[0]);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  }, []);

  const [selectedFarm, setSelectedFarm] = useState('');
  const [now] = useState(new Date().toISOString());

  // Default para a fazenda do usuário se disponível
  React.useEffect(() => {
    if (isOpen && user?.fazenda_id) {
      setSelectedFarm(user.fazenda_id);
    } else if (isOpen && farms.length > 0) {
      setSelectedFarm(farms[0].id);
    }
  }, [isOpen, user, farms]);

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
        obs_pcm: obsPcm
      };

      if (requestDataToEdit) {
         await pcmService.updateRequest(requestDataToEdit.id, requestData, file || undefined, user?.email ? { id: user.id, email: user.email } : undefined);
         toast.success('Solicitação atualizada com sucesso!');
      } else {
         await pcmService.createRequest(requestData, file || undefined, user?.email ? { id: user.id, email: user.email } : undefined);
         toast.success('Solicitação criada com sucesso!');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erro ao criar solicitação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[1100px] h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
        
        {/* Header Padronizado */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl flex items-center justify-center bg-slate-100 text-slate-600 transition-colors shadow-sm border border-slate-200/50">
              <Package size={32} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{requestDataToEdit ? 'Editar Solicitação PCM' : 'Nova Solicitação PCM'}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">STATUS:</span>
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">RASCUNHO</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body com Split Layout */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Sidebar Esquerda (Contexto) */}
          <div className="w-[340px] shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                <FileText size={12} /> Contexto
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Data Abertura</label>
                  <input
                    type="text"
                    value={formatInSystemTime(now)}
                    disabled
                    className="w-full px-4 py-2.5 bg-slate-100 border border-transparent rounded-lg text-slate-600 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Solicitante</label>
                  <input
                    type="text"
                    value={user?.nome || 'Usuário'}
                    disabled
                    className="w-full px-4 py-2.5 bg-slate-100 border border-transparent rounded-lg text-slate-600 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Filial</label>
                  <select
                    value={selectedFarm}
                    onChange={(e) => setSelectedFarm(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="" disabled>Selecione...</option>
                    {farms.map((f) => (
                      <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 font-bold">Prioridade</label>
                  <div className="bg-slate-100 p-1 rounded-lg grid grid-cols-2 gap-1">
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
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Observação <span className="text-red-500">*</span></label>
                  <textarea
                    value={obsPcm}
                    onChange={(e) => setObsPcm(e.target.value)}
                    placeholder="Obrigatório para adicionar itens"
                    className={`w-full px-4 py-3 bg-white border rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 min-h-[120px] resize-none ${
                      !obsPcm ? 'border-red-300 ring-1 ring-red-100 placeholder:text-red-300' : 'border-slate-200'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Área Principal Direita */}
          <div className="flex-1 overflow-y-auto p-8 bg-white/50">
            <div className="space-y-8">
              
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span className="text-blue-500 text-lg">+</span> DADOS DO EQUIPAMENTO
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1 uppercase">MÁQUINA / EQUIPAMENTO *</label>
                    <input
                      type="text"
                      value={maquina}
                      onChange={(e) => setMaquina(e.target.value)}
                      placeholder="Nome do equipamento"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1 uppercase">NÚMERO DA REQUISIÇÃO *</label>
                    <input
                      type="text"
                      value={numRequisicao}
                      onChange={(e) => setNumRequisicao(e.target.value)}
                      placeholder="-"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span className="text-emerald-500 text-lg">+</span> DOCUMENTAÇÃO E ANEXOS
                </div>

                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex justify-center px-6 pt-10 pb-10 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/50 scale-[1.02]' 
                    : file 
                      ? 'border-blue-200 bg-blue-50/20' 
                      : 'border-slate-200 bg-slate-50 hover:border-blue-300'
                }`}>
                  <div className="space-y-2 text-center">
                    {file ? (
                      <div className="flex flex-col items-center">
                        <div 
                          className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-2 cursor-pointer hover:bg-blue-200 transition-all shadow-sm active:scale-95"
                          onClick={(e) => { e.stopPropagation(); if (file) setPreviewUrl(URL.createObjectURL(file)); }}
                          title="Visualizar anexo"
                        >
                           <FileIcon size={24} />
                        </div>
                        <p 
                          className="text-sm font-bold text-slate-700 cursor-pointer hover:text-blue-600 hover:underline transition-colors"
                          onClick={(e) => { e.stopPropagation(); if (file) setPreviewUrl(URL.createObjectURL(file)); }}
                          title="Visualizar anexo"
                        >
                          {file.name}
                        </p>
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); setFile(null); }} 
                          className="mt-2 text-xs text-red-500 font-bold uppercase tracking-wider hover:text-red-600 transition-colors"
                        >
                          Remover
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto h-12 w-12 text-slate-300" />
                        <div className="flex flex-col gap-1 items-center">
                          <label htmlFor="file-upload" className="relative cursor-pointer font-bold text-blue-600 hover:text-blue-700">
                            <span className="text-base block text-center">Clique, cole, ou arraste um arquivo</span>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                          </label>
                          <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">PDF, PNG, JPG até 10MB</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Padronizado */}
        <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <button 
            type="button" 
            onClick={onClose} 
            disabled={loading} 
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Fechar / Cancelar
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={loading || !obsPcm || !maquina || !numRequisicao}
              className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 disabled:opacity-50 disabled:active:scale-100"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              {loading ? 'Enviando...' : 'Enviar Cadastro'}
            </button>
          </div>
        </div>
      </div>

      {previewUrl && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200" onClick={() => setPreviewUrl(null)}>
          <button className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors" onClick={() => setPreviewUrl(null)}>
            <X size={24} />
          </button>
          
          {file?.type.startsWith('image/') ? (
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()} />
          ) : file?.type === 'application/pdf' ? (
            <div className="w-full max-w-5xl h-[85vh] bg-slate-100 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
              <iframe src={previewUrl} className="w-full h-full border-0" />
            </div>
          ) : (
            <div className="bg-white p-8 rounded-3xl flex flex-col items-center max-w-sm text-center shadow-2xl animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
              <div className="w-20 h-20 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-6">
                 <FileIcon size={40} />
              </div>
              <p className="text-lg font-bold text-slate-800 mb-2">Visualização Indisponível</p>
              <p className="text-sm text-slate-500">Este tipo de arquivo não pode ser pré-visualizado diretamente no navegador.</p>
              <button onClick={() => window.open(previewUrl, '_blank')} className="mt-8 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/25 active:scale-95 transition-all">
                Baixar ou Abrir em Nova Guia
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

