-- Create sys_settings table to store global configurations like PDM AI settings
CREATE TABLE IF NOT EXISTS sys_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES usuarios(id)
);

-- RLS para sys_settings
ALTER TABLE sys_settings ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ler as configurações globais
CREATE POLICY "Qualquer usuário pode ler sys_settings"
    ON sys_settings
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Apenas administradores podem atualizar sys_settings
CREATE POLICY "Apenas admins podem modificar sys_settings"
    ON sys_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM usuarios u
            JOIN funcoes f ON u.funcao_id = f.id
            WHERE u.id = auth.uid() AND f.nome = 'Administrador'
        )
    );

-- Add AI fields to itens_solicitacao
ALTER TABLE itens_solicitacao 
ADD COLUMN IF NOT EXISTS analise_pdm_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS analise_pdm_msg TEXT;

-- Inserir configuração PDM inicial (JSONB)
INSERT INTO sys_settings (key, value, description)
VALUES (
    'pdm_ai_config',
    '{
      "enabled": true,
      "model": "gemini-2.5-flash",
      "api_key": "AIzaSyBdB5VcQw-6uc4QyNC6S-tkoymHhbMcWwk",
      "prompt": "Você é um assistente de validação de PDM (Padrão de Descrição de Material).\n\nSua tarefa é analisar os dados de um item solicitado e verificar se as informações fornecidas estão adequadas para criação do cadastro, conforme as regras.\n\nRegras básicas:\n1. A descrição não deve conter o nome do fabricante ou referência (isso vai nos campos específicos).\n2. A unidade deve estar de acordo com o material (ex: KG, L, UN, CX, M).\n3. Abreviações recomendadas: ACO CARBONO -> AC, ACO GALVANIZADO -> AG, ACO INOX -> AI.\n4. Estrutura padrão: [Nomenclatura] + [Complemento/Tipo] + [Dimensões/Bitola] + [Material] + [Acabamento].\nExemplos corretos:\n- PARAF ALLEN C CAB 12X35MM UNC AC BICR\n- ANEL AJUSTE 1.5X35MM AC SAE1020\n- PNEU 10.00 R20 6L 147K MICHELIN FORCE XZY3\n\nAnalise o item recebido e retorne um JSON estrito no formato:\n{\n  \"status\": \"Aprovado\" | \"FALTANDO_INFO\",\n  \"message\": \"Se aprovado, escreva ''Tudo certo''. Se faltar info, escreva de forma curta e direta o que está faltando. Ex: ''Falta informar a bitola e o material de fabricação.'', ''Remova o fabricante da descrição.''\"\n}"
    }'::jsonb,
    'Configurações da Inteligência Artificial para análise de PDM'
)
ON CONFLICT (key) DO NOTHING;
