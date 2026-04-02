---
description: Guia para auditar, refatorar e padronizar a UI/UX de um módulo para o padrão "Elite" (Light Premium).
---

# Workflow: Padronização UI Elite (/padronizacaoui)

Siga este passo a passo detalhado para invocar as diretrizes do **Design System Specialist** e converter uma interface antiga/simples para o padrão Elite (Baseado no módulo Solicitações de PCM).

## Passo 1: Auditoria Estrutural do Componente
- Confirme se a tela está encapsulada em um `.max-w-7xl.mx-auto.space-y-6`.
- Verifique se os componentes UI principais do sistema (`PageHeader`, `FilterBar`) estão sendo importados e usados no topo em vez de divs cruas de HTML.
- Inspecione modais atuais: eles são Floating Boxes isolantes ou ocupam todo o espaço horizontal sem estrutura?
- Inspecione listas: elas utilizam `<table className="w-full">` com formatação crua em vez da `Elite Data Table`?

## Passo 2: Padronização de Tabelas e Estados de Página
1. Envolva todas as tabelas no container `rounded-2xl shadow-sm border border-slate-200 overflow-hidden`.
2. As linhas da tabela (`tr`) devem ter `hover:bg-slate-50/50 transition-colors cursor-pointer`.
3. Garanta a criação do **Empty State Elegante** para arrays `.length === 0` (carregando o ícone do módulo de tamanho 32 na bolha da `bg-slate-50`).
4. Remova o uso padrão de fontes nos IDs, IDs externos, Números de Nota ou Datas. Imponha `font-mono text-sm font-medium text-slate-500`.

## Passo 3: Refatoração de Modais ("Split Layout")
1. Modal Principal: Substitua wrappers básicos por `<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex...">`.
2. Configure o formato gigante com bordas suavizadas: `bg-white rounded-[24px] shadow-2xl w-full max-w-[1100px] h-[92vh]`.
3. Adicione animações de montagem no modal: `animate-in fade-in zoom-in-95 duration-300`.
4. Divida a lógica de inputs inserindo Inputs Leves (Status, Seleção de Fazenda, Data) na **Sidebar Esquerda (340px)**, e o núcleo (Detalhes do Item/Ação) na **Área Flexível Direita**.

## Passo 4: Limpeza Semântica (Design Tokens)
1. **Badges de Status**: Converta qualquer `<span className="...">` de status para o padrão *Nano-Badge* (ex: `px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border`).
2. **Botões**: O botão primário de ação/envio DEVE incorporar o elevador de sombra e toque: `bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-500/25`.
3. **Labels de Input**: Remova descrições densas que ficam flutuando no input. Use Nano-Labels coladas em cima do campo: `text-[10px] font-bold text-slate-500 mb-1.5 ml-1 uppercase`.

// turbo
## Passo 5: Verificação Técnica Final (Gate R)
- Cheque falhas de TypeScript introduzidas.
- Identifique se o *Design System Specialist* aprova as mudanças (as sombras estendem-se direito? a fonte Mono exibe alinhado?).
- Revise as chamadas de classes usando a skill `design_tokens_elite.md` para evitar inventar CSS.
