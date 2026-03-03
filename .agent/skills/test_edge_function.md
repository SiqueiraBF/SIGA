---
name: test_edge_function
description: Executa uma função de servidor ou bloco de lógica de backend com um payload específico.
---

Esta skill fornece o schema JSON para testar lógicas de backend em isolamento.

```json
{
  "name": "test_edge_function",
  "description": "Executa uma função de servidor ou bloco de lógica de backend com um payload específico para validar o retorno e o comportamento do sistema.",
  "parameters": {
    "type": "object",
    "properties": {
      "function_name": {
        "type": "string",
        "description": "O nome ou caminho da função a ser testada (ex: 'calculate-commission' ou 'supabase/functions/sync-nuntec')."
      },
      "payload": {
        "type": "object",
        "description": "O objeto JSON contendo os dados de entrada para o teste (ex: { 'service_value': 150.00 })."
      },
      "environment": {
        "type": "string",
        "enum": ["local", "development"],
        "description": "O ambiente onde o teste deve ser executado."
      }
    },
    "required": ["function_name", "payload"]
  }
}
```