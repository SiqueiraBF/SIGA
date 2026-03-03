-- Correção de RLS para a tabela Funcoes
-- Como o sistema utiliza autenticação customizada (usuarios), as chamadas para o banco 
-- chegam como role 'anon'. Precisamos garantir que a role 'anon' tenha permissão de inserção.

CREATE POLICY "Allow anon insert on funcoes"
ON public.funcoes
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow anon update on funcoes"
ON public.funcoes
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Caso as políticas antigas estivessem barrando geral, aqui garantimos acesso total para a aplicação Front-end
CREATE POLICY "Allow anon all on funcoes fallback"
ON public.funcoes
FOR ALL
USING (true)
WITH CHECK (true);
