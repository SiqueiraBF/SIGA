-- Adicionar política de DELETE para pcm_solicitacoes_compras
CREATE POLICY "Delete pcm_solicitacoes_compras" ON public.pcm_solicitacoes_compras FOR DELETE
USING (public.has_module_access('solicitacoes_pcm', fazenda_id));
