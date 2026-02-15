-- ============================================
-- SCRIPT DE CORREÇÃO: PERMISSÕES DA TABELA
-- ============================================

-- IMPORTANTE:
-- Este script remove as políticas restritivas da tabela `station_drainages`
-- e permite acesso para QUALQUER USUÁRIO LOGADO.

-- 1. Limpeza de políticas antigas
DROP POLICY IF EXISTS "Usuários veem drenagens de sua fazenda" ON station_drainages;
DROP POLICY IF EXISTS "Usuários podem registrar drenagem" ON station_drainages;
DROP POLICY IF EXISTS "Usuários podem editar suas drenagens" ON station_drainages;
DROP POLICY IF EXISTS "Usuários podem excluir suas drenagens" ON station_drainages;
DROP POLICY IF EXISTS "Acesso Total Drenagem Tabela" ON station_drainages;

-- 2. Habilitar RLS (Garanta que esteja ligado, caso contrário policies não funcionam)
ALTER TABLE station_drainages ENABLE ROW LEVEL SECURITY;

-- 3. Criar Política Permissiva (Todos logados podem tudo)
CREATE POLICY "Acesso Total Drenagem Tabela"
ON station_drainages FOR ALL
USING ( auth.role() = 'authenticated' )
WITH CHECK ( auth.role() = 'authenticated' );

-- FIM DO SCRIPT
