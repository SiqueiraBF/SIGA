-- Adicionar coluna para rastrear data de visualização/confirmação pelo fiscal
ALTER TABLE pending_invoices 
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP WITH TIME ZONE;

-- Função segura para confirmar visualização sem precisar de login (usando o ID como chave)
-- SECURITY DEFINER: Roda com permissões de admin (para bypassar RLS de UPDATE que exige login)
CREATE OR REPLACE FUNCTION confirm_invoice_view(invoice_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    affected_rows INT;
BEGIN
    UPDATE pending_invoices
    SET viewed_at = NOW()
    WHERE id = invoice_id
    AND viewed_at IS NULL; -- Só atualiza se ainda não foi visto (preserva a primeira visualização)

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    IF affected_rows > 0 THEN
        RETURN jsonb_build_object('success', true, 'message', 'Confirmação registrada');
    ELSE
        -- Pode ser que o ID não exista ou já tenha sido confirmado. 
        -- Vamos verificar se já foi confirmado para dar uma mensagem melhor.
        PERFORM 1 FROM pending_invoices WHERE id = invoice_id AND viewed_at IS NOT NULL;
        IF FOUND THEN
             RETURN jsonb_build_object('success', true, 'message', 'Já confirmado anteriormente');
        ELSE
             RETURN jsonb_build_object('success', false, 'message', 'Nota não encontrada');
        END IF;
    END IF;
END;
$$;

-- Permitir que usuários anônimos (link do e-mail) chamem essa função
GRANT EXECUTE ON FUNCTION confirm_invoice_view(UUID) TO anon;
GRANT EXECUTE ON FUNCTION confirm_invoice_view(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_invoice_view(UUID) TO service_role;
