import React from 'react';
import { FileCode } from 'lucide-react';

interface MarkdownPreviewProps {
  compiledMarkdown: string;
}

export function MarkdownPreview({ compiledMarkdown }: MarkdownPreviewProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1.5">
          <FileCode size={14} className="text-blue-600" /> Prompt Compilado (Apenas Leitura)
        </label>
        <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded font-medium">
          Consolidado dinamicamente para o Gemini
        </span>
      </div>
      <textarea
        readOnly
        value={compiledMarkdown}
        rows={14}
        className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 font-mono leading-relaxed p-3 focus:outline-none focus:ring-0 cursor-text text-slate-600 select-all"
        title="Prompt Markdown final que é enviado para a IA analisar os cadastros"
      />
      <p className="text-[11px] text-slate-500 italic leading-snug">
        *Nota: Esse texto reflete em tempo real as descrições, diretrizes, abreviações e conceitos cadastrados nas abas anteriores. Ao clicar em "Salvar Manual no Servidor", esse Markdown será injetado nas configurações da inteligência artificial.
      </p>
    </div>
  );
}
