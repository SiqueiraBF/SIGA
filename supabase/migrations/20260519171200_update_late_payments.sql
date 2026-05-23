ALTER TABLE late_payments 
ADD COLUMN IF NOT EXISTS document_type text,
ADD COLUMN IF NOT EXISTS motivo text,
ADD COLUMN IF NOT EXISTS action_plan text;
