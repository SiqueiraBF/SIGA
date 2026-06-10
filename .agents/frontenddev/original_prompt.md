## 2026-06-10T17:46:40Z
You are a Frontend Developer subagent. Your mission is to implement code adjustments for Phase 2 of the 'Pagamentos Fora do Prazo' module in three components.

Files to modify:
1. `src/components/out-of-deadline-payments/PaymentFormModal.tsx`
2. `src/components/out-of-deadline-payments/PaymentSettingsModal.tsx`
3. `src/components/out-of-deadline-payments/PaymentPrintModal.tsx`

Requirements:

### R1. Active Filter for Users and Responsibles
- In the "Responsável" dropdown inside PaymentFormModal.tsx, list only active users (obtained from `userService.listActiveUsers()`) and active responsibles (obtained from `outOfDeadlinePaymentService.getResponsibles(true)`).
- In the "Setor Solicitante" dropdown inside PaymentFormModal.tsx, list only active sectors (obtained from `outOfDeadlinePaymentService.getSectors(true)`).

### R2. Replace Browser Dialogs with Elegant Modals
- In PaymentFormModal.tsx, clicking on "+ Cadastrar Novo" for both "Setor Solicitante" and "Responsável" must open custom, inline React modals styled with the "Elite" (Light/Blue Premium) visual identity instead of using `window.prompt`.
- Backdrop blur, rounded borders, soft shadows, input focus styles, and a responsive active scaling (`active:scale-95`) on buttons. Use imported Modal components from `../ui/Modal`, `../ui/ModalHeader`, and `../ui/ModalFooter`.
- When form is submitted inside the inline modals, call creation methods on `outOfDeadlinePaymentService`, update list of sectors/responsibles, select the newly created item, close modal, and display success toast.

### R3. Status Toggles, Editing, and Conditional Deletion in Settings
- Modify PaymentSettingsModal.tsx to:
  - Fetch all sectors and responsibles including inactive ones (`getSectors(false)` and `getResponsibles(false)`).
  - Add status toggle switches/buttons (active/inactive) calling `toggleSectorStatus` and `toggleResponsibleStatus` when clicked.
  - Add edit controls (pencil icon) to rename a sector or responsible. Rename actions must be inline (input field replacing the name with Save/Cancel buttons) and call `updateSector`/`updateResponsible` which cascade the name change to all corresponding records in `out_of_deadline_payments`.
  - Check usage using `checkSectorUsage`/`checkResponsibleUsage` when the user clicks the delete button (trash icon). If the sector/responsible is in use (count > 0), block deletion and show a toast warning suggesting deactivation. If not in use, allow deletion.
  - Replace all native browser `confirm` dialogs in this file with the custom `<ConfirmDialog>` from `../ui/ConfirmDialog`.

### R4. Reorganize Print Modal PDF Grid Layout
- In PaymentPrintModal.tsx, change the details grid layout. Give more space to the "Fornecedor" column by making it take `col-span-2` in the 3-column desktop layout.
- Distribute the remaining columns so that they have breathing space and do not squeeze. Recommended layout:
  - Row 1: Unidade (Fazenda) (col-span-1), Fornecedor (col-span-2)
  - Row 2: Tipo/Nº Doc (col-span-1), Responsável (col-span-1), Data Lançamento (col-span-1)
  - Row 3: Responsável pelo Lançamento (col-span-3)

Quality Gate & Verification:
- Validate visual identity meets Design System Elite standards.
- Run `npx tsc --noEmit` and check for compile/type errors.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please report back when complete, listing the modifications and verification results.
