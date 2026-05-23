-- Migration: Secure Goods Tables RLS
-- Description: Replace overly permissive using(true) policies with proper has_module_access checks

BEGIN;

-- 1. Fix goods_receipts
DROP POLICY IF EXISTS "Allow application access" ON goods_receipts;
DROP POLICY IF EXISTS "Enable read access for all users" ON goods_receipts;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON goods_receipts;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON goods_receipts;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON goods_receipts;

-- Ensure RLS is enabled
ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for module viewers" ON goods_receipts
  FOR SELECT TO authenticated USING (
    has_module_access('recebimento', destination_farm_id)
  );

CREATE POLICY "Enable insert for module editors" ON goods_receipts
  FOR INSERT TO authenticated WITH CHECK (
    has_module_access('recebimento', destination_farm_id)
  );

CREATE POLICY "Enable update for module editors" ON goods_receipts
  FOR UPDATE TO authenticated USING (
    has_module_access('recebimento', destination_farm_id)
  ) WITH CHECK (
    has_module_access('recebimento', destination_farm_id)
  );

CREATE POLICY "Enable delete for module editors" ON goods_receipts
  FOR DELETE TO authenticated USING (
    has_module_access('recebimento', destination_farm_id)
  );

-- 2. Fix goods_exits
DROP POLICY IF EXISTS "Allow application access goods_exits" ON goods_exits;
DROP POLICY IF EXISTS "Enable read access for all users" ON goods_exits;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON goods_exits;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON goods_exits;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON goods_exits;

-- Ensure RLS is enabled
ALTER TABLE goods_exits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for module viewers" ON goods_exits
  FOR SELECT TO authenticated USING (
    has_module_access('saida', destination_farm_id)
  );

CREATE POLICY "Enable insert for module editors" ON goods_exits
  FOR INSERT TO authenticated WITH CHECK (
    has_module_access('saida', destination_farm_id)
  );

CREATE POLICY "Enable update for module editors" ON goods_exits
  FOR UPDATE TO authenticated USING (
    has_module_access('saida', destination_farm_id)
  ) WITH CHECK (
    has_module_access('saida', destination_farm_id)
  );

CREATE POLICY "Enable delete for module editors" ON goods_exits
  FOR DELETE TO authenticated USING (
    has_module_access('saida', destination_farm_id)
  );

COMMIT;
