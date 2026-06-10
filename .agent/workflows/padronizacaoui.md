---
description: Guia para auditar, refatorar e padronizar a UI/UX de um módulo para o padrão "Elite" (Light Premium).
---

# Workflow: Padronização UI Elite (/padronizacaoui)

Siga este passo a passo detalhado para invocar as diretrizes do **Design System Specialist** e converter uma interface antiga/simples para o padrão Elite (Baseado no módulo Solicitações de Cadastro).

## Passo 1: Auditoria Estrutural (ui_component_catalog.md)
A primeira coisa a fazer é ler o arquivo `.agent/rules/ui_component_catalog.md`. A refatoração consiste em **trocar HTML bruto por Componentes Reutilizáveis**.
- Confirme se a tela está encapsulada em um `.max-w-7xl.mx-auto.space-y-6`.
- Verifique se os componentes UI principais do sistema (`<PageHeader>`, `<FilterBar>`) estão sendo importados e usados no topo em vez de divs cruas.
- O componente usa `alert()` ou `window.confirm()`? Eles devem ser trocados OBRIGATORIAMENTE por `toast` e `<ConfirmDialog>`.

## Passo 2: Padronização de Listas e Estados de Página
1. Tabelas devem usar OBRIGATORIAMENTE o componente `<DataTable>` exportado em `src/components/ui/DataTable.tsx`. **Não** construa tags `<table>` do zero.
2. O `<DataTable>` já lida com os borders, responsividade e Empty States. Se estiver fazendo listas customizadas, use o componente `<EmptyState>`.
3. Use `font-mono text-sm font-medium text-slate-500` para IDs ou códigos.

## Passo 3: Refatoração de Modais e Diálogos
1. Diálogos de Confirmação (Exclusão/Alerta): Troque wrappers manuais por `<ConfirmDialog variant="danger|warning|info">`.
2. Modal Principal: Use o componente `<Modal>` importado de `src/components/ui/Modal.tsx`.
3. Divida a lógica interna do Modal em "Split Layout": Inputs Leves na **Sidebar Esquerda**, e o núcleo (Detalhes do Item/Ação) na **Área Flexível Direita**.

## Passo 4: Limpeza Semântica (Design Tokens)
1. **Badges de Status**: Converta qualquer `<span className="...">` de status para usar o componente `<StatusBadge variant="...">`.
2. **Botões**: Não construa botões estilizados manualmente. Importe o `<Button>` de `src/components/ui/Button.tsx` e use as variants (primary, secondary, danger).
3. **Inputs**: Use os componentes `<Input>`, `<Select>` e o wrapper `<FormField>` para tratar rótulos e erros (com integração ao React Hook Form/Zod).

## Passo 5: Verificação Técnica Final (Gate R)
- Cheque falhas de TypeScript introduzidas pelas mudanças de props.
- O componente agora depende APENAS do que foi exportado pela `ui_component_catalog.md`?
- Revise as chamadas de classes residuais (ex. grids ou espaçamentos) para que não contradigam o Design System.
