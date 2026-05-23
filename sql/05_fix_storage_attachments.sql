-- 1. Criar o bucket caso não exista e torná-lo público
INSERT INTO storage.buckets (id, name, public)
VALUES ('out_of_deadline_attachments', 'out_of_deadline_attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Permitir leitura pública dos arquivos neste bucket
CREATE POLICY "Leitura Publica Attachments" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'out_of_deadline_attachments' );

-- 3. Permitir upload para usuários autenticados
CREATE POLICY "Upload Autenticado Attachments" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'out_of_deadline_attachments' AND auth.role() = 'authenticated' );

-- 4. Permitir deleção/edição para usuários autenticados
CREATE POLICY "Update Delete Autenticado Attachments" 
ON storage.objects FOR ALL 
USING ( bucket_id = 'out_of_deadline_attachments' AND auth.role() = 'authenticated' );
