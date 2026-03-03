---
description: Quando o usuário solicita um sistema ou módulo de um setor ainda não documentado nas regras de workspace.
---

Passo 1: Coleta das "Regras de Ouro" (Master)
O Agente Mestre interrompe qualquer ação de código e inicia uma entrevista técnica com o Bruno.

Ação: Solicitar as 3 regras inegociáveis do negócio e o fluxo principal (Entrada -> Processamento -> Saída).

Entrega: Um resumo estruturado das intenções do usuário e limites do sistema.

Passo 2: Mapeamento de Entidades (Architect)
O Arquiteto traduz os conceitos de negócio para termos técnicos.

Ação: Definir quais serão as tabelas principais e como elas se relacionam com os módulos existentes da Unisystem.

Entrega: Um rascunho de diagrama de dados e nomes de entidades em padrão snake_case.

Passo 3: Criação do Documento de Domínio (Documenter)
O Documentador formaliza o conhecimento para que todos os outros agentes possam consultá-lo.

Ação: Gerar o arquivo domain_novo_nome.md contendo o dicionário de dados, regras de negócio e padrões de UI sugeridos.

Entrega: O arquivo de regras que será salvo no Workspace para guiar o desenvolvimento futuro.

Passo 4: Definição de Perfis e Acesso (DBA & Security)
O especialista em dados define quem poderá ver o quê nesse novo domínio.

Ação: Mapear os níveis de permissão (ex: Gerente de Fazenda vs. Operador) para preparar o RLS futuro.

Entrega: Estrutura preliminar de segurança e isolamento de dados.

Passo 5: Resumo Bilíngue de Onboarding (Documenter)
Para auxiliar no aprendizado do Bruno, o sistema entrega um resumo final.

Ação: Criar um guia rápido em Inglês com explicações em Português sobre os termos técnicos do novo domínio.

Entrega: Onboarding concluído e sistema pronto para iniciar o Workflow de Criação de Módulo.