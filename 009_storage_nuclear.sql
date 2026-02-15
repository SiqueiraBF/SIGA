-- OPÇÃO NUCLEAR DE DEBUG
-- Remove TODAS as travas de segurança do bucket 'invoices'
-- Se issto funcionar, o problema é que o "usuário logado" não está sendo reconhecido pelo banco.

BEGIN;

-- Garante bucket público
INSERT INTO storage.buckets (id, name, public) 
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Remove policies anteriores do bucket (limpeza total)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Read invoices" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert invoices" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update invoices" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete invoices" ON storage.objects;
DROP POLICY IF EXISTS "Owner Delete" ON storage.objects;

-- CRIA POLÍTICAS "ABERTAS" (Funciona mesmo se não estiver logado corretamente)
-- PERIGO: Isso permite que qualquer pessoa com a chave anon grave arquivos. 
-- Usar apenas para corrigir o erro agora, depois restringimos.

CREATE POLICY "Nuclear Insert"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'invoices' );

CREATE POLICY "Nuclear Select"
ON storage.objects FOR SELECT
USING ( bucket_id = 'invoices' );

CREATE POLICY "Nuclear Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'invoices' );

CREATE POLICY "Nuclear Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'invoices' );

COMMIT;
