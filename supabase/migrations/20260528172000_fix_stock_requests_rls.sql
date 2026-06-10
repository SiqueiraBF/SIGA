-- Migration: Fix Stock Requests RLS
-- Date: 2026-05-28
-- Description: Replace 'gestao_estoque' module check with 'gestao_transferencias' module check for stock requests and request items, implementing proper atomic RLS rules.

BEGIN;

-- 1. Drop existing policies
DROP POLICY IF EXISTS "sr_sel" ON public.stock_requests;
DROP POLICY IF EXISTS "sr_mod" ON public.stock_requests;
DROP POLICY IF EXISTS "sri_sel" ON public.stock_request_items;
DROP POLICY IF EXISTS "sri_mod" ON public.stock_request_items;

-- 2. Ensure Row Level Security (RLS) is enabled
ALTER TABLE public.stock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_request_items ENABLE ROW LEVEL SECURITY;

-- 3. Create atomic policies for public.stock_requests
-- SELECT Policy
CREATE POLICY "sr_select" ON public.stock_requests
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR
    public.has_module_access('gestao_transferencias', farm_id) OR
    requester_id = auth.uid()
  );

-- INSERT Policy
CREATE POLICY "sr_insert" ON public.stock_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin() OR
    public.get_auth_user_module_edit_scope('gestao_transferencias') = 'ALL' OR
    (public.get_auth_user_module_edit_scope('gestao_transferencias') = 'FARM' AND farm_id = public.get_auth_user_farm_id()) OR
    (public.get_auth_user_module_edit_scope('gestao_transferencias') = 'OWN_ONLY' AND requester_id = auth.uid())
  );

-- UPDATE Policy
CREATE POLICY "sr_update" ON public.stock_requests
  FOR UPDATE TO authenticated
  USING (
    public.is_admin() OR
    public.get_auth_user_module_edit_scope('gestao_transferencias') = 'ALL' OR
    (public.get_auth_user_module_edit_scope('gestao_transferencias') = 'FARM' AND farm_id = public.get_auth_user_farm_id() AND status IN ('DRAFT', 'PENDING')) OR
    (public.get_auth_user_module_edit_scope('gestao_transferencias') = 'OWN_ONLY' AND requester_id = auth.uid() AND status IN ('DRAFT', 'PENDING'))
  )
  WITH CHECK (
    public.is_admin() OR
    public.get_auth_user_module_edit_scope('gestao_transferencias') = 'ALL' OR
    (public.get_auth_user_module_edit_scope('gestao_transferencias') = 'FARM' AND farm_id = public.get_auth_user_farm_id() AND status IN ('DRAFT', 'PENDING')) OR
    (public.get_auth_user_module_edit_scope('gestao_transferencias') = 'OWN_ONLY' AND requester_id = auth.uid() AND status IN ('DRAFT', 'PENDING'))
  );

-- DELETE Policy
CREATE POLICY "sr_delete" ON public.stock_requests
  FOR DELETE TO authenticated
  USING (
    public.is_admin() OR
    public.get_auth_user_module_edit_scope('gestao_transferencias') = 'ALL' OR
    (public.get_auth_user_module_edit_scope('gestao_transferencias') = 'FARM' AND farm_id = public.get_auth_user_farm_id() AND status = 'DRAFT') OR
    (public.get_auth_user_module_edit_scope('gestao_transferencias') = 'OWN_ONLY' AND requester_id = auth.uid() AND status = 'DRAFT')
  );

-- 4. Create atomic policies for public.stock_request_items
-- SELECT Policy
CREATE POLICY "sri_select" ON public.stock_request_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stock_requests sr
      WHERE sr.id = stock_request_items.request_id
    )
  );

-- INSERT Policy
CREATE POLICY "sri_insert" ON public.stock_request_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stock_requests sr
      WHERE sr.id = stock_request_items.request_id
        AND (
          public.is_admin() OR
          public.get_auth_user_module_edit_scope('gestao_transferencias') = 'ALL' OR
          (public.get_auth_user_module_edit_scope('gestao_transferencias') = 'FARM' AND sr.farm_id = public.get_auth_user_farm_id() AND sr.status = 'DRAFT') OR
          (public.get_auth_user_module_edit_scope('gestao_transferencias') = 'OWN_ONLY' AND sr.requester_id = auth.uid() AND sr.status = 'DRAFT')
        )
    )
  );

-- UPDATE Policy
CREATE POLICY "sri_update" ON public.stock_request_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stock_requests sr
      WHERE sr.id = stock_request_items.request_id
        AND (
          public.is_admin() OR
          public.get_auth_user_module_edit_scope('gestao_transferencias') = 'ALL' OR
          (public.get_auth_user_module_edit_scope('gestao_transferencias') = 'FARM' AND sr.farm_id = public.get_auth_user_farm_id() AND sr.status = 'DRAFT') OR
          (public.get_auth_user_module_edit_scope('gestao_transferencias') = 'OWN_ONLY' AND sr.requester_id = auth.uid() AND sr.status = 'DRAFT')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stock_requests sr
      WHERE sr.id = stock_request_items.request_id
        AND (
          public.is_admin() OR
          public.get_auth_user_module_edit_scope('gestao_transferencias') = 'ALL' OR
          (public.get_auth_user_module_edit_scope('gestao_transferencias') = 'FARM' AND sr.farm_id = public.get_auth_user_farm_id() AND sr.status = 'DRAFT') OR
          (public.get_auth_user_module_edit_scope('gestao_transferencias') = 'OWN_ONLY' AND sr.requester_id = auth.uid() AND sr.status = 'DRAFT')
        )
    )
  );

-- DELETE Policy
CREATE POLICY "sri_delete" ON public.stock_request_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stock_requests sr
      WHERE sr.id = stock_request_items.request_id
        AND (
          public.is_admin() OR
          public.get_auth_user_module_edit_scope('gestao_transferencias') = 'ALL' OR
          (public.get_auth_user_module_edit_scope('gestao_transferencias') = 'FARM' AND sr.farm_id = public.get_auth_user_farm_id() AND sr.status = 'DRAFT') OR
          (public.get_auth_user_module_edit_scope('gestao_transferencias') = 'OWN_ONLY' AND sr.requester_id = auth.uid() AND sr.status = 'DRAFT')
        )
    )
  );

COMMIT;
