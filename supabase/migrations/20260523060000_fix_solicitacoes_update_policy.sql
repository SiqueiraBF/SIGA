-- Resolve bug na edição de rascunhos das solicitacoes normais

DROP POLICY IF EXISTS "Permitir atualização" ON public.solicitacoes;

CREATE POLICY "Permitir atualização" ON public.solicitacoes FOR UPDATE 
TO authenticated
USING (
  ((public.get_auth_user_role())::text = 'Administrador'::text) OR 
  (usuario_id = auth.uid() AND status IN ('Aberto', 'Devolvido'))
)
WITH CHECK (
  ((public.get_auth_user_role())::text = 'Administrador'::text) OR 
  (usuario_id = auth.uid())
);

-- Limpar politicas antigas (legadas) que causam bugs na atualizacao do PCM (usar apenas as novas multi-tenant)
DROP POLICY IF EXISTS "Permitir leitura baseada no escopo PCM" ON public.pcm_solicitacoes_compras;
DROP POLICY IF EXISTS "Permitir inserção PCM" ON public.pcm_solicitacoes_compras;
DROP POLICY IF EXISTS "Permitir atualização PCM" ON public.pcm_solicitacoes_compras;
DROP POLICY IF EXISTS "Permitir exclusão PCM" ON public.pcm_solicitacoes_compras;
