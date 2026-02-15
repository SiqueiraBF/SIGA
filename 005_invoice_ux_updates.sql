-- Adiciona coluna para link do arquivo (Foto/PDF)
ALTER TABLE pending_invoices 
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Adiciona index para filtro de farm_id se não existir
CREATE INDEX IF NOT EXISTS idx_pending_invoices_farm_id ON pending_invoices(farm_id);
