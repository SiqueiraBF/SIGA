# Scope: db_migration

## Architecture
- `pdm_ai_logs` table in Supabase.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1.1 | create_table | Create migration script for `pdm_ai_logs` with columns: id, descricao_bruta, status_retornado, categoria_detectada, mensagem_erro, descricao_padronizada, is_simulacao, created_at. | none | DONE |

## Interface Contracts
- Table `pdm_ai_logs` must have RLS active.

## Code Layout
- `supabase/migrations/`
