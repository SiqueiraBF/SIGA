-- ============================================
-- SCRIPT DE CORRESSÃO: PERMISSÕES DE STORAGE (SEM RLS / ACESSO TOTAL)
-- ============================================

-- IMPORTANTE:
-- 1. Garante que o bucket 'drainage-photos' existe e é PÚBLICO.
-- 2. Limpa políticas antigas.
-- 3. Cria uma política 'ACESSO TOTAL' para este bucket específico.

-- ATENÇÃO: Isso permite que QUALQUER UM faça upload e delete arquivos neste bucket.
-- Use apenas se estritamente necessário (como solicitado).

-- 1. Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('drainage-photos', 'drainage-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Limpeza (Removemos todas as anteriores para evitar conflitos)
DROP POLICY IF EXISTS "Public Access Drainage Photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Upload Drainage Photos" ON storage.objects;
DROP POLICY IF EXISTS "Users Delete Own Drainage Photos" ON storage.objects;
DROP POLICY IF EXISTS "Leitura Publica Fotos Drenagem" ON storage.objects;
DROP POLICY IF EXISTS "Upload Fotos Drenagem" ON storage.objects;
DROP POLICY IF EXISTS "Deletar Fotos Drenagem" ON storage.objects;
DROP POLICY IF EXISTS "Acesso Total Drenagem" ON storage.objects;

-- 3. Política de ACESSO TOTAL (Insert, Select, Update, Delete)
-- Restrição apenas ao bucket_id para não afetar outros arquivos do sistema.

CREATE POLICY "Acesso Total Drenagem"
ON storage.objects FOR ALL
USING ( bucket_id = 'drainage-photos' )
WITH CHECK ( bucket_id = 'drainage-photos' );

-- FIM DO SCRIPT
