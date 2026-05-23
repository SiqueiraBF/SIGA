CREATE TABLE IF NOT EXISTS late_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company text NOT NULL,
  document_number text,
  supplier_client text,
  cpf_cnpj text,
  original_value numeric NOT NULL,
  adjustment_type text NOT NULL, -- JUROS ou DESCONTO
  adjustment_value numeric NOT NULL,
  final_value numeric NOT NULL,
  issue_date date,
  due_date date,
  payment_date date,
  responsible text,
  justification text,
  created_at timestamptz DEFAULT now()
);

-- Note: RLS is disabled as per user instruction.
-- ALTER TABLE late_payments ENABLE ROW LEVEL SECURITY;
