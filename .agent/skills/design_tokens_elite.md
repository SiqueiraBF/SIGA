---
name: design_tokens_elite
description: Dicionário estrito de Tokens de design "Padrão Ouro" da UI Light Premium (PCM).
---

# Design Tokens Elite

Estes tokens substituem qualquer valor genérico e garantem a consitência visual do padrão **Light Premium**. O Frontend Dev NUNCA deve inventar cores; deve apenas referenciar estas classes utilitárias no Tailwind CSS.

### 1. Paleta Funcional (Backgrounds & Superfícies)
- **Overlay de Modal**: `bg-slate-900/60 backdrop-blur-md`
- **Página Principal / Fundo de Tabela**: `bg-white`
- **Painéis Secundários (Sidebar de Modal)**: `bg-white` ou `bg-slate-50`
- **Área de Conteúdo (Glass)**: `bg-white/50`
- **Inputs Disable / Leitura**: `bg-slate-100`

### 2. Ações (Brand & Primary)
- **Botão Primário (Solid)**: `bg-blue-600 hover:bg-blue-700 text-white font-bold active:scale-95 shadow-lg shadow-blue-500/25`
- **Hover Sutil em Ícones**: `text-slate-400 hover:text-blue-600 hover:bg-blue-50`
- **Botão Perigo/Exclusão (Outline/Icon)**: `hover:text-red-500 hover:bg-red-50`

### 3. Tipografia Premium e Legibilidade Técnica
- **Subtítulos/Labels/Metadados (Nano)**: `text-[10px] font-bold text-slate-400 uppercase tracking-widest`
- **Variante Nano Destaque (Headers de Tabela)**: `text-xs font-bold text-slate-600 uppercase tracking-wider`
- **Códigos, IDs, Números de Nota, Datas**: `font-mono font-medium text-slate-500 text-sm`
  - *Dica*: Quando renderizar data e hora, a data fica com classe padrão e a hora menor: `Data <span className="text-slate-400 ml-0.5">00:00</span>`
- **Títulos (H1/H2)**: `text-2xl font-bold text-slate-800 tracking-tight`
- **Texto Corrido Padrão**: `text-sm text-slate-600`

### 4. Bordas, Divisórias e Arredondamento
- **Borda Padrão (Cards/Tabelas)**: `border border-slate-200`
- **Divisórias Internas (Linhas de Tabela)**: `divide-y divide-slate-100`
- **Arredondamento Master (Modais)**: `rounded-[24px]`
- **Arredondamento de Card Base**: `rounded-2xl`
- **Arredondamento de Inputs/Botões**: `rounded-lg`

### 5. Badges e Status (Tags de Marcação)
Padronize qualquer exibição de status utilizando a estrutura-base: `px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border`

- **Pending/Aguardando**: `bg-amber-50 text-amber-600 border-amber-200`
- **Completed/Finalizado**: `bg-emerald-50 text-emerald-600 border-emerald-200`
- **Primary/Gerado/Ligado**: `bg-blue-50 text-blue-600 border-blue-200`
- **Neutral/Desconhecido**: `bg-slate-50 text-slate-500 border-slate-200`
- **Urgent/Falha**: `bg-red-50 text-red-500 border-red-200`
