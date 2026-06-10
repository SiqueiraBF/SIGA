# Project: PDM AI Analytics Submodule

## Architecture
- **Database**: `pdm_ai_logs` table in Supabase.
- **Backend Edge Function**: `analyze-pdm` intercepts AI requests, extracts 4 fields (including `categoria_detectada`), and logs them into `pdm_ai_logs`.
- **Frontend UI**: PDM Manual gets a new tab "Análise de IA" that displays logs from `pdm_ai_logs` where `status_retornado` != 'Aprovado'. Needs to copy `descricao_bruta`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | db_migration | Create `pdm_ai_logs` table with required columns. | none | DONE |
| 2 | backend_edge | Update `analyze-pdm` edge function to insert logs. | M1 | DONE |
| 3 | frontend_ui | Update `src/components/RequestForm/PdmManual/index.tsx` for new tab & prompt. | M1 | DONE |

## Interface Contracts
### AI Payload ↔ Edge Function
- The AI must return a JSON containing `categoria_detectada` in addition to its previous fields.

### Edge Function ↔ Database
- Inserts into `pdm_ai_logs`: `descricao_bruta`, `status_retornado`, `categoria_detectada`, `mensagem_erro`, `descricao_padronizada`, `is_simulacao`.

### Frontend ↔ Database
- Fetches from `pdm_ai_logs` where `status_retornado` != 'Aprovado'.

## Code Layout
- Database migrations: `supabase/migrations/`
- Edge functions: `supabase/functions/`
- Frontend components: `src/components/RequestForm/PdmManual/`
