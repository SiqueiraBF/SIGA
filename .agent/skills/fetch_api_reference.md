---
name: fetch_api_reference
description: Recupera a documentação técnica, endpoints e esquemas de dados de uma API externa específica.
---

Esta skill orienta o formato de requisição de manuais de APIs externas.

```json
{
  "name": "fetch_api_reference",
  "description": "Recupera a documentação técnica, endpoints e esquemas de dados de uma API externa específica para evitar alucinações de integração.",
  "parameters": {
    "type": "object",
    "properties": {
      "provider": {
        "type": "string",
        "enum": ["nuntec", "microsoft_graph", "sefaz", "whatsapp"],
        "description": "O provedor da API que precisa ser consultado."
      },
      "resource": {
        "type": "string",
        "description": "O recurso ou endpoint específico (ex: 'fuel_levels', 'send_mail', 'nfs_emission')."
      },
      "version": {
        "type": "string",
        "description": "A versão da API (ex: 'v1', 'v2', 'beta')."
      }
    },
    "required": ["provider", "resource"]
  }
}
```