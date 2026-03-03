---
description: Quando um erro é reportado pelo usuário ou um comportamento inesperado é detectado em um módulo existente.
---

Passo 1: Triagem e Diagnóstico (Master)
O Agente Mestre analisa o erro reportado e identifica em qual camada o problema reside (Interface, Lógica ou Integração).

Ação: Localizar o arquivo e o domínio afetado (ex: Logística ou Lavador).

Entrega: Definição clara da causa raiz e indicação de qual subagente deve agir.

Passo 2: Intervenção Técnica (Backend, Frontend ou Mobile)
Dependendo da natureza do erro, o Mestre aciona o especialista correspondente.

Ação (Backend): Corrigir falhas em Edge Functions, cálculos de comissão ou integrações.

Ação (Frontend/Desktop): Corrigir bugs visuais em dashboards e formulários administrativos.

Ação (Mobile/PWA): Corrigir layout quebrado em cartões Touch, FABs e navegação mobile.

Entrega: Código refatorado e corrigido seguindo os padrões originais do sistema.

Passo 3: Validação de Regressão (QA & Testing)
O QA entra em campo para garantir que o conserto não quebrou outras partes do sistema.

Ação: Testar especificamente o cenário do erro e realizar um "smoke test" nas funções principais do módulo.

Entrega: Veredito de aprovação para subida em produção.

Passo 4: Registro de Incidente (Documenter)
O Documentador atualiza o histórico do sistema para que o Bruno saiba o que mudou.

Ação: Adicionar a correção ao CHANGELOG.md e atualizar o manual técnico se houver mudança no comportamento da função.

Entrega: Histórico de manutenção atualizado.

Passo 5: Hotfix Deploy (DevOps)
O Agente de Infra realiza a subida rápida da correção.

Ação: Executar o deploy apenas dos arquivos afetados para a Vercel ou Supabase.

Entrega: Sistema estabilizado e operando normalmente em produção.