# PCM Refactoring Analysis

## Goal
Align the PCM module to the Padrão Elite Design System, substituting legacy components (manual tables, windows.confirm, custom modals, manual badges) with unified UI Catalog elements.

## Impacted Files
1. `src/pages/PcmRequests.tsx`
2. `src/components/pcm/PcmRequestModal.tsx`
3. `src/components/pcm/PcmConfirmModal.tsx`
4. `src/components/pcm/PcmDetailsModal.tsx`
5. `src/components/pcm/PcmCancelModal.tsx`

## Step-by-Step Change Strategy

### 1. `PcmRequests.tsx`
**Current state:** Manual `<table>`, manual tab navigation buttons, custom logic for sorting state (handled partially in the component), uses `window.confirm`.
**Changes:**
- **State Additions:** Add a state `requestToDelete: string | null = null` to handle delete confirmation using the `ConfirmDialog` component instead of `window.confirm()`.
- **Tabs (`TabBar`):** Replace the `<div className="border-b ..."><div className="flex gap-8">...</div></div>` with the `TabBar` component from `ui/TabBar`. Define the tabs array (`{id: 'list', label: 'Lista de Solicitações', icon: FileText}`, `{id: 'dashboard', label: 'Indicadores', icon: BarChart3}`).
- **Data Table (`DataTable`):**
  - Remove manual `<table>`, `<thead>`, `<tbody>`, `<tr>`, etc.
  - Define `columns` constant following `DataTableColumn<PcmRequest>` type. Columns: 'Requisição', 'Data', 'Filial', 'Solicitante', 'Equipamento', 'Prioridade', 'Status', 'SC', 'Data SC', 'Lead Time'.
  - Map `StatusBadge` for the Status column.
  - Map priority styles inside the column render function.
  - Hook into the existing `handleSort` by configuring `DataTable` sorting props: `sortField={sortField}`, `sortDirection={sortDirection}`, `onSortChange={handleSort}`, but since DataTable's internal sorting doesn't perfectly map the strings, we can just use the external sorting already in the component by passing the sorted data directly and providing the external sort props, or adapt `DataTableColumn` sort features.
- **Actions (`TableActions`):** Use the `renderActions` prop on `DataTable` mapping `onView` (to open Details), `onEdit`, `onDelete` (triggers ConfirmDialog instead of window.confirm), and custom actions (Confirm, Cancel).
- **Confirmation:** Add `<ConfirmDialog>` at the bottom of the component for the delete action.

### 2. `PcmRequestModal.tsx`
**Current state:** `fixed inset-0 ...` custom modal structure.
**Changes:**
- Import `Modal`, `ModalHeader`, `ModalFooter`.
- Replace the root container with `<Modal isOpen={isOpen} onClose={onClose} size="xl">`.
- Replace the custom header block with `<ModalHeader title="..." subtitle="..." icon={Package} onClose={onClose} />`.
- Replace the footer block with `<ModalFooter>...buttons...</ModalFooter>`.

### 3. `PcmConfirmModal.tsx`
**Current state:** `fixed inset-0 ...` custom modal structure.
**Changes:**
- Similar to `PcmRequestModal`. Use `Modal`, `ModalHeader` (title="Confirmação Almoxarifado"), `ModalFooter`.

### 4. `PcmDetailsModal.tsx`
**Current state:** `fixed inset-0 ...` custom modal structure.
**Changes:**
- Replace custom root with `<Modal isOpen={isOpen} onClose={onClose} size="xl">`.
- Replace header with `<ModalHeader title="Detalhes da Solicitação" icon={ClipboardList} onClose={onClose} />`.
- Replace footer with `<ModalFooter>...buttons...</ModalFooter>`.

### 5. `PcmCancelModal.tsx`
**Current state:** `fixed inset-0 ...` custom modal structure.
**Changes:**
- Replace custom root with `<Modal isOpen={isOpen} onClose={onClose} size="md">`.
- Replace header with `<ModalHeader title="Cancelar Solicitação" icon={AlertTriangle} onClose={onClose} />`.
- Replace footer with `<ModalFooter>...buttons...</ModalFooter>`.

## Next Steps
The implementer agent will take this strategy and apply the replacements safely, taking care of preserving the complex logic (file uploads, time diffs, nested components).
