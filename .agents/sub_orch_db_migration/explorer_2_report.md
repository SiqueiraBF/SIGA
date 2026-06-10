# Handoff Report: `pdm_ai_logs` Table Migration

## 1. Observation
- The project migrations are stored in the directory `supabase/migrations/` (found via `find_by_name`).
- The existing migration files follow the naming convention `YYYYMMDDHHMMSS_<description>.sql` (e.g., `20260529005401_create_pdm_manual.sql`, `20260528172000_fix_stock_requests_rls.sql`).
- The `dbasecurity.md` guidelines state the following requirements:
  - Tables must have RLS active.
  - Policies must be atomic (separate rules for SELECT, INSERT, UPDATE, DELETE).
  - Primary keys must be `UUID` types.
  - Timestamps must be `TIMESTAMPTZ`.
  - Column and table names must follow `snake_case` and pluralization (the requested table name is `pdm_ai_logs`).
  - Indexes should be created for frequent searches.
- The columns specified by the user are: `id`, `descricao_bruta`, `status_retornado`, `categoria_detectada`, `mensagem_erro`, `descricao_padronizada`, `is_simulacao`, `created_at`. No `tenant_id` or `branch_id` was explicitly provided for this table.

## 2. Logic Chain
1. **Naming Convention:** Based on the observed `supabase/migrations/` contents, the new file should be named using the current timestamp, e.g., `20260606221451_create_pdm_ai_logs.sql`.
2. **Schema Definition:** 
   - `id` will be `UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
   - `created_at` will be `TIMESTAMPTZ DEFAULT now()`.
   - Text fields like `descricao_bruta`, `status_retornado`, `categoria_detectada`, `mensagem_erro`, and `descricao_padronizada` will be `TEXT` or `VARCHAR`. `TEXT` is preferred in PostgreSQL unless length constraints are necessary.
   - `is_simulacao` will be `BOOLEAN DEFAULT false`.
3. **Security (RLS):** 
   - We must call `ALTER TABLE public.pdm_ai_logs ENABLE ROW LEVEL SECURITY;`.
   - Since no `branch_id` or `user_id` is present to scope rows by tenant/owner, and the table seems to log AI background jobs/events, we will restrict all atomic operations (SELECT, INSERT, UPDATE, DELETE) to the `authenticated` role. Any system background jobs via Edge Functions using the `service_role_key` will bypass RLS automatically.
4. **Performance:** As per the DBA rules to index frequent search columns, we will add indexes for `created_at` (for chronological filtering) and `status_retornado` (for filtering logs by status).

## 3. Caveats
- **Tenant Isolation:** The table `pdm_ai_logs` does not contain a `user_id` or `branch_id` field. Therefore, multi-tenancy isolation (a core rule in `dbasecurity.md`) cannot be applied at the row level here. If the AI logs belong to specific users or branches, those columns should be added to the schema before applying the migration. The current recommendation assumes logs are system-wide or only readable by admins/system.
- **Update/Delete Rules:** I have provided `UPDATE` and `DELETE` policies for `authenticated` users to satisfy the "atomic policies" requirement. For a purely immutable log table, the orchestrator/DBA agent might choose to omit `UPDATE` and `DELETE` policies, which would effectively block those actions. 

## 4. Conclusion
The proposed fix strategy is to create a new migration file named `20260606221451_create_pdm_ai_logs.sql` in `supabase/migrations/`. 

### Recommended SQL Content

```sql
-- Migration: 20260606221451_create_pdm_ai_logs.sql

-- 1. Create the table
CREATE TABLE public.pdm_ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descricao_bruta TEXT,
    status_retornado TEXT,
    categoria_detectada TEXT,
    mensagem_erro TEXT,
    descricao_padronizada TEXT,
    is_simulacao BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.pdm_ai_logs ENABLE ROW LEVEL SECURITY;

-- 3. Atomic RLS Policies for authenticated users
CREATE POLICY "Permitir SELECT para usuarios autenticados em pdm_ai_logs" 
ON public.pdm_ai_logs 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Permitir INSERT para usuarios autenticados em pdm_ai_logs" 
ON public.pdm_ai_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Permitir UPDATE para usuarios autenticados em pdm_ai_logs" 
ON public.pdm_ai_logs 
FOR UPDATE
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir DELETE para usuarios autenticados em pdm_ai_logs" 
ON public.pdm_ai_logs 
FOR DELETE
TO authenticated 
USING (true);

-- 4. Indexes for performance
CREATE INDEX idx_pdm_ai_logs_created_at ON public.pdm_ai_logs(created_at DESC);
CREATE INDEX idx_pdm_ai_logs_status ON public.pdm_ai_logs(status_retornado);
```

## 5. Verification Method
1. Create the file `supabase/migrations/20260606221451_create_pdm_ai_logs.sql` with the contents above.
2. Run `supabase db reset` or apply the migration to the local Supabase container to verify syntax and schema creation.
3. Use the `database_query_preview` skill (if available) or raw SQL via the `execute_sql` tool to run a dry-run test simulating an `authenticated` user (`auth.uid()`) performing an INSERT and SELECT on `public.pdm_ai_logs`.
