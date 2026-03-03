---
description: Iniciar a criação de um novo módulo ou funcionalidade complexa.
---

Passo 1: Orquestração e Domínio (Master)
O Agente Mestre recebe o briefing do Bruno, identifica o domínio (ex: Lavador) e carrega as regras de negócio específicas.

Ação: Executar a skill set_domain_context.

Entrega: Definição clara do escopo e requisitos de negócio.

Passo 2: Arquitetura e Blueprint (Architect)
O Arquiteto analisa o escopo e desenha a estrutura de pastas e arquivos.

Ação: Criar o mapa de arquivos (Tree View) no padrão Next.js (App Router).

Entrega: Blueprint estrutural e definição de contratos de funções.

Passo 3: Segurança e Banco de Dados (DBA & Security)
O DBA cria a fundação de dados.

Ação: Gerar o script SQL de criação de tabelas, relações e políticas de RLS.

Entrega: Schema do banco de dados protegido e pronto no Supabase.

Passo 4: Lógica de Servidor (Backend)
O Backend constrói o "motor" do módulo.

Ação: Implementar as Edge Functions, Server Actions e lógica de processamento de dados.

Entrega: APIs e funções de servidor funcionais.

Passo 5: Conectividade (Integrations)
O Agente de Integrações conecta o módulo ao mundo externo (Nuntec, Microsoft, SEFAZ).

Ação: Configurar autenticações, webhooks e wrappers de comunicação.

Entrega: Serviços externos integrados e testados.

Passo 6: Interface e UX (Frontend e Mobile Dev)
O Frontend dá vida à tela Desktop, enquanto o Mobile Dev (PWA) constrói as rotas `/app`.

Ação: Desenvolver os componentes .tsx usando Tailwind, Design System e Skills de UX (`ui_design_tokens` ou `mobile_ui_tokens`).

Entrega: Interface de usuário responsiva, interativa e dividida corretamente por dispositivo.

Passo 7: Garantia de Qualidade (QA & Testing)
O QA tenta quebrar o que foi construído.

Ação: Revisar lógica, testar fluxos de erro e validar segurança (RLS).

Entrega: Relatório de "Pass" ou lista de correções necessárias.

Passo 8: Registro de Memória (Documenter)
O Documentador registra tudo o que foi feito.

Ação: Gerar o README do módulo, documentação de API e atualizar o Changelog.

Entrega: Documentação técnica completa em Português e Inglês.

Passo 9: Lançamento e Estabilidade (DevOps)
O Agente de Infra garante que o código chegue ao usuário.

Ação: Configurar variáveis de ambiente e realizar o deploy na Vercel/Supabase.

Entrega: Módulo publicado em ambiente de produção com monitoramento ativo.