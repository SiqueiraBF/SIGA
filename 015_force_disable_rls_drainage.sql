-- ============================================
-- SCRIPT DE CORREÇÃO FINAL: DESATIVAR RLS TOTALMENTE
-- ============================================

-- IMPORTANTE:
-- Este comando desativa completamente a verificação de segurança (Row Level Security)
-- na tabela 'station_drainages'. Isso significa que qualquer usuário conectado
-- (autenticado ou anonimo, dependendo das grants) poderá ler/escrever se tiver permissão de tabela.

-- 1. Desativar RLS
ALTER TABLE station_drainages DISABLE ROW LEVEL SECURITY;

-- 2. Garantir permissões básicas para usuários logados e serviço
GRANT ALL ON station_drainages TO authenticated;
GRANT ALL ON station_drainages TO service_role;

-- 3. (Opcional) Limpar policies antigas para evitar confusão futura se reativar
DROP POLICY IF EXISTS "Usuários veem drenagens de sua fazenda" ON station_drainages;
DROP POLICY IF EXISTS "Usuários podem registrar drenagem" ON station_drainages;
DROP POLICY IF EXISTS "Usuários podem editar suas drenagens" ON station_drainages;
DROP POLICY IF EXISTS "Usuários podem excluir suas drenagens" ON station_drainages;
DROP POLICY IF EXISTS "Acesso Total Drenagem Tabela" ON station_drainages;

-- FIM DO SCRIPT
