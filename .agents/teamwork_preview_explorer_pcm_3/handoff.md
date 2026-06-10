# Handoff: PCM Module UI/UX Refactoring Plan

## 1. Observation
- The request requires refactoring the PCM frontend module to follow the "Padrão Elite" design tokens.
- Reference documentation provided: `ui_component_catalog.md` which lists `DataTable`, `TabBar`, `StatusBadge`, `TableActions`, `ConfirmDialog`, `Modal`, `ModalHeader`, `ModalFooter` as standard components.
- The target files are currently using native HTML and Tailwind elements for complex UI:
  - `src/pages/PcmRequests.tsx` uses native `<table>`, `window.confirm`, custom tab navigation buttons, and raw spans for badges.
  - Modals (`PcmRequestModal.tsx`, `PcmConfirmModal.tsx`, `PcmDetailsModal.tsx`, `PcmCancelModal.tsx`) use raw `div` containers with `fixed inset-0 bg-slate-900/60` and custom header/footer definitions.
- The business logic handles things like permissions (`canCreate`, `canEdit`, `canDelete`), and filtering logic, which must be preserved.

## 2. Logic Chain
1. **PcmRequests.tsx**: By replacing the manual tab buttons with `<TabBar>`, the `window.confirm` with `<ConfirmDialog>` and its local state, and the `<table>` with `<DataTable>`, we meet the exact acceptance criteria while adopting the robust UI tokens. `<StatusBadge>` will centralize the color logic for statuses.
2. **Modals**: By extracting the `fixed inset-0` wrappers and custom header/footer divs, and replacing them with `<Modal>`, `<ModalHeader>`, and `<ModalFooter>`, we ensure that all modals behave uniformly across the system (animations, backdrop, accessibility). The internal content structure (the "Split Layout") can be preserved inside the `<Modal>` boundary without losing business logic.

## 3. Caveats
- The exact properties expected by `DataTable`, `Modal`, and other UI components are assumed based on `ui_component_catalog.md`. The implementer must ensure the imported UI components actually export these exact props (e.g. checking `src/components/ui/Modal.tsx` for exact prop names if compilation errors occur).
- Custom actions in the table (like "Confirmar Solicitação" and "Cancelar Solicitação") might not have a direct slot in `<TableActions>`, so they should be combined visually near the standard edit/delete actions inside the `renderActions` callback.
- The `Modal` component might require a specific import path depending on project structure (e.g. `import { Modal } from '../components/ui/Modal'`).

## 4. Conclusion
The PCM module is ready to be refactored by the Frontend Dev subagent. The analysis file (`analysis.md`) provides clear, step-by-step strategies for swapping out raw HTML tags and manual alerts for their "Padrão Elite" catalog equivalents.

## 5. Verification Method
- **Static Analysis**: After implementation, ensure `grep -r "<table" src/pages/PcmRequests.tsx` returns empty.
- **Code Inspection**: Open `PcmRequests.tsx` to verify that `window.confirm` is removed and `<DataTable>` is implemented correctly. Open any of the modals to ensure the outer container is `<Modal>`.
- **Compilation**: Run the project TypeScript compiler (`tsc --noEmit` or via Vite) to ensure no typing breaks occurred with the new component props.
