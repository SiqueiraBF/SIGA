-- ==============================================================================
-- FIX FOR CRIT-03, CRIT-04, CRIT-05
-- ==============================================================================

-- CRIT-03: Revogar execução pública (anon) das funções SECURITY DEFINER sensíveis
REVOKE EXECUTE ON FUNCTION public.admin_update_user_password FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_is_admin FROM anon;
REVOKE EXECUTE ON FUNCTION public.confirm_invoice_view FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_auth_user_farm_id FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_auth_user_module_delete_scope FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_auth_user_module_edit_scope FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_auth_user_module_view_scope FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_auth_user_role FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_module_access FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin FROM anon;
REVOKE EXECUTE ON FUNCTION public.prevent_privilege_escalation FROM anon;

-- CRIT-04: Revogar execução autenticada na função crítica de troca de senha
-- (Deve ser chamada apenas por service_role via Edge Function)
REVOKE EXECUTE ON FUNCTION public.admin_update_user_password FROM authenticated;

-- CRIT-05: Corrigir search_path mutável em funções SECURITY DEFINER para evitar hijacking
ALTER FUNCTION public.check_is_admin SET search_path = '';
ALTER FUNCTION public.prevent_privilege_escalation SET search_path = '';
ALTER FUNCTION public.admin_update_user_password SET search_path = '';
ALTER FUNCTION public.is_admin SET search_path = '';
ALTER FUNCTION public.has_module_access SET search_path = '';
ALTER FUNCTION public.get_request_dashboard_stats SET search_path = '';
ALTER FUNCTION public.confirm_invoice_view SET search_path = '';
ALTER FUNCTION public.update_updated_at_column SET search_path = '';
