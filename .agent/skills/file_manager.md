---
name: file_manager
description: Regras para operações vitais de leitura/escrita no disco.
---

Esta skill detalha os parâmetros e restrições para manipular arquivos localmente.

```json
{
  "name": "file_manager",
  "description": "Permite criar, ler, atualizar e excluir arquivos no workspace do projeto, garantindo a implementação física do código gerado.",
  "parameters": {
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": ["read", "write", "append", "delete"],
        "description": "A operação de arquivo a ser realizada."
      },
      "path": {
        "type": "string",
        "description": "O caminho completo do arquivo (ex: 'src/components/WashCard.tsx')."
      },
      "content": {
        "type": "string",
        "description": "O conteúdo a ser escrito ou adicionado ao arquivo (obrigatório para 'write' e 'append')."
      }
    },
    "required": ["action", "path"]
  }
}
```