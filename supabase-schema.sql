-- ============================================
-- SISTEMA NADIANA - SCHEMA SUPABASE (CLEAN)
-- ============================================
-- Esta versão é idempotente (pode ser executada múltiplas vezes)
-- ============================================

-- 1. LIMPAR TUDO PRIMEIRO (caso já exista)
DROP POLICY IF EXISTS "Todos podem ler funções" ON funcoes;
DROP POLICY IF EXISTS "Todos podem ler fazendas" ON fazendas;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios dados" ON usuarios;
DROP POLICY IF EXISTS "Usuários podem ver solicitações relacionadas" ON solicitacoes;
DROP POLICY IF EXISTS "Usuários podem ver itens de suas solicitações" ON itens_solicitacao;
DROP POLICY IF EXISTS "Usuários podem ver logs relacionados" ON audit_logs;

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS itens_solicitacao CASCADE;
DROP TABLE IF EXISTS solicitacoes CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS fazendas CASCADE;
DROP TABLE IF EXISTS funcoes CASCADE;

-- 2. CRIAR TABELAS

-- 2.1 Funções (Roles/Permissões)
CREATE TABLE funcoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL UNIQUE,
    modulos_permitidos TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.2 Fazendas (Farms/Filiais)
CREATE TABLE fazendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(200) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.3 Usuários
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(200) NOT NULL,
    login VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    funcao_id UUID REFERENCES funcoes(id) ON DELETE RESTRICT,
    fazenda_id UUID REFERENCES fazendas(id) ON DELETE SET NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.4 Solicitações
CREATE TABLE solicitacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero SERIAL UNIQUE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
    fazenda_id UUID REFERENCES fazendas(id) ON DELETE RESTRICT,
    prioridade VARCHAR(20) CHECK (prioridade IN ('Normal', 'Urgente')),
    status VARCHAR(50) CHECK (status IN ('Aberto', 'Aguardando', 'Em Cadastro', 'Finalizado')),
    data_abertura TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    observacao_geral TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.5 Itens de Solicitação
CREATE TABLE itens_solicitacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitacao_id UUID REFERENCES solicitacoes(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    unidade VARCHAR(20) NOT NULL,
    marca VARCHAR(200),
    status_item VARCHAR(50) CHECK (status_item IN ('Pendente', 'Aprovado', 'Reprovado', 'Existente', 'Reativado')),
    cod_reduzido_unisystem VARCHAR(100),
    motivo_reprovacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.6 Logs de Auditoria
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabela VARCHAR(100) NOT NULL,
    registro_id UUID NOT NULL,
    acao VARCHAR(50) CHECK (acao IN ('CRIAR', 'EDITAR', 'DELETAR', 'STATUS')),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    dados_anteriores JSONB,
    dados_novos JSONB,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ÍNDICES
CREATE INDEX idx_usuarios_login ON usuarios(login);
CREATE INDEX idx_usuarios_funcao ON usuarios(funcao_id);
CREATE INDEX idx_usuarios_fazenda ON usuarios(fazenda_id);
CREATE INDEX idx_solicitacoes_usuario ON solicitacoes(usuario_id);
CREATE INDEX idx_solicitacoes_fazenda ON solicitacoes(fazenda_id);
CREATE INDEX idx_solicitacoes_status ON solicitacoes(status);
CREATE INDEX idx_itens_solicitacao ON itens_solicitacao(solicitacao_id);
CREATE INDEX idx_audit_logs_registro ON audit_logs(registro_id);
CREATE INDEX idx_audit_logs_usuario ON audit_logs(usuario_id);

-- 4. DADOS INICIAIS

-- 4.1 Funções
INSERT INTO funcoes (id, nome, modulos_permitidos) VALUES
('00000000-0000-0000-0000-000000000001', 'Administrador', ARRAY['gestao_usuarios', 'config_fazendas', 'abrir_solicitacao', 'analisar_cadastros']),
('00000000-0000-0000-0000-000000000002', 'Registrador', ARRAY['analisar_cadastros']),
('00000000-0000-0000-0000-000000000003', 'Solicitante', ARRAY['abrir_solicitacao']);

-- 4.2 Fazendas
INSERT INTO fazendas (id, nome, ativo) VALUES
('00000000-0000-0000-0000-000000000101', 'Fazenda Exemplo 1', TRUE),
('00000000-0000-0000-0000-000000000102', 'Fazenda Exemplo 2', TRUE);

-- 4.3 Usuários (senha padrão: 123)
INSERT INTO usuarios (id, nome, login, senha, funcao_id, fazenda_id, ativo) VALUES
-- Admin
('00000000-0000-0000-0000-000000000201', 'Administrador', 'admin', '123', '00000000-0000-0000-0000-000000000001', NULL, TRUE),
-- Registrador
('00000000-0000-0000-0000-000000000202', 'Registrador Central', 'registrador', '123', '00000000-0000-0000-0000-000000000002', NULL, TRUE),
-- Solicitantes
('00000000-0000-0000-0000-000000000203', 'João Silva', 'joao', '123', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000101', TRUE),
('00000000-0000-0000-0000-000000000204', 'Maria Santos', 'maria', '123', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000102', TRUE);

-- 5. ROW LEVEL SECURITY (RLS)

-- Habilitar RLS em todas as tabelas
ALTER TABLE funcoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fazendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_solicitacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies (permissivas para desenvolvimento)
-- IMPORTANTE: Ajustar em produção baseado em auth.uid()

-- Funcoes: Todos podem ler
CREATE POLICY "Todos podem ler funções"
    ON funcoes FOR SELECT
    USING (true);

-- Fazendas: Todos podem ler
CREATE POLICY "Todos podem ler fazendas"
    ON fazendas FOR SELECT
    USING (true);

-- Usuarios: Podem ver seus próprios dados
CREATE POLICY "Usuários podem ver seus próprios dados"
    ON usuarios FOR SELECT
    USING (true);

-- Solicitacoes: Podem ver solicitações relacionadas
CREATE POLICY "Usuários podem ver solicitações relacionadas"
    ON solicitacoes FOR SELECT
    USING (true);

-- Itens: Podem ver itens de suas solicitações
CREATE POLICY "Usuários podem ver itens de suas solicitações"
    ON itens_solicitacao FOR SELECT
    USING (true);

-- Audit Logs: Podem ver logs relacionados
CREATE POLICY "Usuários podem ver logs relacionados"
    ON audit_logs FOR SELECT
    USING (true);

-- ============================================
-- SCHEMA CRIADO COM SUCESSO! ✅
-- ============================================
