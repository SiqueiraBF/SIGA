# Plan: Refatoração UI/UX: Layout Focado PCM

## Architecture & Code Layout
- `src/components/ui/FileUpload.tsx` & `src/components/ui/FileList.tsx`: New global reusable components for file selection and display.
- `src/pages/PcmRequests.tsx`: Rename "Lead Time" to "SLA Atendimento".
- `src/components/pcm/PcmRequestModal.tsx`: Vertical Layout, remove Sidebar, use CSS Grid for sections (Contexto, Dados, O que precisa, Anexos).
- `src/components/pcm/PcmDetailsModal.tsx`: Vertical Ficha Layout. Status banner, Cards for details, responsive attachments footer.
- `src/components/pcm/PcmConfirmModal.tsx`: Vertical Layout. Top Section for Histórico, Bottom for Ação (inputs centralizados).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Global Components | Create FileUpload.tsx & FileList.tsx | none | PLANNED |
| 2 | PcmRequests | Rename Lead Time to SLA Atendimento | none | PLANNED |
| 3 | PcmRequestModal | Vertical Layout refactor | M1 | PLANNED |
| 4 | PcmConfirmModal | Vertical Layout refactor | M1 | PLANNED |
| 5 | PcmDetailsModal | Vertical Layout refactor | M1 | PLANNED |
