-- Adiciona constraint para evitar duplicidade de número de requisição no módulo PCM
ALTER TABLE public.pcm_solicitacoes_compras 
ADD CONSTRAINT unique_num_requisicao UNIQUE (num_requisicao);
