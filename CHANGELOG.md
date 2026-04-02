# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/), 
e este projeto adere ao [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-03-04

### Adicionado
- **React Query Hooks (`/src/hooks`)**: Introdução de gerenciamento de estado global e reativo para chamadas de API do sistema:
  - `useCleaningData.ts`: Centraliza o fetcher de limpar tela, status da semana global e status por fazenda.
  - `useCleaningSubmit.ts`: Centraliza a complexidade de envio de dados, fotos para o storage e acionamento de emails (Edge Functions).
  - `useCleaningDelete.ts`: Centraliza a exclusão e auto-invalidação de cache.
  - `useDrainageData.ts`: Centraliza o fetcher da tabela de drenagens, postos e listagens com caching.
  - `useDrainageSubmit.ts`: Submissão individual e em lote (Array) de drenagens, fotos e e-mails automatizados de forma transacional.
  - `useDrainageDelete.ts`: Exclusão de drenagens com auto-refresh global.
- **Camada de Segurança (Zod Schemas)** (`/src/schemas`):
  - `drainageSchema.ts`: Barreira de entrada criada para sanitizar Payloads do Módulo de Drenagem, prevenindo envios corrompidos ao Supabase e rejeitando lotes sem evidências visuais.
- **Componentes de UI de Limpeza (`/src/components/cleaning`)**: 
  - `AdminStatusTable.tsx`: Tabela gerencial de performance de limpeza de fazendas.
  - `StatusCard.tsx`: Card de widget informativo extraído do dashboard principal.
  - `CleaningCard.tsx`: Card de linha de registro extraído da lista principal.
- **Componentes Genéricos UI (`/src/components/ui`)**:
  - `PhotoEvidenceUploader.tsx`: Micro-componente centralizado com zona Drag&Drop UI, Previews Nativas e acionador de Câmera mobile. Abstraiu centenas de linhas dos modais PWA e Web.
- Documentação inicial técnica via manifesto do `documenter.md`.

### Alterado (Refatoração & Fixes Atômicos)
- **`CleaningList.tsx`**: Totalmente refatorado para utilizar a arquitetura Base-React Query. Remoção de dezenas de instâncias de `useState` acopladas para fetchings imperativos. Tamanho do arquivo reduzido massivamente pela separação de sub-componentes.
- **`MobileCleaning.tsx` (PWA)**: UI padronizada de acordo com as diretrizes Tap & Go (`mobiledev.md`). Remoção de fetchings acoplados e formulários manuais em favor do Hook de mutação atômica (`useCleaningSubmit`). Correção de lintings de `useEffect`.
- **`CleaningFormModal.tsx`**: Transformação do Dialog estático em Tag `<form>` orgânica nativa HTML5, solucionando problemas de intercepção de `submit`.
- **Sistema Genérico de UI**: Migrado bloqueios em `window.alert()` para Notificações Flutuantes (Toasts lib `react-hot-toast`).
- **Módulo Drenagem de Postos**:
  - **`drainageService.ts`**: Corrigida Falha Crítica de Órfãos de Storage. Implementada rotina de *Atmospheric Rollback* intercedendo na Supabase Storage: Se a query PGSQL falhar na inserção da Role/Tabela, removemos as imagens do Bucket imediatamente.
  - **`useDrainageSubmit.ts`**: Submissão re-arquitetada para interceptar payloads com a nova Malha Security *Zod*, servindo como a "Borda da Aplicação" para rejeitar chamadas burras da API.
  - **`DrainageList.tsx`**: Refatorado para abstrair dados remotos com o Hook `useDrainageData`. Corrigido bug React de `useEffect cascading rendering` adotando recomputação Pura no front-client (`useMemo`).
  - **`MobileDrainage.tsx` (PWA)**: Transformação massiva! O arquivo de 600 linhas teve sua engine de Câmera extraída para `PhotoEvidenceUploader`. Lógica de Lotes delegada para a Mutation. Adotados tipos unificados do novo `SharedDrainageTypes.ts`.
  - **`DrainageFormModal.tsx`**, **`DrainageBatchFormModal.tsx`**: Retirada completa de `props` manuais de `onSuccess` e `onUpdate`. Troca global dos avisos invasivos `window.alert()` por Toasts.
  - **`DrainageBatchFormModal.tsx` (Micro-Componentização)**: Formulário gigante (750+ linhas) estilhaçado. Os acordeões de tanques e grid de inputs foram abstraídos para o novo `DrainageBatchStationCard.tsx`, despencando o arquivo pai para saudáveis ~270 linhas.
  - **`DrainageDetailsModal.tsx`**: Corrigida quebra de renderização de interface ("Rendered more hooks do que no previous render") movendo instâncias do `useDrainageDelete` para o topo da execução de escopo.

### Removido
- Lógica suja/imperativa de requisições encadeadas `try/catch` de salvamento de registros (`cleaningService.ts`, `drainageService.ts` e `notificationService.ts`) de dentro das views (React Components), transferindo responsabilidade inteiramente para os Hooks de Mutação.
