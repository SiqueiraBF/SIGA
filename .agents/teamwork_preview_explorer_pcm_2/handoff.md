# Handoff Report: PCM UI/UX Refactoring Plan

## 1. Observation
The PCM Module has five frontend files targeted for UI refactoring:
- `src/pages/PcmRequests.tsx`
- `src/components/pcm/PcmRequestModal.tsx`
- `src/components/pcm/PcmConfirmModal.tsx`
- `src/components/pcm/PcmDetailsModal.tsx`
- `src/components/pcm/PcmCancelModal.tsx`

`PcmRequests.tsx` currently has a hardcoded native HTML `<table>` from line 344 to 559. It handles tab state manually using HTML buttons with conditional classes. It relies on `window.confirm` for delete operations.
The four modal components are using manual `<div className="fixed inset-0 ...">` backdrops and manual header/footer wrappers, diverging from the new `.agent/rules/ui_component_catalog.md` standards which demand the use of `DataTable`, `TabBar`, `ConfirmDialog`, `Modal`, `ModalHeader`, and `ModalFooter`.

## 2. Logic Chain
- To follow the "Padrão Elite", the explicit HTML `<table>` in `PcmRequests.tsx` must be deleted and replaced with `<DataTable data={sortedRequests} columns={columns} ... />`.
- The manual tab buttons (`Lista de Solicitações` and `Indicadores`) can be seamlessly replaced by configuring `<TabBar tabs={[{id: 'list', ...}, {id: 'dashboard', ...}]} />`.
- The `window.confirm` call must be removed and replaced by tracking a `requestToDelete` string ID state, toggling `<ConfirmDialog>` openness.
- All 4 modals must discard the `fixed inset-0` wrapper and use the `<Modal>` component which already manages the backdrop, scroll locking, ESC key, and animation.
- All manual modal headers and footers can be swapped with `<ModalHeader>` and `<ModalFooter>`.

## 3. Caveats
- `PcmRequests.tsx` handles complex external sorting using `activeSortField` and `sortDirection`. When switching to `DataTable`, we should ensure `sortField` and `onSortChange` props are correctly mapped to preserve this manual sorting, or adapt the component logic.
- The `DataTable` lacks out-of-the-box support for the multiple custom buttons currently in the table actions column (edit, delete, confirm, cancel). This can be resolved by passing a custom React node via the `renderActions` prop.

## 4. Conclusion
The implementation plan is defined and written in `analysis.md`. The implementer can systematically follow the guide to substitute the five files' UI structures with the new UI Catalog components, leaving the underlying business logic undisturbed.

## 5. Verification Method
- After changes, run TypeScript type check: `npm run type-check` (or `npx tsc --noEmit`).
- Verify that `window.confirm` and `<table` no longer exist in `src/pages/PcmRequests.tsx`.
- Verify that the four modals import and use `Modal` from `src/components/ui/Modal.tsx`.
- Open the application and confirm the PCM page loads correctly without layout breaks, and tabs switch properly.
