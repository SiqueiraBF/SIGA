-- Migration: Fix Materials RLS SELECT Policy and Default Stock Value
-- Date: 2026-06-01
-- Description: 
-- 1. Allow all authenticated users to read the global materials catalog (needed for Stock Requests autocomplete and items listing).
-- 2. Clean up null stock values by updating them to 0, setting a default of 0, and making the column NOT NULL.

BEGIN;

-- 1. Redefine SELECT policy on materials
DROP POLICY IF EXISTS "mat_sel" ON public.materials;

CREATE POLICY "mat_sel" ON public.materials
  FOR SELECT TO authenticated
  USING (true);

-- 2. Clean up current_stock null values and enforce default/not-null constraint
UPDATE public.materials SET current_stock = 0 WHERE current_stock IS NULL;

ALTER TABLE public.materials ALTER COLUMN current_stock SET DEFAULT 0;

ALTER TABLE public.materials ALTER COLUMN current_stock SET NOT NULL;

COMMIT;
