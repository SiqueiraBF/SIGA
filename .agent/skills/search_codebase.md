---
name: search_codebase
description: Realiza busca textual ou Regex no código-fonte.
---

Esta skill define a estrutura do scanner de código.

```json
{
  "name": "search_codebase",
  "description": "Realiza uma busca textual ou por expressão regular em todo o código-fonte do projeto para localizar definições, usos de funções ou padrões específicos.",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "O termo ou padrão regex a ser buscado (ex: 'license_plate' ou 'auth.uid()')."
      },
      "file_pattern": {
        "type": "string",
        "description": "Filtro opcional para buscar apenas em certos tipos de arquivos (ex: '*.tsx', 'src/services/*')."
      },
      "case_sensitive": {
        "type": "boolean",
        "description": "Se verdadeiro, diferencia maiúsculas de minúsculas na busca."
      }
    },
    "required": ["query"]
  }
}
```