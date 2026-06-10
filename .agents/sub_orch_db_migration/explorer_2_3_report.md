# Handoff Report: `pdm_ai_logs` Table Migration Fix

## Observation
- The migration file `supabase/migrations/20260606221711_create_pdm_ai_logs.sql` currently lacks a `user_id` column.
- The `INSERT` policy allows any authenticated user to insert records without checking ownership, using `WITH CHECK (true)`.
- The reviewer rejected this per `dbasecurity.md` rules which require `auth.uid()` based ownership policies for inserts to maintain security and traceability.

## Logic Chain
1. To address the missing column, we must add `user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()` to the `pdm_ai_logs` table schema.
2. To address the policy violation, the INSERT policy must restrict rows to be associated with the authenticated user executing the command. This is achieved by changing the condition to `WITH CHECK (user_id = auth.uid())`.
3. Existing requirements for `is_admin()` remain, so the SELECT policy allowing administrators to view logs must be preserved. A supplementary SELECT policy for the user to view their own logs should be included so users can access what they insert.

## Caveats
- I did not modify the existing file or run the migration, as per the read-only constraints.
- We are assuming `public.is_admin()` is functioning correctly, as it was used without issue in previous migrations. 
- You may choose to overwrite `20260606221711_create_pdm_ai_logs.sql` or create a new migration depending on your version control practices.

## Conclusion
The migration script should be rewritten to incorporate the `user_id` column and the restrictive RLS policies for inserts and selects.

**Recommended SQL Content:**
```sql
-- Create pdm_ai_logs table
CREATE TABLE IF NOT EXISTS public.pdm_ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descricao_bruta TEXT,
    status_retornado TEXT,
    categoria_detectada TEXT,
    mensagem_erro TEXT,
    descricao_padronizada TEXT,
    is_simulacao BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- Enable RLS
ALTER TABLE public.pdm_ai_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to INSERT their own logs
CREATE POLICY "Allow authenticated users to insert own logs"
    ON public.pdm_ai_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Policy: Allow authenticated users to view their own logs
CREATE POLICY "Allow authenticated users to view own logs"
    ON public.pdm_ai_logs
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Policy: Allow administrators to SELECT all logs
CREATE POLICY "Allow administrators to select"
    ON public.pdm_ai_logs
    FOR SELECT
    TO authenticated
    USING (public.is_admin());
```

## Verification Method
1. Have the DBA agent apply the recommended SQL (e.g. rewrite `20260606221711_create_pdm_ai_logs.sql`).
2. Run `supabase db reset` or `supabase migration up` to deploy the schema locally.
3. Attempt to insert a record bypassing the `auth.uid()` default to test that the `WITH CHECK (user_id = auth.uid())` policy throws a permissions error.
