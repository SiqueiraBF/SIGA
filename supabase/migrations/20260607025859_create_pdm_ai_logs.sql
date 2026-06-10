CREATE TABLE IF NOT EXISTS public.pdm_ai_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    descricao_bruta TEXT,
    marca TEXT,
    referencia TEXT,
    status_retornado TEXT,
    categoria_detectada TEXT,
    mensagem_erro TEXT,
    descricao_padronizada TEXT,
    is_simulacao BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Opcional, mas boa prática no Supabase)
ALTER TABLE public.pdm_ai_logs ENABLE ROW LEVEL SECURITY;

-- Como é log de IA, a inserção é feita via server/Service Role, não precisa de policy de Insert pública se a edge function usa Service Role.
-- Políticas para leitura (Admin pode ler)
CREATE POLICY "Admins podem ler ai logs" ON public.pdm_ai_logs
    FOR SELECT TO authenticated
    USING ( (select nome from funcoes where id = (select funcao_id from usuarios where id = auth.uid())) = 'Administrador' );
