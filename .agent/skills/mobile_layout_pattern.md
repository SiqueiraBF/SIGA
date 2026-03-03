---
name: mobile_layout_pattern
description: Aplica as diretrizes estruturais de interface para o Aplicativo PWA (Mobile First) do Antigravity.
---

Esta skill detalha a estrutura de layout e as regras de renderização PWA:

```json
{
  "name": "mobile_layout_pattern",
  "description": "Aplica as diretrizes estruturais de interface para o Aplicativo PWA (Mobile First) do Antigravity.",
  "rules": [
    {
      "element": "Main Wrapper",
      "classes": "min-h-full bg-slate-50 relative pb-32 font-sans overflow-x-hidden",
      "reasoning": "Garante que o conteúdo não fique escondido sob a FAB e define o fundo claro padrão."
    },
    {
      "element": "Header",
      "classes": "bg-[color-600] text-white px-4 pt-6 pb-12 sticky top-0 z-10 shadow-md",
      "content": "Botão de 'ArrowLeft' lucide-react à esquerda. Título principal e subtítulo alinhados à direita do botão.",
      "reasoning": "O padding-bottom de 12 empurra o fundo colorido do Header para baixo da Main Area, criando o efeito de 'Cartão sobre Fundo Colorido'."
    },
    {
      "element": "Main Content Area",
      "classes": "px-4 -mt-6 relative z-20 space-y-4",
      "reasoning": "A margem negativa top (-mt-6) faz a folha branca principal invadir visualmente o Header colorido, criando volumetria natural sem requerer 3D."
    },
    {
      "element": "Floating Action Button Wrapper (FAB)",
      "classes": "fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 z-50 pb-safe",
      "reasoning": "Ancora o botão primário ao alcance do polegar do usuário com efeito de vidro opaco para não cortar o scroll bruscamente."
    },
    {
      "element": "Tables",
      "rule": "BANNED",
      "alternative": "Flexbox e CSS Grid para montar 'Action Cards'. Elementos <tr> e <td> são proibições definitivas neste layout."
    }
  ]
}
```
