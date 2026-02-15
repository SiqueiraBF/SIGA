-- 1. Garantir que o bucket 'invoices' existe e é PÚBLICO
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Limpeza COMPLETA de políticas antigas (para evitar conflitos)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Read invoices" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert invoices" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update invoices" ON storage.objects;
DROP POLICY IF EXISTS "Owner Delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete invoices" ON storage.objects;

-- 3. Recriar Políticas Simplificadas

-- LEITURA: Pública para todos (necessário para o link funcionar sem token)
CREATE POLICY "Public Read invoices"
ON storage.objects FOR SELECT
USING ( bucket_id = 'invoices' );

-- INSERT: Qualquer usuário logado pode inserir no bucket 'invoices'
CREATE POLICY "Authenticated Insert invoices"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'invoices' AND
  auth.role() = 'authenticated'
);

-- UPDATE: Qualquer usuário logado pode atualizar arquivos (para re-upload)
CREATE POLICY "Authenticated Update invoices"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'invoices' AND auth.role() = 'authenticated' );

-- DELETE: Qualquer usuário logado pode deletar
CREATE POLICY "Authenticated Delete invoices"
ON storage.objects FOR DELETE
USING ( bucket_id = 'invoices' AND auth.role() = 'authenticated' );
