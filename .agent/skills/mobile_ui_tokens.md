---
name: mobile_ui_tokens
description: Fornece os valores exatos de cores, sombras e efeitos para manter a consistência do layout 'Light Mode PWA' focado em uso de campo.
---

Esta skill detalha os tokens específicos para UI de Celular:

Regra de Ouro: No PWA, botões interativos DEVEM escalar nativamente (`active:scale-95`) para gerar a sensação física do toque, compensando a falta de hover dos computadores.

```json
{
  "name": "mobile_ui_tokens",
  "description": "Fornece os valores exatos de cores, sombras e efeitos para manter a consistência do layout 'Light Mode PWA' focado em uso de campo.",
  "tokens": {
    "colors": {
      "background": "#F8FAFC (slate-50)",
      "surface": "#FFFFFF (white)",
      "text_primary": "#1E293B (slate-800)",
      "text_secondary": "#64748B (slate-500)",
      "border": "#E2E8F0 (slate-200)",
      "actions": {
        "limpeza": "blue-600",
        "drenagem": "cyan-600",
        "recebimento": "orange-500",
        "expedicao": "indigo-600",
        "separacao": "teal-600"
      }
    },
    "effects": {
      "glass_fab": "bg-white/90 backdrop-blur-md",
      "shadow_soft": "shadow-sm hover:shadow-md",
      "shadow_glow_action": "shadow-[0_8px_20px_-5px_rgba(var(--action-color),0.4)]"
    },
    "components": {
      "card": "bg-white border border-slate-200 rounded-2xl shadow-sm p-4",
      "button_fab": "w-full py-4 bg-[action-color] text-white rounded-2xl font-black text-lg active:scale-95 transition-all shadow-glow",
      "input": "w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 outline-none text-base"
    }
  }
}
```
