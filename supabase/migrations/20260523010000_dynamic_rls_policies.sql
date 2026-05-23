-- 1. Remoção da coluna de senha em texto plano (CRIT-01)
ALTER TABLE IF EXISTS public.usuarios DROP COLUMN IF EXISTS senha;

-- 2. Função de verificação de Administrador
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  v_role_name text;
BEGIN
  SELECT f.nome INTO v_role_name
  FROM public.usuarios u
  JOIN public.funcoes f ON u.funcao_id = f.id
  WHERE u.id = auth.uid();
  
  RETURN coalesce(v_role_name = 'Administrador', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Função Dinâmica de Permissões (Lê o JSON permissoes)
CREATE OR REPLACE FUNCTION public.has_module_access(
  p_module text,
  p_target_fazenda_id uuid
) RETURNS boolean AS $$
DECLARE
  v_user_fazenda_id uuid;
  v_view_scope text;
  v_is_admin boolean;
BEGIN
  -- Admins always have access
  v_is_admin := public.is_admin();
  IF v_is_admin THEN
    RETURN true;
  END IF;

  SELECT fazenda_id INTO v_user_fazenda_id
  FROM public.usuarios
  WHERE id = auth.uid();

  -- Extrai a permissão específica do módulo no perfil
  SELECT (permissoes->p_module->>'view_scope')::text INTO v_view_scope
  FROM public.funcoes f
  JOIN public.usuarios u ON u.funcao_id = f.id
  WHERE u.id = auth.uid();

  IF v_view_scope IS NULL OR v_view_scope = 'NONE' THEN
    RETURN false;
  END IF;

  IF v_view_scope = 'ALL' THEN
    RETURN true;
  END IF;

  IF v_view_scope = 'SAME_FARM' THEN
    RETURN p_target_fazenda_id IS NULL OR v_user_fazenda_id = p_target_fazenda_id;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Aplicar RLS nas tabelas expostas

-- 4.1. PCM Solicitações Compras
ALTER TABLE public.pcm_solicitacoes_compras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso pcm_solicitacoes_compras" ON public.pcm_solicitacoes_compras;
CREATE POLICY "Acesso pcm_solicitacoes_compras" ON public.pcm_solicitacoes_compras FOR SELECT
USING (public.has_module_access('solicitacoes_pcm', fazenda_id));

CREATE POLICY "Insert pcm_solicitacoes_compras" ON public.pcm_solicitacoes_compras FOR INSERT
WITH CHECK (public.has_module_access('solicitacoes_pcm', fazenda_id));

CREATE POLICY "Update pcm_solicitacoes_compras" ON public.pcm_solicitacoes_compras FOR UPDATE
USING (public.has_module_access('solicitacoes_pcm', fazenda_id));

-- 4.2. Pagamentos Fora do Prazo (Late Payments)
ALTER TABLE public.late_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso late_payments" ON public.late_payments;
CREATE POLICY "Acesso late_payments" ON public.late_payments FOR SELECT
USING (public.has_module_access('pagamentos_fora_prazo', NULL));

CREATE POLICY "Insert late_payments" ON public.late_payments FOR INSERT
WITH CHECK (public.has_module_access('pagamentos_fora_prazo', NULL));

CREATE POLICY "Update late_payments" ON public.late_payments FOR UPDATE
USING (public.has_module_access('pagamentos_fora_prazo', NULL));

-- 4.3. Proteger a tabela usuários (Admins podem tudo, outros apenas visualizam)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Visualização global de usuários" ON public.usuarios;
CREATE POLICY "Visualização global de usuários" ON public.usuarios FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins editam usuários" ON public.usuarios;
CREATE POLICY "Admins editam usuários" ON public.usuarios FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());
