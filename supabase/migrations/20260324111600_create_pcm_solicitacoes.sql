CREATE TABLE IF NOT EXISTS public.pcm_solicitacoes_compras (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fazenda_id UUID NOT NULL REFERENCES public.fazendas(id),
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'PENDING_ALMOXARIFADO' CHECK (status IN ('PENDING_ALMOXARIFADO', 'COMPLETED')),
    sc_numero TEXT,
    maquina TEXT NOT NULL,
    prioridade TEXT NOT NULL CHECK (prioridade IN ('Normal', 'Urgente')),
    num_requisicao TEXT NOT NULL,
    obs_pcm TEXT,
    anexo_pcm_url TEXT,
    data_confirmacao TIMESTAMP WITH TIME ZONE,
    confirmed_by UUID,
    solicitacao_almox TEXT,
    obs_almox TEXT,
    anexo_almox_url TEXT
);

-- Desabilitar RLS por causa do sistema customizado de auth
ALTER TABLE public.pcm_solicitacoes_compras DISABLE ROW LEVEL SECURITY;

-- Storage configuration for 'pcm-anexos' bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pcm-anexos', 'pcm-anexos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Allow public all actions for pcm anexos"
ON storage.objects FOR ALL
USING (bucket_id = 'pcm-anexos')
WITH CHECK (bucket_id = 'pcm-anexos');
