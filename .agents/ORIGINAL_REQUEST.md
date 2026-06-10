# Original User Request

## Initial Request ‚Äî 2026-06-04T20:22:05Z

# Teamwork Project Prompt ‚Äî Draft

> Status: Launched
> Goal: Execute the delegated tasks with the teamwork_preview subagent

Implementar a coluna de Lead Time e o suporte a m√∫ltiplos anexos no m√≥dulo de Solicita√ß√µes PCM de uma aplica√ß√£o React, armazenando os m√∫ltiplos links como um JSON array nas colunas de texto existentes do banco de dados (Supabase).

Working directory: c:\Users\bruno.siqueira\OneDrive - NADIANA AGROPECUARIA LTDA\√Årea de Trabalho\Projetos\Sistema Nadiana
Integrity mode: development

## Requirements

### R1. Coluna de Lead Time
Adicionar uma coluna "LEAD TIME" na listagem de solicita√ß√µes (`PcmRequests.tsx`). O tempo deve ser a diferen√ßa entre `created_at` e `data_confirmacao`. O formato deve exibir somente horas e minutos (ex: "28h 30m"). Se a solicita√ß√£o estiver PENDENTE ou CANCELADA (sem `data_confirmacao`), exibir apenas um tra√ßo (`-`).

### R2. M√∫ltiplos Anexos nos Formul√°rios
Atualizar os componentes `PcmRequestModal.tsx` e `PcmConfirmModal.tsx` para permitirem a sele√ß√£o de m√∫ltiplos arquivos usando `<input type="file" multiple />`. O usu√°rio deve conseguir visualizar os nomes dos arquivos selecionados antes do envio e remover se desejar.

### R3. Upload e Persist√™ncia Compat√≠vel
Modificar os m√©todos `createRequest`, `updateRequest` e `confirmRequest` em `pcmService.ts` para receberem arrays de arquivos. O c√≥digo deve fazer upload de todos os arquivos para o bucket `pcm-anexos` e salvar a lista de URLs geradas como uma string JSON (ex: `["url1", "url2"]`) nas colunas `anexo_pcm_url` e `anexo_almox_url` respectivamente. √â imperativo que a aplica√ß√£o continue renderizando corretamente os anexos antigos que s√£o apenas uma URL em string (backward compatibility).

### R4. Visualiza√ß√£o de Anexos
Atualizar o `PcmDetailsModal.tsx` para exibir a lista de anexos dispon√≠veis de forma din√¢mica. Se o valor do banco for uma URL simples, renderizar um bot√£o. Se for um array JSON de URLs, renderizar um bot√£o para cada anexo do array.

## Acceptance Criteria

### Valida√ß√£o Visual e de Neg√≥cio
- [ ] A tabela renderiza corretamente a coluna LEAD TIME exibindo apenas horas e minutos (ex: 45h 12m) quando a SC estiver confirmada.
- [ ] O banco de dados salva a coluna como `["https://...", "https://..."]` ao anexar mais de um arquivo.
- [ ] O painel de detalhes n√£o "quebra" ao visualizar uma solicita√ß√£o com formato antigo (apenas string URL) e abre corretamente.
- [ ] √â poss√≠vel anexar m√∫ltiplos arquivos tanto na cria√ß√£o do PCM quanto na confirma√ß√£o pelo Almoxarifado.

## Follow-up ó 2026-06-05T09:54:24-04:00

RefatoraÁ„o UI/UX: Layout Focado PCM

DiretÛrio de trabalho: c:\Users\bruno.siqueira\OneDrive - NADIANA AGROPECUARIA LTDA\¡rea de Trabalho\Projetos\Sistema Nadiana\src

**Objetivo:**
Refatorar o design dos Modais do MÛdulo PCM, abandonando o padr„o "Split Layout" (barra lateral + ·rea principal) e adotando um Layout Vertical Focado. 

**Requisitos e AlteraÁıes (Acceptance Criteria):**

1. PcmRequestModal.tsx:
- Reduzir o tamanho do modal para um tamanho mais compacto `size="lg"` (ou max-w-3xl/4xl).
- Remover a divis„o de colunas (w-[340px] sidebar vs flex-1 main).
- Organizar o fluxo de preenchimento em blocos lÛgicos verticais (usando Grid):
  - Bloco 1 (Contexto): Filial e Prioridade (Lado a lado).
  - Bloco 2 (Dados da M·quina): Equipamento e N∫ da RequisiÁ„o (Lado a lado).
  - Bloco 3 (O que precisa): Campo de ObservaÁ„o com destaque total.
  - Bloco 4 (Anexos): ¡rea de Upload no final.
- Importante: No cabeÁalho, REMOVA o texto "O lead time inicia apÛs o envio".

2. PcmDetailsModal.tsx:
- Eliminar o layout dividido (sidebar esquerda e conte˙do principal na direita). Reduzir o modal para `size="md"` ou `size="lg"`.
- O novo design usar· um formato de "Ficha Vertical":
  - Banner de Status (Topo): Card evidenciando se est· "Aguardando", "Finalizada" (mostrando n˙mero SC e SLA Atendimento) ou "Cancelada" (com motivo em vermelho).
  - Dados Originais (Abaixo): Cards de leitura exibindo a Fazenda, M·quina, RequisiÁ„o e ObservaÁıes.
  - Anexos: Exibidos de forma responsiva no rodapÈ.

3. PcmConfirmModal.tsx:
- Eliminar o layout dividido.
- Top Section (HistÛrico): Um card visualmente distinto (ex: bg-slate-50) com um resumo dos dados originais do PCM.
- Bottom Section (AÁ„o): Os inputs do Almoxarifado (N˙mero SC, ObservaÁıes, Upload de comprovante) centralizados e com destaque.

4. Nomenclatura Global (Lead Time -> SLA Atendimento):
- Renomeie todas as labels e textos visÌveis na interface de "Lead Time" para "SLA Atendimento" no mÛdulo PCM (ex: tabela principal em PcmRequests.tsx, PcmDetailsModal.tsx, etc). O c·lculo lÛgico n„o muda, apenas o texto para o usu·rio.

5. Componente Global de Anexos:
- Analise a forma como os anexos s„o renderizados (aqueles botıes grandes de "Visualizar Anexo" e a ·rea pontilhada de "Upload").
- Crie ou extraia isso para um componente global de UI (ex: FileUpload.tsx / FileList.tsx) caso faÁa sentido para padronizar e deixar mais profissional.

Trabalhe nesses arquivos de forma iterativa. Garanta que a estilizaÁ„o (Tailwind) permaneÁa com a estÈtica "Premium" (bordas arredondadas, cores harmoniosas, fundos suaves). Verifique a ausÍncia de erros de TS/Lint antes de finalizar.

## Follow-up - 2026-06-05T20:21:41-04:00

# Teamwork Project Prompt

Refatorar o m√≥dulo "Saving de Compras" do sistema, migrando a estrutura do banco de dados, aplicando os componentes globais de UI (Modo Elite - Azul/Slate), e removendo features legadas.

Working directory: c:\Users\bruno.siqueira\OneDrive - NADIANA AGROPECUARIA LTDA\√Årea de Trabalho\Projetos\Sistema Nadiana
Integrity mode: development

## Requirements

### R1. Migra√ß√£o de Banco e Tipagem
- Criar e executar script Node.js/TypeScript (ex: src/scripts/migrate_savings_users.ts) para ler todos os savings, mapear o texto da coluna comprador para usuarios.id e atualizar o campo created_by (fazendo fallback para o pr√≥prio id de quem rodar se n√£o encontrar o nome).
- Atualizar src/services/savingService.ts para que o .select() traga usuario:usuarios(nome, avatar_url) e remova a depend√™ncia da coluna textual comprador.

### R2. Refatora√ß√£o Visual da Listagem
- Modificar src/pages/Savings.tsx para usar os componentes <DataTable /> e <FilterBar />.
- A coluna "Cota√ß√£o" deve ser a primeira, formatada como ID (ex: #2678).
- A coluna "Comprador" deve usar o layout de perfil/avatar (igual ao m√≥dulo PCM ou Solicita√ß√µes de Cadastro).
- Remover toda a l√≥gica, bot√µes e o arquivo correspondente a "Importar CSV" (SavingImportModal.tsx).

### R3. Refatora√ß√£o dos Modais e Dashboard
- Modificar SavingFormModal.tsx e SavingDetailModal.tsx para usar os componentes globais (Modal, ModalHeader, ModalFooter, FormField).
- Remover o input manual de "Comprador" do formul√°rio de cria√ß√£o (usar apenas created_by fixo).
- Atualizar as cores de todo o m√≥dulo (incluindo SavingDashboard.tsx) de Teal/Emerald para a paleta global Blue/Slate.

## Acceptance Criteria

### Compila√ß√£o e Tipagem
- [ ] O comando npx tsc --noEmit deve rodar sem erros apontando para o m√≥dulo de Saving.

### Migra√ß√£o de Dados
- [ ] Script rodou com sucesso e todos os registros antigos de savings agora possuem created_by preenchido.
- [ ] A interface n√£o deve mostrar erros ou valores vazios para o nome do comprador nos registros antigos.

### UI/UX
- [ ] N√£o h√° nenhum tra√ßo de text-teal-600 ou bg-teal-600 nos arquivos refatorados (exceto se for alguma m√©trica espec√≠fica que exija verde, mas o tema principal deve ser Blue/Slate).
- [ ] O bot√£o "Importar CSV" n√£o existe mais na tela de listagem.
- [ ] A listagem utiliza DataTable e a ordena√ß√£o/filtros funcionam.
