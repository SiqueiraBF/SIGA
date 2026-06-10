-- Migration: Fix Out of Deadline Payments RLS
-- Date: 2026-06-02
-- Description: Implement proper atomic RLS rules based on profile manager for out of deadline payments.

BEGIN;

-- Helper functions for module scopes if they don't exist
CREATE OR REPLACE FUNCTION public.get_auth_user_module_view_scope(p_module text)
RETURNS text AS $$
DECLARE
  v_view_scope text;
BEGIN
  IF public.is_admin() THEN
    RETURN 'ALL';
  END IF;

  SELECT (permissoes->p_module->>'view_scope')::text INTO v_view_scope
  FROM public.funcoes f
  JOIN public.usuarios u ON u.funcao_id = f.id
  WHERE u.id = auth.uid();

  RETURN coalesce(v_view_scope, 'NONE');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_auth_user_module_edit_scope(p_module text)
RETURNS text AS $$
DECLARE
  v_edit_scope text;
BEGIN
  IF public.is_admin() THEN
    RETURN 'ALL';
  END IF;

  SELECT (permissoes->p_module->>'edit_scope')::text INTO v_edit_scope
  FROM public.funcoes f
  JOIN public.usuarios u ON u.funcao_id = f.id
  WHERE u.id = auth.uid();

  RETURN coalesce(v_edit_scope, 'NONE');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_auth_user_farm_id()
RETURNS uuid AS $$
DECLARE
  v_farm_id uuid;
BEGIN
  SELECT fazenda_id INTO v_farm_id
  FROM public.usuarios
  WHERE id = auth.uid();
  RETURN v_farm_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Drop existing policies
DROP POLICY IF EXISTS "odp_sel" ON public.out_of_deadline_payments;
DROP POLICY IF EXISTS "odp_mod" ON public.out_of_deadline_payments;
DROP POLICY IF EXISTS "Acesso late_payments" ON public.out_of_deadline_payments;
DROP POLICY IF EXISTS "Insert late_payments" ON public.out_of_deadline_payments;
DROP POLICY IF EXISTS "Update late_payments" ON public.out_of_deadline_payments;
DROP POLICY IF EXISTS "Acesso late_payments" ON public.late_payments;
DROP POLICY IF EXISTS "Insert late_payments" ON public.late_payments;
DROP POLICY IF EXISTS "Update late_payments" ON public.late_payments;
DROP POLICY IF EXISTS "lp_sel" ON public.late_payments;
DROP POLICY IF EXISTS "lp_mod" ON public.late_payments;

-- 2. Ensure Row Level Security (RLS) is enabled
-- We try to enable on both names in case it was renamed or created as out_of_deadline_payments
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'out_of_deadline_payments') THEN
    ALTER TABLE public.out_of_deadline_payments ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'late_payments') THEN
    ALTER TABLE public.late_payments ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 3. Create atomic policies for public.out_of_deadline_payments
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'out_of_deadline_payments') THEN
    EXECUTE '
    CREATE POLICY "odp_select" ON public.out_of_deadline_payments
      FOR SELECT TO authenticated
      USING (
        public.is_admin() OR
        public.get_auth_user_module_view_scope(''pagamentos_fora_prazo'') = ''ALL'' OR
        (public.get_auth_user_module_view_scope(''pagamentos_fora_prazo'') IN (''FARM'', ''SAME_FARM'') AND fazenda_id = public.get_auth_user_farm_id()) OR
        (public.get_auth_user_module_view_scope(''pagamentos_fora_prazo'') = ''OWN_ONLY'' AND user_id = auth.uid())
      );

    CREATE POLICY "odp_insert" ON public.out_of_deadline_payments
      FOR INSERT TO authenticated
      WITH CHECK (
        public.is_admin() OR
        public.get_auth_user_module_edit_scope(''pagamentos_fora_prazo'') = ''ALL'' OR
        (public.get_auth_user_module_edit_scope(''pagamentos_fora_prazo'') IN (''FARM'', ''SAME_FARM'') AND fazenda_id = public.get_auth_user_farm_id()) OR
        (public.get_auth_user_module_edit_scope(''pagamentos_fora_prazo'') = ''OWN_ONLY'' AND user_id = auth.uid()) OR
        (public.get_auth_user_module_view_scope(''pagamentos_fora_prazo'') != ''NONE'')
      );

    CREATE POLICY "odp_update" ON public.out_of_deadline_payments
      FOR UPDATE TO authenticated
      USING (
        public.is_admin() OR
        public.get_auth_user_module_edit_scope(''pagamentos_fora_prazo'') = ''ALL'' OR
        (public.get_auth_user_module_edit_scope(''pagamentos_fora_prazo'') IN (''FARM'', ''SAME_FARM'') AND fazenda_id = public.get_auth_user_farm_id()) OR
        (public.get_auth_user_module_edit_scope(''pagamentos_fora_prazo'') = ''OWN_ONLY'' AND user_id = auth.uid())
      )
      WITH CHECK (
        public.is_admin() OR
        public.get_auth_user_module_edit_scope(''pagamentos_fora_prazo'') = ''ALL'' OR
        (public.get_auth_user_module_edit_scope(''pagamentos_fora_prazo'') IN (''FARM'', ''SAME_FARM'') AND fazenda_id = public.get_auth_user_farm_id()) OR
        (public.get_auth_user_module_edit_scope(''pagamentos_fora_prazo'') = ''OWN_ONLY'' AND user_id = auth.uid())
      );

    CREATE POLICY "odp_delete" ON public.out_of_deadline_payments
      FOR DELETE TO authenticated
      USING (
        public.is_admin() OR
        public.get_auth_user_module_edit_scope(''pagamentos_fora_prazo'') = ''ALL'' OR
        (public.get_auth_user_module_edit_scope(''pagamentos_fora_prazo'') IN (''FARM'', ''SAME_FARM'') AND fazenda_id = public.get_auth_user_farm_id()) OR
        (public.get_auth_user_module_edit_scope(''pagamentos_fora_prazo'') = ''OWN_ONLY'' AND user_id = auth.uid())
      );
    ';
  END IF;
END $$;

COMMIT;
