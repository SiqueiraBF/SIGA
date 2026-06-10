# Original User Request

## Initial Request — 2026-06-04T21:18:26Z

Refatoração UI/UX: Solicitações PCM (Padrão Elite)

Diretório de trabalho: c:\Users\bruno.siqueira\OneDrive - NADIANA AGROPECUARIA LTDA\Área de Trabalho\Projetos\Sistema Nadiana\src

**Objetivo:**
Você deve refatorar o módulo PCM (Solicitações de Compras) no frontend para alinhá-lo ao Design System Specialist (Padrão Elite). Consulte o catálogo `c:\Users\bruno.siqueira\OneDrive - NADIANA AGROPECUARIA LTDA\Área de Trabalho\Projetos\Sistema Nadiana\.agent\rules\ui_component_catalog.md` para entender as assinaturas dos componentes permitidos (DataTable, ConfirmDialog, Modal, TabBar, StatusBadge).

**Requisitos:**

1. `src/pages/PcmRequests.tsx`:
- Substitua completamente a tag `<table>` e seus elementos pelo componente `<DataTable>`.
- Remova a coluna de ações manual e utilize o componente `<TableActions>` (com onView, onEdit, onDelete e botões customizados) na prop `renderActions`.
- Substitua o uso de `window.confirm` pelo state/componente local `<ConfirmDialog variant="danger">`.
- Substitua a navegação de abas (Lista/Dashboard) pelo componente `<TabBar>`.
- Use o `<StatusBadge>` nas colunas de status (warning, success, error) e de prioridade.

2. `src/components/pcm/PcmRequestModal.tsx`:
- Substitua o container "fixed inset-0" cru pelo uso de `<Modal size="xl">`.
- Substitua o cabeçalho pelo componente `<ModalHeader>`.
- Substitua o rodapé pelo `<ModalFooter>`.
- Mantenha o body interno no formato Split Layout.

3. `src/components/pcm/PcmConfirmModal.tsx`, `PcmDetailsModal.tsx`, e `PcmCancelModal.tsx`:
- Substitua os modais pelas estruturas `<Modal>`, `<ModalHeader>` e `<ModalFooter>`, assim como no RequestModal.

**Critérios de Aceite:**
- A tabela principal usa o `<DataTable>` e não quebra a build TypeScript.
- Nenhuma tag `<table>` nativa sobrou no arquivo `PcmRequests.tsx`.
- Nenhum `window.confirm` está presente em `PcmRequests.tsx`.
- Todos os 4 modais (`PcmRequestModal`, `PcmConfirmModal`, `PcmDetailsModal`, `PcmCancelModal`) utilizam o componente `<Modal>`.
- A refatoração mantém toda a lógica de negócio (lead time e arquivos múltiplos) que já foi implementada e não gera erros de ESLint/TSLint.

## Follow-up — 2026-06-05T14:57:00Z

Refatoração UI/UX: Ajustes Finais PCM e Ações Dinâmicas

Diretório de trabalho: c:\Users\bruno.siqueira\OneDrive - NADIANA AGROPECUARIA LTDA\Área de Trabalho\Projetos\Sistema Nadiana\src

**Objetivo:**
Realizar ajustes finos no módulo PCM visando melhor fluxo cronológico, limpeza da tabela principal e otimização da área do Almoxarifado.

**Requisitos e Alterações (Acceptance Criteria):**

1. PcmDetailsModal.tsx:
- Cabeçalho: O título deve ser "Detalhes da Solicitação". O Nº da Requisição NÃO deve ficar no cabeçalho. Mantenha no cabeçalho o crachá/indicador de STATUS, seguindo o padrão dos outros modais do sistema.
- Corpo (Cronologia):
  - Bloco 1 (Criador/PCM): Novo card agrupando todos os dados do solicitante. Deve exibir em destaque o Nº da Requisição, e incluir Data/Hora, Solicitante, Filial, Máquina, Prioridade, Observação e Anexos originais do PCM.
  - Bloco 2 (Almoxarifado/SC): Novo card logo abaixo (renderizado apenas se o status for finalizado/confirmado) contendo: Número da SC, Confirmado em (Data SC), SLA Atendimento, Observações Almoxarifado e Comprovante da SC.
- Rodapé (Ações Dinâmicas): Utilize componentes `<Button>` globais para exibir os botões de ação que foram removidos da tabela. A exibição deve ser baseada nas props e status: Editar, Cancelar, Excluir, Confirmar SC.

2. PcmConfirmModal.tsx:
- Detalhes Originais: Incluir o campo "Prioridade" (que estava ausente) nos detalhes visíveis.
- Inputs Almoxarifado (Compactação): Reduza drasticamente margens, paddings e o tamanho da fonte (especialmente do Input do Número da SC) para compactar a área verde. Reduza a altura/padding interno do componente de upload de anexo.
- Obrigatoriedade: O upload do comprovante é OBRIGATÓRIO. O texto deve ser alterado para "COMPROVANTE / ANEXO (OBRIGATÓRIO)". Bloqueie a submissão se `files.length === 0`.

3. PcmRequestModal.tsx:
- Obrigatoriedade: O upload de anexos/fotos agora é OBRIGATÓRIO na hora de criar uma solicitação. Ajuste os labels/descrições para indicar que é obrigatório e bloqueie o botão de "Enviar" se nenhum arquivo for anexado.

4. PcmRequests.tsx (Página/Tabela):
- Remova completamente a coluna "AÇÕES" do `<DataTable>` e os botões de ação por linha.
- Torne a linha inteira da tabela clicável (passando a propriedade `onRowClick` ou similar para o DataTable, ou envolvendo as células) para abrir o `PcmDetailsModal`.
- Repasse as funções de edição, cancelamento, exclusão e confirmação via props para o `PcmDetailsModal`, para que ele assuma o controle dessas ações no rodapé.

Você tem autorização total para editar esses 4 arquivos de forma síncrona. Valide a compilação (TypeScript) antes de finalizar.

## Follow-up — 2026-06-06T22:11:34-04:00

# Teamwork Project Prompt — Draft

> Status: Ready for launch — awaiting user approval.
> Goal: Delegate to teamwork_preview

Build an AI Analytics Submodule for the PDM system to track AI performance and failures. This involves adding a `pdm_ai_logs` table in Supabase, updating the `analyze-pdm` edge function to save logs, and creating an "Análise de IA" tab in the frontend (`src/components/RequestForm/PdmManual/index.tsx`) to display the failure logs.

Working directory: c:\Users\bruno.siqueira\OneDrive - NADIANA AGROPECUARIA LTDA\Área de Trabalho\Projetos\Sistema Nadiana
Integrity mode: development

## Requirements

### R1. Database Migration
Create a new Supabase table `pdm_ai_logs` to store the history of AI evaluations. Required columns: `id`, `descricao_bruta`, `status_retornado`, `categoria_detectada`, `mensagem_erro`, `descricao_padronizada`, `is_simulacao`, `created_at`.

### R2. Edge Function Update
Update `supabase/functions/analyze-pdm/index.ts` to expect a 4-field JSON from the AI (adding `categoria_detectada`). After parsing the AI response, insert a record into `pdm_ai_logs` (whether `simulate` is true or false).

### R3. Frontend UI Update
1. Update `compilePromptMarkdown` in `src/components/RequestForm/PdmManual/index.tsx` so the AI prompt clearly asks for `categoria_detectada`.
2. Add a new tab called "Análise de IA" next to Categorias, Manual, and Playground.
3. When the tab is active, display a table (e.g., using existing `DataTable` components) that fetches from `pdm_ai_logs` and lists only items where `status_retornado` != 'Aprovado'. Include a way to easily copy the `descricao_bruta` from the table row.

## Acceptance Criteria

### Backend & Edge Function
- [ ] A script successfully creates the `pdm_ai_logs` table in the database.
- [ ] The `analyze-pdm` edge function code successfully inserts records into `pdm_ai_logs`.

### Frontend
- [ ] The PDM Manual UI correctly renders the "Análise de IA" tab.
- [ ] The frontend compiles successfully without any TypeScript or React errors.

### Verification
- [ ] The agent team will verify the build compiles using `npm run build` or checking for lint errors.
- [ ] The user will perform the final manual verification in the system by testing the Playground and checking if the log appears in the new tab.
