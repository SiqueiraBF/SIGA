# Scope: Replace native alerts and confirms in Stock Transfer

## Architecture
- Replace `alert` with `toast` from `react-hot-toast`
- Replace `confirm` with `ConfirmDialog` component. Requires state management for the dialog.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Refactor UI | `src/components/StockRequestForm.tsx`, `src/pages/StockRequestList.tsx` | none | DONE |
