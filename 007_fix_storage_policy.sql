-- Remove políticas anteriores para evitar conflitos e recria de forma mais permissiva para usuários autenticados

-- 1. Permitir Leitura Pública (Qualquer um com o link pode ver)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Read invoices" ON storage.objects;

CREATE POLICY "Public Read invoices"
ON storage.objects FOR SELECT
USING ( bucket_id = 'invoices' );

-- 2. Permitir Upload (INSERT) para qualquer usuário autenticado
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert invoices" ON storage.objects;

CREATE POLICY "Authenticated Insert invoices"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'invoices' AND
  auth.role() = 'authenticated'
);

-- 3. Permitir Atualização (UPDATE) para qualquer usuário autenticado
DROP POLICY IF EXISTS "Authenticated Update invoices" ON storage.objects;

CREATE POLICY "Authenticated Update invoices"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'invoices' AND auth.role() = 'authenticated' );

-- 4. Permitir Deleção (DELETE) para qualquer usuário autenticado
DROP POLICY IF EXISTS "Owner Delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete invoices" ON storage.objects;

CREATE POLICY "Authenticated Delete invoices"
ON storage.objects FOR DELETE
USING ( bucket_id = 'invoices' AND auth.role() = 'authenticated' );
