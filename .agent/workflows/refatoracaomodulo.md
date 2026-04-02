---
description: Roteiro estruturado para auditar, planejar e executar a refatoração e modernização de módulos ou funcionalidades existentes.
---

Passo 1: Auditoria e Mapeamento (Master & Architect)
O Agente Mestre identifica qual módulo será refatorado e convoca o Arquiteto para mapeamento.
Ação: Utilizar a skill `audit_module_refactor` em conjunto com a exploração de diretórios para varrer todos os arquivos afetados (UI, Backend, Banco de Dados, Tipagens). Identificar débitos técnicos, componentes obsoletos e violações das regras do sistema.
Entrega: Relatório de Auditoria listando as áreas críticas do módulo que não estão de acordo com o padrão atual.

Passo 2: Planejamento de Atualização (Architect)
O Arquiteto define a nova arquitetura baseada nos padrões mais recentes exigidos (ex: Server Actions centralizados, Hooks, divisão rígida entre Desktop e Mobile).
Ação: Criar um Blueprint (Plano de Refatoração) detalhando o que será **mantido**, **alterado** e **completamente reescrito ou deletado**.
Entrega: Plano validado pelo Mestre antes de iniciar as codificações.

Passo 3: Modernização de Dados e Segurança (DBA & Security)
O DBA garante que o banco de dados suporte a nova implementação sem perder o histórico preexistente.
Ação: Revisar tabelas envolvidas, aplicar/refatorar políticas de RLS para o cenário MultiTenant (Filiais/Fazendas) e criar views/índices se houver gargalo de leitura.
Entrega: Base de dados estruturada e protegida em conformidade com as novas abstrações do backend.

Passo 4: Atualização de Lógica e Integração (Backend Dev & Integrations)
O foco central é desacoplar regras de negócio (cálculos, integrações) do frontend de apresentação.
Ação: O Backend refatora ou cria novas Server Actions/Edge Functions, remove lógicas depreciadas e otimiza respostas. O Integrations garante que qualquer webhook ou disparo de email se mantenha ativo e resiliente (failovers).
Entrega: API e lógicas de camada de dados modernizadas, prontas e isoladas do frontend.

Passo 5: Polimento de Interface e UX (Frontend Dev & Mobile Dev)
A interface é recriada ou adaptada para aderir estritamente aos novos padrões estéticos sem depender de CSS customizado ou inline.
Ação: 
- O Frontend Developer ajusta componentes Desktop buscando os tokens (ex: Glassmorphism, realces Teal) e substitui layouts obsoletos por equivalentes atualizados.
- O Mobile Dev otimiza ou reescreve as rotas de acesso em celular (`/app/...`) aplicando padrões Mobile First estritos (experiência interativa "Tap & Go" e `mobile_ui_tokens`).
Entrega: Interface harmonizada com o resto do sistema, utilizando apenas referências visuais oficiais.

Passo 6: Testes de Regressão e Validação (QA Testing)
Ação: O QA testa os mesmos eventos do mundo real (caminhos originais de sucesso e erro) do módulo antigo no novo código. Foco total em confirmar se as regras antigas não foram acidentalmente quebradas e se a segurança (RLS) segurou acessos indevidos.
Entrega: Validação robusta documentada num relatorio de permissão de subida (Go/No-Go).

Passo 7: Registro e Versionamento (Documenter)
Ação: O Documentador atualiza a base de conhecimento. Ele registra no Changelog a motivação da refatoração e como o novo fluxo funciona (em Português e Inglês, se requisitado nas regras).
Entrega: Ciclo de refatoração encerrado com a documentação em dia.
