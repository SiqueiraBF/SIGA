ALTER TABLE out_of_deadline_payments ADD COLUMN anexos text[] DEFAULT '{}';

-- Adicionar politicas para o bucket de anexos no Storage
-- Isso permite o upload e leitura dos anexos no bucket 'out_of_deadline_attachments'

-- Permitir leitura publica (para que possamos exibir os arquivos sem precisar de token assinado)
CREATE POLICY "Permitir Leitura Publica"
ON storage.objects FOR SELECT
USING ( bucket_id = 'out_of_deadline_attachments' );

-- Permitir que usuarios autenticados façam upload de arquivos
CREATE POLICY "Permitir Upload Autenticado"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'out_of_deadline_attachments' );

-- Permitir que usuarios autenticados excluam os proprios arquivos (opcional, para quando voce apagar os lançamentos)
CREATE POLICY "Permitir Excluir Autenticado"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'out_of_deadline_attachments' );
