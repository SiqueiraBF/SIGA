---
name: enforce_layout_pattern
description: Aplica as diretrizes de design system baseadas no layout do 'Projeto Lavador' (image_3.png), focando em estética sci-fi, dark mode e realces teal.
---

Esta skill funciona como o "policial do design system", garantindo que nenhum componente seja criado com estilos genéricos ou inconsistentes com a estética holográfica do Antigravity.

Todo componente deve obrigatoriamente usar o sistema de cores da Unisystem: Fundo Dark (#020617), Destaques Teal (#2DD4BF) e superfícies Glass (opacity 10-20%). Proibido usar cores sólidas ou componentes sem bordas sutis de realce.

```json
{
  "name": "enforce_layout_pattern",
  "description": "Aplica as diretrizes de design system baseadas no layout do 'Projeto Lavador' (image_3.png), focando em estética sci-fi, dark mode e realces teal.",
  "parameters": {
    "type": "object",
    "properties": {
      "component_type": {
        "type": "string",
        "enum": ["form_input", "action_button", "status_card", "progess_bar"],
        "description": "O tipo de componente UI que precisa de aplicação de estilo."
      },
      "style_context": {
        "type": "string",
        "enum": ["web_desktop", "field_mobile"],
        "description": "O contexto de exibição do componente para regras de responsividade."
      }
    },
    "required": ["component_type"]
  }
}
```