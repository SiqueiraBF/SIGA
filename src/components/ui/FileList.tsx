import React, { useState } from 'react';
import { File as FileIcon, X } from 'lucide-react';

interface FileListProps {
  urls: string[];
  color?: 'blue' | 'emerald';
  labelPrefix?: string;
}

export function FileList({ urls, color = 'blue', labelPrefix = 'Anexo' }: FileListProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);

  const handlePreview = (url: string) => {
    setPreviewUrl(url);
    const ext = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      setPreviewType('image/unknown');
    } else if (ext === 'pdf') {
      setPreviewType('application/pdf');
    } else {
      setPreviewType(null);
    }
  };

  if (!urls || urls.length === 0) return null;

  const colorStyles = {
    blue: {
      btn: 'bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100',
      iconContainer: 'bg-white text-blue-600',
      dlBtn: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25'
    },
    emerald: {
      btn: 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100',
      iconContainer: 'bg-white text-emerald-600',
      dlBtn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25'
    }
  };

  const st = colorStyles[color];

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {urls.map((url, idx) => (
          <button 
            key={idx}
            type="button"
            onClick={() => handlePreview(url)}
            className={`w-full sm:w-auto flex items-center gap-3 p-3 border rounded-xl transition-all group active:scale-95 shadow-sm ${st.btn}`}
          >
            <div className={`p-2 rounded-lg group-hover:scale-110 transition-transform ${st.iconContainer}`}>
              <FileIcon size={18} />
            </div>
            <span className="text-xs font-bold truncate">Visualizar {labelPrefix} {urls.length > 1 ? idx + 1 : ''}</span>
          </button>
        ))}
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
              <p className="text-sm text-slate-500">Este tipo de arquivo não pode ser pré-visualizado diretamente.</p>
              <button onClick={() => window.open(previewUrl, '_blank')} className={`mt-8 px-5 py-2.5 text-white rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all ${st.dlBtn}`}>
                Download / Abrir em Nova Guia
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
