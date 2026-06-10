# Análise de Refatoração UI/UX: Módulo PCM (Padrão Elite)

## 1. `src/pages/PcmRequests.tsx`
- **Substituição de Tabela**: A estrutura manual `<table>`, `<thead>` e `<tbody>` será removida e substituída pelo componente `<DataTable>` de `src/components/ui/DataTable.tsx`.
- **Configuração de Colunas**: As colunas "Requisição", "Data", "Filial", "Solicitante", "Equipamento", "Prioridade", "Status", "SC", "Data SC" e "Lead Time" serão tipadas e passadas para a prop `columns` do `DataTable`.
- **Uso de StatusBadge**: 
  - Na coluna de Status: usar `<StatusBadge>` mapeando "PENDING_ALMOXARIFADO" para variant="warning", "COMPLETED" para variant="success", e "CANCELLED" para variant="error".
  - Na coluna de Prioridade: mapear "Urgente" para variant="error" e "Normal" para variant="info".
- **Ações da Linha (TableActions)**: O `DataTable` receberá a propriedade `renderActions`. Como o módulo PCM possui ações customizadas (Confirmar e Cancelar), implementaremos isso adicionando botões `<IconButton>` específicos ou passando as funções nativas (`onEdit`, `onDelete`) para o `<TableActions>`, e as opções adicionais renderizadas ao lado.
- **Substituição de `window.confirm`**: Adicionar um state local `const [requestToDelete, setRequestToDelete] = useState<string | null>(null)` e renderizar um `<ConfirmDialog>` para lidar com a exclusão.
- **Navegação (TabBar)**: Substituir o grupo de botões `Lista/Dashboard` (que controlam a view atual) pelo componente `<TabBar>` com badges ou ícones se necessário.

## 2. `src/components/pcm/PcmRequestModal.tsx`
- **Container**: Remover o div externo `fixed inset-0 bg-slate-900/60...` e a div interna de card e substituir por `<Modal isOpen={isOpen} onClose={onClose} size="xl">`.
- **Cabeçalho e Rodapé**: Usar `<ModalHeader title="..." icon={Package} onClose={onClose}>` e `<ModalFooter>`.
- **Corpo (Split Layout)**: Manter o layout atual de duas colunas usando flex/grid conforme já estruturado na parte principal da tela (sem alterar a lógica dos arquivos ou do formulário).
- **Botões**: Substituir `<button>` manuais por componentes `<Button>` e `<IconButton>` da UI padronizada.

## 3. `src/components/pcm/PcmConfirmModal.tsx`
- Mesmas alterações estruturais do RequestModal: Envolver com `<Modal>`, usar `<ModalHeader>` com o texto "Confirmação Almoxarifado" e `<ModalFooter>`.
- Manter o layout split com o lado esquerdo em modo de leitura e o lado direito com o formulário de confirmação.

## 4. `src/components/pcm/PcmDetailsModal.tsx`
- Envolver com `<Modal size="xl">`.
- Utilizar `<ModalHeader>` com o ícone `ClipboardList` e remover a lógica customizada de fechamento no topo, delegando para o ModalHeader.
- Utilizar `<ModalFooter>` com um `<Button variant="ghost">` para "Fechar".

## 5. `src/components/pcm/PcmCancelModal.tsx`
- Por ser um modal de aviso menor, utilizar `<Modal size="md">`.
- Substituir o header simples pelo `<ModalHeader title="Cancelar Solicitação" icon={AlertTriangle}>`.
- O footer com a ação de confirmação vermelha deve ser implementado via `<ModalFooter>`.
