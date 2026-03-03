---
name: set_domain_context
description: Define o domínio de negócio ativo e carrega as regras de ouro, entidades e restrições específicas para o squad de desenvolvimento.
---

Esta skill fornece o schema JSON para trocar entre contextos de domínio (ex: Lavador vs Fazenda).

```json
{
  "name": "set_domain_context",
  "description": "Define o domínio de negócio ativo e carrega as regras de ouro, entidades e restrições específicas para o squad de desenvolvimento.",
  "parameters": {
    "type": "object",
    "properties": {
      "domain_id": {
        "type": "string",
        "description": "O identificador do domínio (ex: 'carwash', 'farmlogistics')."
      },
      "rules_file": {
        "type": "string",
        "description": "O caminho para o arquivo .md que contém as regras de negócio (ex: 'domaincarwash.md')."
      },
      "strict_mode": {
        "type": "boolean",
        "description": "Se verdadeiro, impede os subagentes de criarem lógicas fora do dicionário de dados do domínio."
      }
    },
    "required": ["domain_id", "rules_file"]
  }
}
```