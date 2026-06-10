# Plan for Phase 2 implementation - Pagamentos Fora do Prazo

This plan outlines the steps to implement and verify the requirements for Phase 2 of the 'Pagamentos Fora do Prazo' module.

## Implementation Steps

### 1. Dropdown Active Filtering (`src/components/out-of-deadline-payments/PaymentFormModal.tsx`)
- Modify `loadResponsiblesData` to fetch active users via `userService.listActiveUsers()` and active responsibles via `outOfDeadlinePaymentService.getResponsibles(true)`.
- Modify `loadSectors` to fetch active sectors via `outOfDeadlinePaymentService.getSectors(true)`.

### 2. Custom Inline React Modals (`src/components/out-of-deadline-payments/PaymentFormModal.tsx`)
- Import `Modal`, `ModalHeader`, and `ModalFooter` from `../ui/`.
- Replace `window.prompt` dialogs in `handleQuickCreateSector` and `handleQuickCreateResponsible` with inline modal triggers.
- Implement forms in the inline modals to capture and submit new Sectors and Responsibles.
- Set up state variables: `isSectorModalOpen`, `newSectorName`, `isResponsibleModalOpen`, `newResponsibleName`.

### 3. Settings UI & Cascading Editing/Deletion (`src/components/out-of-deadline-payments/PaymentSettingsModal.tsx`)
- Import `ConfirmDialog` and icons (`Power`, `Pencil`, `Check`, `X`) from `lucide-react` or `../ui/`.
- Fetch all sectors and responsibles with `false` (including inactive ones) via `getSectors(false)` and `getResponsibles(false)`.
- Render active status badges/labels and toggle buttons calling `toggleSectorStatus`/`toggleResponsibleStatus`.
- Implement inline editing inputs when clicking the Pencil icon. Update buttons call `updateSector`/`updateResponsible`, cascading changes.
- Implement deletion checks: click trash button -> check usage -> if in use, block and show warning toast -> else open `<ConfirmDialog>` to delete.

### 4. Reorganize Print Modal PDF Grid Layout (`src/components/out-of-deadline-payments/PaymentPrintModal.tsx`)
- Reorganize the grid so "Fornecedor" has `col-span-2`.
- Align remaining columns (Unidade, Responsável, Tipo/Nº Doc, Data Lançamento, Responsável Lançamento) to use `col-span-1` or full width to have plenty of breathing room.

## Verification Plan

### Technical Verification
- Run TypeScript compilation check: `npx tsc --noEmit` to verify no compilation errors.
- Perform a Forensic Audit to check for design token conformance and no integrity violations.

### Functional Verification
- Verify dropdown lists only contain active elements.
- Verify clicking "+ Cadastrar Novo" opens styled inline modals.
- Verify renaming cascaded to payments table.
- Verify deleting used sectors/responsibles is blocked, and unused ones are deleted cleanly.
- Verify print modal grid layout works correctly.
