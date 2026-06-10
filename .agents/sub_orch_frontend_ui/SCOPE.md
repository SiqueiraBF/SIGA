# Scope: frontend_ui

## Architecture
- `src/components/RequestForm/PdmManual/index.tsx`
- New tab "Análise de IA" that displays logs from `pdm_ai_logs` where `status_retornado` != 'Aprovado'. Include a way to easily copy the `descricao_bruta` from the table row.
- Update `compilePromptMarkdown` in the same file so the AI prompt clearly asks for `categoria_detectada`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 3.1 | update_frontend | Update PdmManual frontend UI as per architecture. | M1, M2 | DONE |

## Interface Contracts
### Frontend ↔ Database
- Fetches from `pdm_ai_logs` where `status_retornado` != 'Aprovado'. Needs standard components (e.g., existing `DataTable`).
- **UI/UX Rule**: Use Solid/Blue Premium pattern tokens.

## Code Layout
- `src/components/RequestForm/PdmManual/`
