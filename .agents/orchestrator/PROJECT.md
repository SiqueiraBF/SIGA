# Project: Saving Form Modal Elite Refactor
# Scope: Global Modals and SavingFormModal

## Architecture
- Components affected:
  - `src/components/ui/Modal.tsx`
  - `src/components/ui/ModalHeader.tsx`
  - `src/components/ui/ModalFooter.tsx`
  - `src/components/savings/SavingFormModal.tsx`

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Refactor UI Modals | Modal.tsx, ModalHeader.tsx, ModalFooter.tsx, SavingFormModal.tsx | none | PLANNED |

## Interface Contracts
- `ModalHeader` now accepts `eliteStyle?: boolean` and `statusBadge?: React.ReactNode`.
- `ModalFooter` now accepts `startActions?: React.ReactNode` and `endActions?: React.ReactNode`.
