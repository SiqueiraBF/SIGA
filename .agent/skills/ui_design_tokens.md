---
name: ui_design_tokens
description: Paleta de cores, sombras e efeitos padrão para o Layout Sci-Fi Glassmorphism Desktop.
---

Fornecer os valores exatos de cores, sombras e efeitos para manter a consistência do layout "Sci-Fi Glassmorphism".

```json
{
  "theme": "Antigravity Dark Holographic",
  "tokens": {
    "colors": {
      "background": "#020617",
      "surface": "rgba(15, 23, 42, 0.6)",
      "primary": "#2DD4BF",
      "secondary": "#0D9488",
      "accent": "#22D3EE",
      "border": "rgba(255, 255, 255, 0.1)"
    },
    "effects": {
      "glass": "backdrop-blur-md saturate-150",
      "glow": "shadow-[0_0_20px_rgba(45,212,191,0.3)]",
      "text_glow": "drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]"
    },
    "components": {
      "card": "bg-surface border border-border rounded-2xl glass glow",
      "button_primary": "bg-gradient-to-r from-teal-400 to-cyan-500 text-black font-bold rounded-full transition-all hover:scale-105 hover:shadow-cyan-glow",
      "input": "bg-slate-950/50 border-teal-900/50 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 text-teal-50"
    }
  }
}
```