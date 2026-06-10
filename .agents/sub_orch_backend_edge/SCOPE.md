# Scope: backend_edge

## Architecture
- `analyze-pdm` edge function.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 2.1 | update_edge_function | Update `supabase/functions/analyze-pdm/index.ts` to expect a 4-field JSON from the AI (adding `categoria_detectada`) and insert a record into `pdm_ai_logs`. | none | DONE |

## Interface Contracts
### AI Payload ↔ Edge Function
- The AI must return a JSON containing `categoria_detectada` in addition to its previous fields.

### Edge Function ↔ Database
- Inserts into `pdm_ai_logs`: `descricao_bruta`, `status_retornado`, `categoria_detectada`, `mensagem_erro`, `descricao_padronizada`, `is_simulacao`.
- Note: The database table now has a `user_id` field referencing `auth.users(id)` and RLS enforces `WITH CHECK (user_id = auth.uid())`. Since this is an edge function, if it acts on behalf of the user, ensure the Supabase client used for insertion passes the user's auth token, or if using a service role key, ensure `user_id` is passed explicitly from the request context. The edge function must handle this correctly.

## Code Layout
- `supabase/functions/`
