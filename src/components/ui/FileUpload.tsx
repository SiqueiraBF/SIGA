import React, { useState, useCallback, useEffect } from 'react';
import { Upload, File as FileIcon, X } from 'lucide-react';
import toast from 'react-hot-toast';

export interface FileUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  existingUrls?: string[];
  onExistingUrlsChange?: (urls: string[]) => void;
  color?: 'blue' | 'emerald';
  compact?: boolean;
}

export function FileUpload({ files, onFilesChange, existingUrls = [], onExistingUrlsChange, color = 'blue', compact = false }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);

  const validateFiles = (fileList: File[]): File[] => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    const maxSize = 10 * 1024 * 1024;
    
    return fileList.filter(file => {
      if (file.size > maxSize) {
        toast.error(`O arquivo ${file.name} excede o limite de 10MB.`);
        return false;
      }
      if (!validTypes.includes(file.type)) {
        toast.error(`O arquivo ${file.name} tem um formato não suportado. Use PDF, PNG ou JPG.`);
        return false;
      }
      return true;
    });
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        const validFiles = validateFiles(Array.from(e.clipboardData.files));
        if (validFiles.length > 0) {
          onFilesChange([...files, ...validFiles]);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [files, onFilesChange]);

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
      const validFiles = validateFiles(Array.from(e.dataTransfer.files));
      if (validFiles.length > 0) {
        onFilesChange([...files, ...validFiles]);
      }
    }
  }, [files, onFilesChange]);

  const colorStyles = {
    blue: {
      borderDrag: 'border-blue-500 bg-blue-50/50 scale-[1.02]',
      borderHasFiles: 'border-blue-200 bg-blue-50/20',
      borderDefault: 'border-slate-200 bg-slate-50 hover:border-blue-300',
      iconBg: 'bg-blue-100 text-blue-600 hover:bg-blue-200',
      textHover: 'hover:text-blue-600',
      uploadIcon: 'text-slate-300',
      text: 'text-blue-600 hover:text-blue-700',
      btn: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25'
    },
    emerald: {
      borderDrag: 'border-emerald-500 bg-emerald-50/50 scale-[1.02]',
      borderHasFiles: 'border-emerald-200 bg-emerald-50/20',
      borderDefault: 'border-slate-200 bg-slate-50 hover:border-emerald-300 shadow-inner',
      iconBg: 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200',
      textHover: 'hover:text-emerald-800',
      uploadIcon: 'text-emerald-300',
      text: 'text-emerald-600 hover:text-emerald-700',
      btn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25'
    }
  };

  const st = colorStyles[color];

  return (
    <>
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex justify-center ${compact ? 'px-4 py-5' : 'px-6 pt-10 pb-10'} border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
        isDragging
          ? st.borderDrag 
          : (files.length > 0 || existingUrls.length > 0)
            ? st.borderHasFiles 
            : st.borderDefault
      }`}>
        <div className="space-y-2 text-center w-full">
          {(files.length > 0 || existingUrls.length > 0) ? (
            <div className="flex flex-col items-center w-full">
              <div className="flex flex-wrap gap-6 justify-center w-full">
                {existingUrls.map((url, idx) => (
                  <div key={`existing-${idx}`} className="flex flex-col items-center">
                    <div 
                      className={`w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center mb-2 cursor-pointer hover:bg-slate-200 transition-all shadow-sm active:scale-95`}
                      onClick={(e) => { e.stopPropagation(); setPreviewUrl(url); setPreviewType(url.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/unknown'); }}
                      title="Visualizar anexo"
                    >
                       <FileIcon size={24} />
                    </div>
                    <p 
                      className={`text-xs font-bold text-slate-700 cursor-pointer ${st.textHover} hover:underline transition-colors max-w-[120px] truncate`}
                      onClick={(e) => { e.stopPropagation(); setPreviewUrl(url); setPreviewType(url.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/unknown'); }}
                      title={`Anexo Existente ${idx + 1}`}
                    >
                      {`Anexo Existente ${idx + 1}`}
                    </p>
                    {onExistingUrlsChange && (
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); onExistingUrlsChange(existingUrls.filter((_, i) => i !== idx)); }} 
                        className="mt-2 text-[10px] text-red-500 font-bold uppercase tracking-wider hover:text-red-600 transition-colors"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                ))}
                {files.map((f, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <div 
                      className={`w-12 h-12 ${st.iconBg} rounded-xl flex items-center justify-center mb-2 cursor-pointer transition-all shadow-sm active:scale-95`}
                      onClick={(e) => { e.stopPropagation(); setPreviewUrl(URL.createObjectURL(f)); setPreviewType(f.type); }}
                      title="Visualizar anexo"
                    >
                       <FileIcon size={24} />
                    </div>
                    <p 
                      className={`text-xs font-bold text-slate-700 cursor-pointer ${st.textHover} hover:underline transition-colors max-w-[120px] truncate`}
                      onClick={(e) => { e.stopPropagation(); setPreviewUrl(URL.createObjectURL(f)); setPreviewType(f.type); }}
                      title={f.name}
                    >
                      {f.name}
                    </p>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); onFilesChange(files.filter((_, i) => i !== idx)); }} 
                      className="mt-2 text-[10px] text-red-500 font-bold uppercase tracking-wider hover:text-red-600 transition-colors"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
              <div className={`mt-6 pt-6 border-t ${color === 'blue' ? 'border-slate-100' : 'border-emerald-100'} w-full flex flex-col gap-1 items-center`}>
                <label htmlFor={`file-upload-${color}`} className={`relative cursor-pointer font-bold ${st.text}`}>
                  <span className="text-sm block text-center flex items-center gap-2"><Upload size={16} /> Adicionar mais arquivos</span>
                  <input id={`file-upload-${color}`} name="file-upload" type="file" multiple className="sr-only" onChange={(e) => {
                    const validFiles = validateFiles(Array.from(e.target.files || []));
                    if (validFiles.length > 0) {
                      onFilesChange([...files, ...validFiles]);
                    }
                    e.target.value = '';
                  }} />
                </label>
              </div>
            </div>
          ) : (
            <>
              <Upload className={`mx-auto ${compact ? 'h-8 w-8 mb-2' : 'h-12 w-12'} ${st.uploadIcon}`} />
              <div className="flex flex-col gap-1 items-center">
                <label htmlFor={`file-upload-${color}`} className={`relative cursor-pointer font-bold ${st.text}`}>
                  <span className={`${compact ? 'text-sm' : 'text-base'} block text-center`}>Clique, cole, ou arraste um arquivo</span>
                  <input id={`file-upload-${color}`} name="file-upload" type="file" multiple className="sr-only" onChange={(e) => {
                    const validFiles = validateFiles(Array.from(e.target.files || []));
                    if (validFiles.length > 0) {
                      onFilesChange([...files, ...validFiles]);
                    }
                    e.target.value = '';
                  }} />
                </label>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mt-2">PDF, PNG, JPG até 10MB</p>
              </div>
            </>
          )}
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
              <button onClick={() => window.open(previewUrl, '_blank')} className={`mt-8 px-5 py-2.5 text-white rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all ${st.btn}`}>
                Baixar ou Abrir em Nova Guia
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
