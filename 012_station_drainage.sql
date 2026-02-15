-- ============================================
-- MÓDULO DE DRENAGEM DE POSTOS
-- ============================================

-- 1. Tabela: station_drainages
CREATE TABLE IF NOT EXISTS station_drainages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    posto_id UUID NOT NULL REFERENCES postos(id) ON DELETE CASCADE,
    fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    
    data_drenagem TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    litros_drenados DECIMAL(10,2) NOT NULL,
    aspecto_residuo TEXT NOT NULL CHECK (length(aspecto_residuo) > 0),
    destino_residuo TEXT NOT NULL CHECK (length(destino_residuo) > 0),
    
    fotos JSONB DEFAULT '[]'::JSONB, -- Array de strings (URLs)
    
    observacoes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_drainages_fazenda ON station_drainages(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_drainages_posto ON station_drainages(posto_id);
CREATE INDEX IF NOT EXISTS idx_drainages_data ON station_drainages(data_drenagem);

-- 3. RLS (Segurança)
ALTER TABLE station_drainages ENABLE ROW LEVEL SECURITY;

-- Política de Leitura: Usuários veem drenagens da sua fazenda vinculada
-- (Se fazenda_id do usuário for NULL (admin/geral), vê tudo ou precisa de regra específica? 
--  Assumindo política padrão do sistema: user.fazenda_id bate com row.fazenda_id ou é admin)
CREATE POLICY "Usuários veem drenagens de sua fazenda"
ON station_drainages FOR SELECT
USING (
    (auth.uid() IN (SELECT id FROM usuarios WHERE fazenda_id IS NULL)) -- Admin/Central vê tudo
    OR 
    (fazenda_id IN (SELECT fazenda_id FROM usuarios WHERE id = auth.uid()))
);

-- Política de Escrita: Usuários logados podem criar (vinculados à sua fazenda)
CREATE POLICY "Usuários podem registrar drenagem"
ON station_drainages FOR INSERT
WITH CHECK (
    auth.uid() = usuario_id
);

-- Política de Edição/Exclusão: Apenas quem criou ou Admins (simplificado para quem criou por enquanto)
CREATE POLICY "Usuários podem editar suas drenagens"
ON station_drainages FOR UPDATE
USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem excluir suas drenagens"
ON station_drainages FOR DELETE
USING (auth.uid() = usuario_id);


-- 4. Storage (Bucket: drainage-photos)
-- Nota: A criação do bucket via SQL pode não funcionar em todos os ambientes Supabase self-hosted antigos, 
-- mas funciona na nuvem. Se falhar, criar manually no painel.

INSERT INTO storage.buckets (id, name, public)
VALUES ('drainage-photos', 'drainage-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS para Storage
CREATE POLICY "Public Access Drainage Photos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'drainage-photos' );

CREATE POLICY "Authenticated Users Upload Drainage Photos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'drainage-photos' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Users Delete Own Drainage Photos"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'drainage-photos'
    AND auth.uid() = owner
);
