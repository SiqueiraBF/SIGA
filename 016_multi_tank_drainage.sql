-- Adicionar coluna JSONB para tanques adicionais em Postos
ALTER TABLE postos 
ADD COLUMN IF NOT EXISTS tanques_adicionais JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS exibir_na_drenagem BOOLEAN DEFAULT TRUE;

-- Adicionar coluna TEXT para identificar o tanque na Drenagem
ALTER TABLE station_drainages 
ADD COLUMN IF NOT EXISTS tanque_identificador TEXT DEFAULT NULL;

-- Comentários para documentação
COMMENT ON COLUMN postos.tanques_adicionais IS 'Lista JSON de tanques extras: [{"id": "t1", "nome": "Tanque 02"}, ...]';
COMMENT ON COLUMN station_drainages.tanque_identificador IS 'Identificador do tanque específico (ex: "Tanque 02") se houver múltiplos.';

-- Adicionar colunas para rastrear status de e-mail
ALTER TABLE station_drainages
ADD COLUMN IF NOT EXISTS email_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS email_error TEXT DEFAULT NULL;

COMMENT ON COLUMN station_drainages.email_status IS 'Status do envio do e-mail: pending, sent, error';
COMMENT ON COLUMN station_drainages.email_error IS 'Log de erro caso o envio falhe';

-- Atualizar automaticamente Melosas para não exibir na drenagem
UPDATE postos SET exibir_na_drenagem = FALSE WHERE nome ILIKE '%Melosa%';
