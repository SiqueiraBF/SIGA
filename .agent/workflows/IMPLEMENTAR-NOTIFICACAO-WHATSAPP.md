---
description: Implementação de Notificação via WhatsApp para Solicitações Finalizadas
---

# Fluxo de Trabalho: Notificação via WhatsApp

Este documento descreve as etapas para implementar o botão de envio de notificação via WhatsApp na tela de detalhes da solicitação.

## Objetivo

Permitir que usuários com permissão de "Aprovar/Analisar" enviem um resumo formatado da solicitação finalizada para o solicitante via WhatsApp Web/Desktop.

## Modelo de Mensagem (Opção 2 - Formal)

```text
*Notificação de Cadastro - Sistema Nadiana*

Prezada [Nome Solicitante],
Informamos que a solicitação *SC #[Numero]* foi concluída com sucesso.

*Resumo:*
Filial: [Nome Filial]
Prioridade: [Prioridade] 🚨
Obs: [Observação]

*Relação de Produtos:*
1. [Descrição] (Ref: [Ref]) -> *Cód: [Cod_Unisystem]*
2. [Descrição] (Ref: [Ref]) -> *Cód: [Cod_Unisystem]*

Att, Departamento de Cadastros.
```

## Etapas de Implementação

### 1. Atualizar Serviço de Notificação (`src/services/notificationService.ts`)

- [ ] Criar método `generateWhatsappLink(request, items, userPhone)`
- [ ] Implementar lógica de formatação de texto com quebras de linha (`%0A`) e negrito (`*`).
- [ ] Validar e formatar número de telefone:
  - O formato atual é `+55 66 9651-6132`.
  - A lógica deve remover espaços, traços e o símbolo `+`, mantendo apenas os dígitos numéricos (Ex: `556696516132`) para a API do WhatsApp.

### 2. Identificar Componente Alvo

- [ ] Confirmar se a visualização de detalhes (imagem enviada) ocorre em `RequestFormWizard.tsx` (modo leitura) ou `RequestFormModal.tsx`.
- [ ] Localizar a área de ações (footer ou header) para inserção do botão.

### 3. Implementar Botão e Lógica na UI

- [ ] Importar ícone do WhatsApp (`MessageCircle` ou similar).
- [ ] Adicionar verificação de permissão:
  - Usuário logado deve ter `permissoes.config_cadastros.can_confirm === true` (Aprovar/Analisar).
  - Status da solicitação deve ser `'Finalizado'`.
- [ ] Criar handler `handleSendWhatsapp` que chama o serviço e abre a janela.

### 4. Testes

- [ ] Validar link gerado (formatação correta no WhatsApp Web).
- [ ] Validar visibilidade do botão (só para quem tem permissão e em status finalizado).
