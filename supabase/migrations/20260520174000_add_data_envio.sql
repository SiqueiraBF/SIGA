ALTER TABLE solicitacoes ADD COLUMN IF NOT EXISTS data_envio timestamp with time zone;

UPDATE solicitacoes s
SET data_envio = COALESCE(
  (
    SELECT MIN(data_hora)
    FROM audit_logs
    WHERE tabela = 'Solicitacao' 
      AND registro_id = s.id 
      AND (
        (acao = 'STATUS' AND dados_novos->>'status' = 'Aguardando')
        OR 
        (acao = 'CRIAR' AND dados_novos->>'status' = 'Aguardando')
        OR
        (dados_novos->>'status' = 'Aguardando')
      )
  ),
  s.created_at
)
WHERE s.status != 'Aberto';
