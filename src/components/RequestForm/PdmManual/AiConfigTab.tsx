import React, { useState } from 'react';
import { Cpu, Key, Eye, EyeOff, Sparkles, HelpCircle, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

interface AiConfig {
  enabled: boolean;
  model: string;
  api_key: string;
}

interface AiConfigTabProps {
  config: AiConfig;
  onChange: (updated: AiConfig) => void;
  isAdmin: boolean;
}

export function AiConfigTab({ config, onChange, isAdmin }: AiConfigTabProps) {
  const [showKey, setShowKey] = useState(false);

  const handleToggleEnabled = (val: boolean) => {
    if (!isAdmin) return;
    onChange({ ...config, enabled: val });
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    onChange({ ...config, api_key: e.target.value });
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    onChange({ ...config, model: e.target.value });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
          <Cpu size={24} />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800">Configuração da Inteligência Artificial</h3>
          <p className="text-xs text-slate-500">Gerencie a integração de higienização automatizada do PDM usando o Google Gemini.</p>
        </div>
      </div>

      {/* Switch Toggle Premium */}
      <div className="p-5 bg-white border border-slate-200/60 rounded-2xl shadow-sm">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-3">
          Status da Integração
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!isAdmin}
            onClick={() => handleToggleEnabled(true)}
            className={`flex items-center gap-3 p-4 rounded-xl text-left border transition-all ${
              config.enabled
                ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            } ${!isAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <div className={`p-1.5 rounded-full ${config.enabled ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <CheckCircle2 size={16} />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-800">IA Habilitada</span>
              <span className="block text-[11px] text-slate-500 mt-0.5">Processar e propor higienizações de itens automaticamente.</span>
            </div>
          </button>

          <button
            type="button"
            disabled={!isAdmin}
            onClick={() => handleToggleEnabled(false)}
            className={`flex items-center gap-3 p-4 rounded-xl text-left border transition-all ${
              !config.enabled
                ? 'border-slate-800 bg-slate-50/80 ring-1 ring-slate-800'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            } ${!isAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <div className={`p-1.5 rounded-full ${!config.enabled ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <AlertCircle size={16} />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-800">IA Desabilitada</span>
              <span className="block text-[11px] text-slate-500 mt-0.5">Toda classificação e higienização deverá ser manual.</span>
            </div>
          </button>
        </div>
      </div>

      {/* API Key Section */}
      <div className="p-5 bg-white border border-slate-200/60 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <Key size={14} className="text-blue-600" /> Chave de API do Gemini (Google AI Studio)
          </label>
          <a
            href="https://aistudio.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
          >
            Obter chave de API <HelpCircle size={12} />
          </a>
        </div>

        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            disabled={!isAdmin}
            value={config.api_key || ''}
            onChange={handleApiKeyChange}
            placeholder="Insira sua API Key do Google AI Studio..."
            className="w-full text-xs font-mono rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 pr-10 disabled:bg-slate-50 disabled:text-slate-400"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            title={showKey ? 'Ocultar chave' : 'Mostrar chave'}
          >
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          *Esta chave de API é salva de forma criptografada no banco e é utilizada pela Edge Function (`analyze-pdm`) para realizar a comunicação com a API oficial da Google. Garanta que a chave possua permissões e cotas válidas.
        </p>
      </div>

      {/* Cascade Flow Explanation */}
      <div className="p-5 bg-slate-50 border border-slate-200/50 rounded-2xl space-y-4">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles size={14} className="text-blue-600" /> Fluxo de Priorização em Cascata
        </label>
        
        <p className="text-xs text-slate-600 leading-relaxed">
          Para garantir alta disponibilidade e evitar falhas de cota ou timeouts, o sistema tenta realizar a análise automaticamente consultando uma fila de modelos em cascata (se um falhar ou demorar, ele pula para o seguinte):
        </p>

        {/* Visual Cascade Stepper */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200/60 p-4 rounded-xl shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-blue-300 transition-colors">
            <span className="absolute -right-3 -top-3 text-slate-100 font-bold text-5xl select-none group-hover:text-blue-50 transition-colors">1</span>
            <div>
              <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-bold rounded-full mb-2">Principal</span>
              <h4 className="text-xs font-bold text-slate-800">Gemini 3.5 Flash</h4>
              <p className="text-[10px] text-slate-500 mt-1 leading-normal">Responsável pela análise inicial de alta fidelidade das diretrizes do PDM.</p>
            </div>
            <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 text-slate-300">
              <ArrowRight size={14} />
            </div>
          </div>

          <div className="bg-white border border-slate-200/60 p-4 rounded-xl shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-blue-300 transition-colors">
            <span className="absolute -right-3 -top-3 text-slate-100 font-bold text-5xl select-none group-hover:text-blue-50 transition-colors">2</span>
            <div>
              <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-bold rounded-full mb-2">Contingência A</span>
              <h4 className="text-xs font-bold text-slate-800">Gemini 3.1 Flash Lite</h4>
              <p className="text-[10px] text-slate-500 mt-1 leading-normal">Caso o modelo 3.5 atinja limite de quota (429), este assume de forma ultra-rápida.</p>
            </div>
            <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 text-slate-300">
              <ArrowRight size={14} />
            </div>
          </div>

          <div className="bg-white border border-slate-200/60 p-4 rounded-xl shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-blue-300 transition-colors">
            <span className="absolute -right-3 -top-3 text-slate-100 font-bold text-5xl select-none group-hover:text-blue-50 transition-colors">3</span>
            <div>
              <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 text-[9px] font-bold rounded-full mb-2">Contingência B</span>
              <h4 className="text-xs font-bold text-slate-800">Gemini 2.5 Flash</h4>
              <p className="text-[10px] text-slate-500 mt-1 leading-normal">Última linha de contingência estável para garantir que o cadastro nunca fique travado.</p>
            </div>
          </div>
        </div>

        {/* Custom Pref Model */}
        <div className="pt-2 border-t border-slate-200/60">
          <label className="text-xs font-bold text-slate-600 block mb-1">
            Modelo Preferencial Adicional (Opcional)
          </label>
          <input
            type="text"
            disabled={!isAdmin}
            value={config.model || ''}
            onChange={handleModelChange}
            placeholder="EX: gemini-1.5-pro (deixe vazio para usar a cascata padrão)"
            className="w-full text-xs font-mono rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-400"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            Se preenchido, este modelo será consultado primeiro na fila de análises. Se falhar por limite de cotas, o fluxo de fallback acima continuará ativo.
          </p>
        </div>
      </div>
    </div>
  );
}
