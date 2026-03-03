---
name: database_query_preview
description: Executa consultas SQL ou comandos do Supabase SDK em modo de visualização para validar resultados e testar políticas de RLS.
---

Esta skill fornece um modelo em JSON para a execução simulada de comandos.

```json
{
  "name": "database_query_preview",
  "description": "Executa consultas SQL ou comandos do Supabase SDK em modo de visualização para validar resultados e testar políticas de RLS.",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "A instrução SQL ou comando do SDK a ser testado (ex: 'SELECT * FROM wash_orders LIMIT 5')."
      },
      "impersonate_user_id": {
        "type": "string",
        "description": "UUID de um usuário específico para testar se o RLS está filtrando os dados corretamente para ele."
      },
      "is_dry_run": {
        "type": "boolean",
        "description": "Se verdadeiro, simula operações de escrita (INSERT/UPDATE) sem persistir as mudanças no banco real."
      }
    },
    "required": ["query"]
  }
}
```