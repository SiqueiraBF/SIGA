-- Migration: Fix Direct Receipts RLS Policies
-- Date: 2026-06-01
-- Description: Replace composite dr_sel and dr_mod policies on direct_receipts with atomic, scope-aware policies (ALL, FARM/SAME_FARM, OWN_ONLY) for SELECT, INSERT, UPDATE, and DELETE.

BEGIN;

-- 1. Drop existing legacy policies
DROP POLICY IF EXISTS "dr_sel" ON public.direct_receipts;
DROP POLICY IF EXISTS "dr_mod" ON public.direct_receipts;
DROP POLICY IF EXISTS "Permitir exclusão pelo dono ou admin" ON public.direct_receipts;

-- 2. Ensure RLS is enabled
ALTER TABLE public.direct_receipts ENABLE ROW LEVEL SECURITY;

-- 3. SELECT Policy
CREATE POLICY "dr_select" ON public.direct_receipts
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR
    public.get_auth_user_module_view_scope('gestao_recebimento_direto') = 'ALL' OR
    (public.get_auth_user_module_view_scope('gestao_recebimento_direto') IN ('FARM', 'SAME_FARM') AND fazenda_id = public.get_auth_user_farm_id()) OR
    (public.get_auth_user_module_view_scope('gestao_recebimento_direto') = 'OWN_ONLY' AND usuario_id = auth.uid())
  );

-- 4. INSERT Policy
CREATE POLICY "dr_insert" ON public.direct_receipts
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin() OR
    public.get_auth_user_module_edit_scope('gestao_recebimento_direto') = 'ALL' OR
    (public.get_auth_user_module_edit_scope('gestao_recebimento_direto') IN ('FARM', 'SAME_FARM') AND fazenda_id = public.get_auth_user_farm_id()) OR
    (public.get_auth_user_module_edit_scope('gestao_recebimento_direto') = 'OWN_ONLY' AND usuario_id = auth.uid())
  );

-- 5. UPDATE Policy
CREATE POLICY "dr_update" ON public.direct_receipts
  FOR UPDATE TO authenticated
  USING (
    public.is_admin() OR
    public.get_auth_user_module_edit_scope('gestao_recebimento_direto') = 'ALL' OR
    (public.get_auth_user_module_edit_scope('gestao_recebimento_direto') IN ('FARM', 'SAME_FARM') AND fazenda_id = public.get_auth_user_farm_id()) OR
    (public.get_auth_user_module_edit_scope('gestao_recebimento_direto') = 'OWN_ONLY' AND usuario_id = auth.uid())
  )
  WITH CHECK (
    public.is_admin() OR
    public.get_auth_user_module_edit_scope('gestao_recebimento_direto') = 'ALL' OR
    (public.get_auth_user_module_edit_scope('gestao_recebimento_direto') IN ('FARM', 'SAME_FARM') AND fazenda_id = public.get_auth_user_farm_id()) OR
    (public.get_auth_user_module_edit_scope('gestao_recebimento_direto') = 'OWN_ONLY' AND usuario_id = auth.uid())
  );

-- 6. DELETE Policy
CREATE POLICY "dr_delete" ON public.direct_receipts
  FOR DELETE TO authenticated
  USING (
    public.is_admin() OR
    (auth.uid() = usuario_id) OR
    public.get_auth_user_module_edit_scope('gestao_recebimento_direto') = 'ALL'
  );

COMMIT;
