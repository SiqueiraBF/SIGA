-- Migration: Add insert policy for audit_logs
CREATE POLICY "audit_insert" ON public."audit_logs" FOR INSERT TO authenticated WITH CHECK (true);
