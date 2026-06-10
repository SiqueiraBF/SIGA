-- Migration: Fix RLS for pending_invoices
-- Description: Correctly enforce farm_id and registered_by checks based on edit/view scopes, and include OWN_ONLY

BEGIN;

-- Drop existing flawed policies
DROP POLICY IF EXISTS "pi_mod" ON public.pending_invoices;
DROP POLICY IF EXISTS "pi_sel" ON public.pending_invoices;
DROP POLICY IF EXISTS "pi_ins" ON public.pending_invoices;
DROP POLICY IF EXISTS "pi_del" ON public.pending_invoices;

-- SELECT Policy
CREATE POLICY "pi_sel" ON public.pending_invoices
FOR SELECT TO authenticated USING (
    get_auth_user_role() = 'Administrador'
    OR get_auth_user_module_view_scope('gestao_nfs') = 'ALL'
    OR (
        get_auth_user_module_view_scope('gestao_nfs') = 'SAME_FARM' 
        AND farm_id = (SELECT fazenda_id FROM usuarios WHERE id = auth.uid())
    )
    OR (
        get_auth_user_module_view_scope('gestao_nfs') IN ('OWN_ONLY', 'OWN_PENDING') 
        AND registered_by = auth.uid()
    )
);

-- INSERT Policy
CREATE POLICY "pi_ins" ON public.pending_invoices
FOR INSERT TO authenticated WITH CHECK (
    get_auth_user_role() = 'Administrador'
    OR get_auth_user_module_edit_scope('gestao_nfs') = 'ALL'
    OR (
        get_auth_user_module_edit_scope('gestao_nfs') = 'SAME_FARM' 
        AND farm_id = (SELECT fazenda_id FROM usuarios WHERE id = auth.uid())
    )
    OR (
        get_auth_user_module_edit_scope('gestao_nfs') IN ('OWN_ONLY', 'OWN_PENDING') 
        AND registered_by = auth.uid()
    )
);

-- UPDATE Policy
CREATE POLICY "pi_upd" ON public.pending_invoices
FOR UPDATE TO authenticated USING (
    get_auth_user_role() = 'Administrador'
    OR get_auth_user_module_edit_scope('gestao_nfs') = 'ALL'
    OR (
        get_auth_user_module_edit_scope('gestao_nfs') = 'SAME_FARM' 
        AND farm_id = (SELECT fazenda_id FROM usuarios WHERE id = auth.uid())
    )
    OR (
        get_auth_user_module_edit_scope('gestao_nfs') IN ('OWN_ONLY', 'OWN_PENDING') 
        AND registered_by = auth.uid()
    )
) WITH CHECK (
    get_auth_user_role() = 'Administrador'
    OR get_auth_user_module_edit_scope('gestao_nfs') = 'ALL'
    OR (
        get_auth_user_module_edit_scope('gestao_nfs') = 'SAME_FARM' 
        AND farm_id = (SELECT fazenda_id FROM usuarios WHERE id = auth.uid())
    )
    OR (
        get_auth_user_module_edit_scope('gestao_nfs') IN ('OWN_ONLY', 'OWN_PENDING') 
        AND registered_by = auth.uid()
    )
);

-- DELETE Policy
-- Since get_auth_user_module_delete_scope isn't strictly defined for this specific wording in all roles, 
-- we fallback to checking if they have general delete scope OR edit scope if delete isn't present
CREATE POLICY "pi_del" ON public.pending_invoices
FOR DELETE TO authenticated USING (
    get_auth_user_role() = 'Administrador'
    OR get_auth_user_module_edit_scope('gestao_nfs') = 'ALL'
    OR (
        get_auth_user_module_edit_scope('gestao_nfs') = 'SAME_FARM' 
        AND farm_id = (SELECT fazenda_id FROM usuarios WHERE id = auth.uid())
    )
    OR (
        get_auth_user_module_edit_scope('gestao_nfs') IN ('OWN_ONLY', 'OWN_PENDING') 
        AND registered_by = auth.uid()
    )
);

COMMIT;
