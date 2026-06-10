-- Migration: Add active status to out of deadline payment sectors and responsibles
-- Date: 2026-06-10
-- Description: Add ativo column (boolean, not null, default true) to out_of_deadline_payment_sectors and out_of_deadline_payment_responsibles.

BEGIN;

-- 1. Add active status column to out_of_deadline_payment_sectors
ALTER TABLE public.out_of_deadline_payment_sectors 
ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

-- 2. Add active status column to out_of_deadline_payment_responsibles
ALTER TABLE public.out_of_deadline_payment_responsibles 
ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

COMMIT;
