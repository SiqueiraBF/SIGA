---
name: inspect_workspace
description: Lista a estrutura de arquivos e diretórios do projeto para mapear o contexto técnico.
---

Esta skill detalha os parâmetros e restrições para visualizar a listagem de arquivos do projeto.

```json
{
  "name": "inspect_workspace",
  "description": "Lista a estrutura de arquivos e diretórios do projeto para mapear o contexto técnico e localizar arquivos específicos.",
  "parameters": {
    "type": "object",
    "properties": {
      "directory": {
        "type": "string",
        "description": "O caminho do diretório a ser inspecionado (ex: '.', './src', '.agents/rules')."
      },
      "depth": {
        "type": "number",
        "description": "Nível de profundidade da árvore de diretórios (padrão: 2)."
      },
      "include_metadata": {
        "type": "boolean",
        "description": "Se verdadeiro, retorna o tamanho e a data da última modificação dos arquivos."
      }
    },
    "required": ["directory"]
  }
}
```