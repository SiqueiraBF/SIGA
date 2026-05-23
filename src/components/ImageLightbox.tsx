import React, { useEffect } from 'react';
import { X, Download } from 'lucide-react';

interface ImageLightboxProps {
  src: string;
  isOpen: boolean;
  onClose: () => void;
  alt?: string;
}

export function ImageLightbox({ src, isOpen, onClose, alt = "Visualização da imagem" }: ImageLightboxProps) {
  // Fechar com a tecla ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = src;
    link.download = `imagem_nadiana_${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-sm p-4 sm:p-8 animate-in fade-in duration-200 cursor-zoom-out"
      onClick={onClose}
    >
      {/* Botões de Ação */}
      <div className="fixed top-6 right-6 flex items-center gap-3 z-[110]">
        <button
          onClick={handleDownload}
          className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all flex items-center gap-2"
          title="Baixar imagem"
        >
          <Download size={24} />
        </button>
        <button 
          onClick={onClose}
          className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
          title="Fechar (ESC)"
        >
          <X size={24} />
        </button>
      </div>
      
      {/* Container da Imagem */}
      <div className="relative w-full h-full flex items-center justify-center">
        <img 
          src={src} 
          alt={alt} 
          className="max-w-full max-h-full object-contain rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300 cursor-default"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
