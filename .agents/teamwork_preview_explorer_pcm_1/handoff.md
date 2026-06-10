# Handoff Report: PCM UI Refactoring Strategy

## 1. Observation
- O arquivo `PcmRequests.tsx` utiliza componentes genéricos HTML (`<table>`, `window.confirm()`) e controles de aba manuais.
- Os 4 modais do módulo PCM (`PcmRequestModal`, `PcmConfirmModal`, `PcmDetailsModal`, `PcmCancelModal`) possuem uma implementação customizada e repetitiva de backgrounds escurecidos (backdrop) e contêineres absolutados.
- O catálogo de UI `ui_component_catalog.md` prescreve o uso obrigatório de componentes nativos do Padrão Elite (`<DataTable>`, `<Modal>`, `<ConfirmDialog>`, `<TabBar>`, `<StatusBadge>`).

## 2. Logic Chain
- A adoção do `<DataTable>` em `PcmRequests.tsx` forçará a definição programática de colunas, substituindo as tags estáticas `<th>` e iteradores `<tr>`.
- O uso de `<ConfirmDialog>` extrairá a lógica blocante do `window.confirm` para o ciclo de vida do React.
- A substituição das estruturas de modal estáticas pelos componentes `<Modal>`, `<ModalHeader>` e `<ModalFooter>` removerá quase 30 linhas de boilerplate de cada modal, garantindo acessibilidade, consistência de sombras e botões de fechamento padronizados, enquanto mantém o conteúdo dinâmico (Lead Time, Uploader de Anexos) inalterado.

## 3. Caveats
- O `DataTable` expõe uma propriedade `renderActions` para `<TableActions>`. No entanto, o fluxo de PCM exige ações altamente específicas (Confirmar e Cancelar, baseados em permissões). O implementador precisará verificar a viabilidade de combinar `<TableActions>` com `<IconButton>`s adicionais sem quebrar a consistência visual.
- A substituição do grid/flex manual do corpo dos modais deve preservar as classes de tamanho (`max-w-[1100px]`, `w-[340px] shrink-0`) que formam o Split Layout atual.

## 4. Conclusion
- A estratégia detalhada no `analysis.md` cobre todos os requisitos listados no `ORIGINAL_REQUEST.md` com total alinhamento às diretrizes do Padrão Elite. O planejamento está concluído e pronto para ser executado por um implementador.

## 5. Verification Method
- **TypeScript**: Rodar o comando de compilação (e.g. `npx tsc --noEmit`) para confirmar que a configuração de colunas do `DataTable` atende à tipagem do projeto.
- **Visual Inspection**: Avaliar a página "Solicitações PCM" para garantir que a ordenação, paginação e modais abrem adequadamente e possuem as animações consistentes dos componentes elite.
