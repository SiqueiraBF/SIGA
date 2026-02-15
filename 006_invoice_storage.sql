-- Cria o bucket 'invoices' se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Todos podem ver (futuramente restringir por fazenda se necessário)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'invoices' );

-- Policy: Usuários autenticados podem fazer upload
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'invoices' AND
  auth.role() = 'authenticated'
);

-- Policy: Usuários podem deletar seus próprios arquivos (opcional)
CREATE POLICY "Owner Delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'invoices' AND
  auth.uid() = owner
);
