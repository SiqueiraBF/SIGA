---
name: sync_session_context
description: Salva o estado atual, progresso e próximos passos no arquivo de memória compartilhada do agente para que o contexto não se perca.
---

Esta skill garante que as decisões tomadas em uma sessão não se percam.

```json
{
  "name": "sync_session_context",
  "description": "Salva o estado atual, progresso e próximos passos no arquivo de memória compartilhada do agente para que o contexto não se perca.",
  "parameters": {
    "type": "object",
    "properties": {
      "session_summary": {
        "type": "string",
        "description": "Um resumo detalhado do que foi feito até o momento."
      },
      "next_steps": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Lista de ações que precisam ser tomadas na próxima iteração."
      },
      "active_domain": {
        "type": "string",
        "description": "Qual domínio estava sendo configurado (ex: logística, lavador)."
      }
    },
    "required": ["session_summary", "next_steps"]
  }
}
```
