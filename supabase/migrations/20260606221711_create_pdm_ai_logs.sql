-- Create pdm_ai_logs table
CREATE TABLE IF NOT EXISTS public.pdm_ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    descricao_bruta TEXT,
    status_retornado TEXT,
    categoria_detectada TEXT,
    mensagem_erro TEXT,
    descricao_padronizada TEXT,
    is_simulacao BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pdm_ai_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to insert their own logs
CREATE POLICY "Allow authenticated users to insert own logs"
    ON public.pdm_ai_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Policy: Allow users to select their own logs
CREATE POLICY "Allow users to select own logs"
    ON public.pdm_ai_logs
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Policy: Allow administrators to select all logs
CREATE POLICY "Allow administrators to select all logs"
    ON public.pdm_ai_logs
    FOR SELECT
    TO authenticated
    USING (public.is_admin());
