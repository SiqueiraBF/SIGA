-- Migration: Add responsibles to out of deadline payments and create responsibles table
-- Date: 2026-06-10
-- Description: Add responsavel column to out_of_deadline_payments and create out_of_deadline_payment_responsibles.

BEGIN;

-- 1. Add responsavel column to out_of_deadline_payments table
ALTER TABLE public.out_of_deadline_payments ADD COLUMN IF NOT EXISTS responsavel text DEFAULT NULL;

-- 2. Create out_of_deadline_payment_responsibles table
CREATE TABLE IF NOT EXISTS public.out_of_deadline_payment_responsibles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.out_of_deadline_payment_responsibles ENABLE ROW LEVEL SECURITY;

-- 4. Create SELECT policy for authenticated users
CREATE POLICY odpr_sel ON public.out_of_deadline_payment_responsibles
    FOR SELECT
    TO authenticated
    USING (true);

-- 5. Create ALL (modification) policy for authenticated users matching criteria
CREATE POLICY odpr_mod ON public.out_of_deadline_payment_responsibles
    FOR ALL
    TO authenticated
    USING (
        ((get_auth_user_role())::text = 'Administrador'::text) OR 
        (get_auth_user_module_edit_scope('pagamentos_fora_prazo'::text) = ANY (ARRAY['ALL'::text, 'SAME_FARM'::text, 'OWN_PENDING'::text]))
    );

COMMIT;
