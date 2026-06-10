-- Fix RLS policy for suppliers to allow insertion/modification from the Savings module
-- This resolves the issue where users like Enio Carlos could not add a new supplier
-- while creating a new Saving record.

CREATE POLICY "Permitir mod fornecedores por savings" ON public.suppliers FOR ALL TO authenticated
USING (public.has_module_access('controle_saving', NULL))
WITH CHECK (public.has_module_access('controle_saving', NULL));
