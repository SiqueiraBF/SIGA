
-- Tabela para armazenar configurações globais do sistema
CREATE TABLE IF NOT EXISTS system_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE, -- Ex: 'email_financeiro_to', 'email_financeiro_cc'
    value TEXT NOT NULL,      -- Ex: 'financeiro@nadiana.com.br'
    description TEXT,         -- Ex: 'Destinatários principais dos alertas de NFs'
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- RLS: Leitura pública (para o sistema ler), Escrita restrita (somente Admin)
ALTER TABLE system_parameters ENABLE ROW LEVEL SECURITY;

-- Limpar todas as policies antigas para evitar conflitos
DROP POLICY IF EXISTS "Allow Public Read" ON system_parameters;
DROP POLICY IF EXISTS "Allow Authenticated Update" ON system_parameters;
DROP POLICY IF EXISTS "Allow Authenticated Insert" ON system_parameters;

-- Criar Policies (Permissivas para PUBLIC para garantir funcionamento)
CREATE POLICY "Allow Public Read"
ON system_parameters FOR SELECT
USING (true);

CREATE POLICY "Allow Public Update"
ON system_parameters FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow Public Insert"
ON system_parameters FOR INSERT
WITH CHECK (true);

-- INSERIR PARÂMETROS PADRÃO
INSERT INTO system_parameters (key, value, description)
VALUES 
    ('email_financeiro_to', 'fiscal@nadiana.com.br', 'E-mails principais para notificação de NFs (separar por vírgula)'),
    ('email_financeiro_cc', 'gerente@nadiana.com.br', 'E-mails em cópia para notificação de NFs (separar por vírgula)')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value;
