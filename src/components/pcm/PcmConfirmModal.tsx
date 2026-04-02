import React, { useState, useEffect, useCallback } from 'react';
import { X, Upload, File as FileIcon, Loader2, Info, CheckCircle2, Package, MapPin, Clock, FileText, Send, User, ClipboardList } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { pcmService, PcmRequest } from '../../services/pcmService';
import { formatInSystemTime } from '../../utils/dateUtils';
import toast from 'react-hot-toast';

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
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);

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

  const handlePreview = (url: string, isOriginal: boolean) => {
    setPreviewUrl(url);
    if (!isOriginal && file) {
      setPreviewType(file.type);
    } else {
      // Para o anexo original, tenta inferir pela URL ou assume imagem/pdf genérico
      const ext = url.split('.').pop()?.toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
        setPreviewType('image/unknown');
      } else if (ext === 'pdf') {
        setPreviewType('application/pdf');
      } else {
        setPreviewType(null);
      }
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
      }, file || undefined, user?.email ? { id: user.id, email: user.email } : undefined);

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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[1100px] h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
        
        {/* Header Padronizado */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl flex items-center justify-center bg-emerald-50 text-emerald-600 transition-colors border border-emerald-100 shadow-sm">
              <Package size={32} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight text-emerald-700">Confirmação Almoxarifado</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-emerald-600/60">STATUS:</span>
                <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-600">AGUARDANDO SC</span>
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
          
          {/* Sidebar Esquerda (Contexto da Requisição Original) */}
          <div className="w-[340px] shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                <ClipboardList size={12} /> Detalhes Originais
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Data Solicitação</label>
                  <input
                    type="text"
                    value={formatInSystemTime(new Date(request.created_at || ''))}
                    disabled
                    className="w-full px-4 py-2.5 bg-slate-100 border border-transparent rounded-lg text-slate-600 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Solicitante PCM</label>
                  <input
                    type="text"
                    value={request.usuario?.nome || 'N/A'} // Added null check for request.usuario
                    disabled
                    className="w-full px-4 py-2.5 bg-slate-100 border border-transparent rounded-lg text-slate-600 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Equipamento</label>
                  <input
                    type="text"
                    value={request.maquina}
                    disabled
                    className="w-full px-4 py-2.5 bg-slate-100 border border-transparent rounded-lg text-slate-600 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Requisição PCM</label>
                  <div className="px-4 py-2.5 bg-blue-50/50 border border-blue-100 rounded-lg text-blue-700 text-sm font-mono font-bold">
                    {request.num_requisicao}
                  </div>
                </div>

                 <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Observação PCM</label>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs italic leading-relaxed">
                      "{request.obs_pcm}"
                    </div>
                 </div>

                 {request.anexo_pcm_url && (
                   <div className="pt-4 border-t border-slate-100 mt-4">
                     <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Anexo Original do PCM</label>
                     <button 
                       type="button"
                       onClick={() => handlePreview(request.anexo_pcm_url!, true)}
                       className="w-full flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 hover:bg-blue-100 transition-all group shadow-sm active:scale-95"
                     >
                       <div className="p-2 bg-white rounded-lg group-hover:scale-110 transition-transform shadow-inner">
                         <FileIcon size={18} />
                       </div>
                       <span className="text-xs font-bold truncate">Visualizar Documento</span>
                     </button>
                   </div>
                 )}
              </div>
            </div>
          </div>

          {/* Área Principal Direita (Almoxarifado) */}
          <div className="flex-1 overflow-y-auto p-8 bg-white/50">
            <div className="space-y-8">
              
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span className="text-emerald-500 text-lg">+</span> INFORMAÇÕES DA COMPRA
                </div>

                <div className="grid grid-cols-1 gap-4"> {/* Changed to grid-cols-1 as there's only one input */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1 uppercase">NÚMERO DA SC (ERP) *</label>
                    <input
                      type="text"
                      required // Added required attribute
                      value={numSc}
                      onChange={(e) => setNumSc(e.target.value)}
                      placeholder="Ex: 88721"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1 uppercase">OBSERVAÇÕES ALMOXARIFADO</label>
                  <textarea
                    value={obsAlmox}
                    onChange={(e) => setObsAlmox(e.target.value)}
                    placeholder="Informações adicionais para o setor de compras..."
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 min-h-[100px] resize-none"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span className="text-emerald-500 text-lg">+</span> COMPROVANTE / ANEXO
                </div>

                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex justify-center px-6 pt-10 pb-10 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
                  isDragging 
                    ? 'border-emerald-500 bg-emerald-50/50 scale-[1.02]' 
                    : file 
                      ? 'border-emerald-200 bg-emerald-50/20' 
                      : 'border-slate-200 bg-slate-50 hover:border-emerald-300 shadow-inner'
                }`}>
                  <div className="space-y-2 text-center text-emerald-800/60 font-bold uppercase tracking-widest shadow-inner">
                    {file ? (
                      <div className="flex flex-col items-center">
                        <div 
                          className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-2 cursor-pointer hover:bg-emerald-200 transition-all shadow-sm active:scale-95"
                          onClick={(e) => { e.stopPropagation(); if (file) handlePreview(URL.createObjectURL(file), false); }}
                          title="Visualizar anexo"
                        >
                           <FileIcon size={24} />
                        </div>
                        <p 
                          className="text-sm font-bold text-emerald-700 cursor-pointer hover:text-emerald-800 hover:underline transition-colors"
                          onClick={(e) => { e.stopPropagation(); if (file) handlePreview(URL.createObjectURL(file), false); }}
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
                          <label htmlFor="almox-file-upload" className="relative cursor-pointer font-extrabold text-emerald-600 hover:text-emerald-700">
                            <span className="text-base block text-center">Clique, cole ou arraste um arquivo</span>
                            <input id="almox-file-upload" name="almox-file-upload" type="file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                          </label>
                          <p className="text-xs text-emerald-600/40">ANEXE A PROVA DA SC DO ERP</p>
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
        <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between z-10 shadow-inner">
          <button 
            type="button" 
            onClick={onClose} 
            disabled={loading} 
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg text-sm hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-inner"
          >
            Fechar / Cancelar
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={loading || !numSc}
              className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-lg text-sm hover:bg-emerald-700 active:scale-95 shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 disabled:opacity-50 disabled:active:scale-100"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              {loading ? 'Processando...' : 'Confirmar e Enviar SC'}
            </button>
          </div>
        </div>
      </div>

      {previewUrl && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200" onClick={() => setPreviewUrl(null)}>
          <button className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors" onClick={() => setPreviewUrl(null)}>
            <X size={24} />
          </button>
          
          {previewType?.startsWith('image/') ? (
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()} />
          ) : previewType === 'application/pdf' ? (
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
              <button onClick={() => window.open(previewUrl, '_blank')} className="mt-8 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-95 transition-all">
                Baixar ou Abrir em Nova Guia
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
