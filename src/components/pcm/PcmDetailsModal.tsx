import React, { useState } from 'react';
import { X, File as FileIcon, Package, MapPin, Clock, FileText, User, ClipboardList, CheckCircle2 } from 'lucide-react';
import { PcmRequest } from '../../services/pcmService';
import { formatInSystemTime } from '../../utils/dateUtils';

interface PcmDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: PcmRequest | null;
}

export function PcmDetailsModal({ isOpen, onClose, request }: PcmDetailsModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);

  if (!isOpen || !request) return null;

  const handlePreview = (url: string, fileName?: string) => {
    setPreviewUrl(url);
    // Tenta inferir o tipo pela extensão se não tiver
    const ext = fileName?.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      setPreviewType('image/unknown');
    } else if (ext === 'pdf') {
      setPreviewType('application/pdf');
    } else {
      setPreviewType(null); // Desconhecido
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[1100px] h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
        
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
              <ClipboardList size={32} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Detalhes da Solicitação</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">REQUISIÇÃO:</span>
                <span className="text-[11px] font-bold uppercase tracking-wide text-blue-600 font-mono">#{request.num_requisicao}</span>
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

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Coluna Esquerda: PCM */}
          <div className="w-[340px] shrink-0 border-r border-slate-200 bg-slate-50/30 flex flex-col overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                 PCM / SOLICITANTE
              </div>

              <div className="space-y-4">
                <DetailItem label="Unidade / Fazenda" value={request.fazenda?.nome} icon={<MapPin size={14} />} />
                <DetailItem label="Solicitante" value={request.usuario?.nome} icon={<User size={14} />} />
                <DetailItem label="Equipamento" value={request.maquina} icon={<Package size={14} />} />
                <DetailItem label="Data" value={formatInSystemTime(new Date(request.created_at))} icon={<Clock size={14} />} />
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Prioridade</label>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    request.prioridade === 'Urgente' ? 'bg-red-50 text-red-500 border-red-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}>
                    {request.prioridade}
                  </span>
                </div>

                <div className="pt-2">
                   <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Observação PCM</label>
                   <div className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 text-xs italic leading-relaxed">
                     "{request.obs_pcm || 'Sem observações.'}"
                   </div>
                </div>

                {request.anexo_pcm_url && (
                  <div className="pt-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Anexo Original</label>
                    <button 
                      onClick={() => handlePreview(request.anexo_pcm_url!, 'anexo_pcm')}
                      className="w-full flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 hover:bg-blue-100 transition-all group"
                    >
                      <div className="p-2 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                        <FileIcon size={18} />
                      </div>
                      <span className="text-xs font-bold truncate">Visualizar Anexo PCM</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Coluna Direita: Almoxarifado / SC */}
          <div className="flex-1 overflow-y-auto p-8 bg-white">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                 STATUS & CONFIRMAÇÃO
              </div>

              {request.status === 'COMPLETED' ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-900">Solicitação Finalizada</h4>
                      <p className="text-xs text-emerald-700">A Solicitação de Compra foi gerada com sucesso.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Número da SC</label>
                      <div className="text-3xl font-mono font-black text-slate-800 tracking-tighter">
                        #{request.sc_numero}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Confirmado em</label>
                      <div className="text-sm font-bold text-slate-700 mt-2">
                        {request.data_confirmacao ? formatInSystemTime(new Date(request.data_confirmacao)) : '-'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-slate-100">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Observações do Almoxarifado</label>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-600 leading-relaxed min-h-[100px]">
                        {request.obs_almox || 'Nenhuma observação informada.'}
                      </div>
                    </div>

                    {request.anexo_almox_url && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Comprovante / Anexo SC</label>
                        <button 
                          onClick={() => handlePreview(request.anexo_almox_url!, 'anexo_sc')}
                          className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 hover:bg-emerald-100 transition-all group w-full sm:w-auto"
                        >
                          <div className="p-2.5 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform text-emerald-600">
                            <FileIcon size={20} />
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold">Ver Comprovante da SC</div>
                            <div className="text-[10px] opacity-60">Clique para visualizar</div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                  <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-6 animate-pulse">
                    <Clock size={40} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Aguardando Confirmação</h3>
                  <p className="text-sm text-slate-500 max-w-xs mt-2">
                    Esta solicitação ainda não foi processada pelo setor de Almoxarifado.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end">
          <button 
            onClick={onClose} 
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all active:scale-95"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Lightbox Preview */}
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
              <p className="text-sm text-slate-500">Este tipo de arquivo não pode ser pré-visualizado diretamente.</p>
              <button onClick={() => window.open(previewUrl, '_blank')} className="mt-8 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/25 active:scale-95 transition-all">
                Download / Abrir em Nova Guia
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value, icon }: { label: string, value?: string, icon: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">{label}</label>
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-sm font-bold shadow-sm">
        <span className="text-slate-400">{icon}</span>
        {value || '-'}
      </div>
    </div>
  );
}
