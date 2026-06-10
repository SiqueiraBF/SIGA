# Original User Request

## 2026-06-06T19:21:36Z

# Teamwork Project Prompt â€” Draft

> Status: Launched
> Goal: Execute the delegated tasks with the teamwork_preview subagent

Refactor the Stock Transfer module to replace all native browser `alert()` and `confirm()` notifications with the system's global notification components (`toast` from `react-hot-toast` and `ConfirmDialog`).

Working directory: c:\Users\bruno.siqueira\OneDrive - NADIANA AGROPECUARIA LTDA\Ãrea de Trabalho\Projetos\Sistema Nadiana

## Requirements

### R1. Replace Native Alerts
Replace all instances of `alert(...)` in the Stock Transfer module components, specifically `src/components/StockRequestForm.tsx` and `src/pages/StockRequestList.tsx`, with `toast.error()` or `toast.success()` from `react-hot-toast`.

### R2. Replace Native Confirms
Replace all instances of `window.confirm(...)` and `confirm(...)` with the global `ConfirmDialog` component. Ensure that the state for the confirmation dialog is properly managed within the components.

## Acceptance Criteria

### Verification
- [ ] Running `grep "alert(" src/components/StockRequestForm.tsx src/pages/StockRequestList.tsx` returns 0 results.
- [ ] Running `grep "confirm(" src/components/StockRequestForm.tsx src/pages/StockRequestList.tsx` returns 0 results.

### Integrity
- [ ] Running `npx tsc --noEmit` completes without any errors, validating that the new state, `toast`, and `ConfirmDialog` typings and hooks are correctly implemented.
- [ ] The `ConfirmDialog` is fully functional and correctly executes the confirmed actions (e.g., removing items, sending requests, deleting drafts).

## 2026-06-06T20:20:11Z

# Teamwork Project Prompt — Draft

> Status: Ready for launch — awaiting user approval
> Goal: Craft prompt ? get user approval ? delegate to teamwork_preview

Refactor the Stock Transfer module (src/pages/StockRequestList.tsx) to replace all raw HTML elements and inline Tailwind classes with the standardized Elite global UI components.

Working directory: c:\Users\bruno.siqueira\OneDrive - NADIANA AGROPECUARIA LTDA\Área de Trabalho\Projetos\Sistema Nadiana
Integrity mode: development

## Requirements

### R1. Refatorar Filtros Avançados
Substituir as tags nativas <input type="date"> pelo componente global <Input type="date"> e <select> por <Select>, preferencialmente encapsulados em <FormField> quando adequado para manter o espaçamento e labels padronizados.

### R2. Refatorar Listagem de Requisições (Cards)
Substituir a estrutura manual de divs (<div className="bg-white p-5 rounded-2xl...">) que compõe os itens da lista pelo componente global <Card>.

### R3. Refatorar Botões de Ação
Substituir as tags <button> nativas por componentes globais:
- Botão "Separar" -> <Button variant="primary" icon={Package}>Separar</Button>
- Botão "Ver Detalhes" -> <Button variant="secondary">Ver Detalhes</Button>
- Botão "Excluir" (lixeira) -> <IconButton icon={Trash2} variant="danger" /> ou similar.

### R4. Refatorar Estados Vazios e Erros
Substituir as telas manuais de "Nenhuma requisição encontrada" e de "Erro" pelo componente global <EmptyState>, repassando ícones e títulos correspondentes, além do botão de ação (Tentar Novamente) quando for o caso.

### R5. Refatorar Tags de Categoria
Substituir os <span> manuais para EPI/Uniforme por <StatusBadge> ou componente equivalente padronizado de tag.

## Acceptance Criteria

### Compilação e Tipagem
- [ ] O projeto deve compilar sem nenhum erro de TypeScript no arquivo modificado (
px tsc --noEmit).

### Conformidade Visual Elite
- [ ] O arquivo StockRequestList.tsx não deve conter as palavras lert, confirm, <input , <select , ou <button  (nativos). Toda interação deve ser feita pelos componentes globais importados de src/components/ui.
- [ ] O layout deve manter o mesmo aspecto funcional, com hovers fluídos e ações intactas.
