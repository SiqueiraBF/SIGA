-- Revogar o acesso publico aos buckets afetados
UPDATE storage.buckets
SET public = false
WHERE id IN ('out_of_deadline_attachments', 'pcm-anexos');

-- Drop das politicas publicas existentes (HIGH-05)
DROP POLICY IF EXISTS "Permitir Leitura Publica" ON storage.objects;
DROP POLICY IF EXISTS "Allow public all actions for pcm anexos" ON storage.objects;

-- Criar politicas seguras restritas a usuarios autenticados para 'out_of_deadline_attachments'
CREATE POLICY "Permitir Leitura Autenticada OODP"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'out_of_deadline_attachments' );

CREATE POLICY "Permitir Upload Autenticado OODP"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'out_of_deadline_attachments' );

CREATE POLICY "Permitir Excluir Autenticado OODP"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'out_of_deadline_attachments' );

-- Criar politicas seguras restritas a usuarios autenticados para 'pcm-anexos'
CREATE POLICY "Permitir Leitura Autenticada PCM"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'pcm-anexos' );

CREATE POLICY "Permitir Upload Autenticado PCM"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'pcm-anexos' );

CREATE POLICY "Permitir Excluir Autenticado PCM"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'pcm-anexos' );
