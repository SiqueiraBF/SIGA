# Análise de Refatoração UI/UX: Módulo PCM (Padrão Elite)

Esta análise mapeia as mudanças necessárias no código do módulo PCM para alinhar o frontend com o catálogo de componentes UI (Padrão Elite).

## 1. Refatoração em `src/pages/PcmRequests.tsx`

### A. Substituição das Abas por `<TabBar>`
**Observação**: O código atual utiliza `<div>` e `<button>` com classes Tailwind manuais para alternar entre "Lista" e "Dashboard".
**Ação**: Importar e aplicar o componente `<TabBar>`:
```tsx
import { TabBar } from '../components/ui/TabBar';

// No JSX:
<TabBar
  tabs={[
    { id: 'list', label: 'Lista de Solicitações', icon: FileText },
    { id: 'dashboard', label: 'Indicadores (Dashboard)', icon: BarChart3 }
  ]}
  activeTab={activeTab}
  onTabChange={(tab) => setActiveTab(tab as any)}
/>
```

### B. Remoção do `window.confirm` e Inclusão de `<ConfirmDialog>`
**Observação**: A exclusão (`handleDelete`) usa `window.confirm`.
**Ação**: 
1. Importar `ConfirmDialog` de `../components/ui/ConfirmDialog`.
2. Adicionar controle de estado local:
```tsx
const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
```
3. Alterar `handleDelete` para abrir o modal.
4. Renderizar o modal na página:
```tsx
<ConfirmDialog
  isOpen={isDeleteDialogOpen}
  title="Excluir Solicitação"
  description="Tem certeza que deseja excluir esta solicitação? Esta ação não pode ser desfeita."
  variant="danger"
  onConfirm={handleConfirmDelete}
  onClose={() => setIsDeleteDialogOpen(false)}
/>
```

### C. Substituição de `<table>` por `<DataTable>` e Badges
**Observação**: A renderização da lista é uma tabela manual gigante com mapeamento de linhas e Tailwind inline.
**Ação**:
1. Criar o array `columns` seguindo a interface do `<DataTable>`.
2. Usar o `<StatusBadge>` nas colunas de prioridade e status.
3. Configurar a propriedade `renderActions` chamando o `<TableActions>` e incluindo botões customizados com `<IconButton>` (caso necessário) para Cancelar (`XCircle`) e Confirmar (`CheckCircle2`).
```tsx
import { DataTable } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TableActions } from '../components/ui/TableActions';

<DataTable
  data={sortedRequests}
  columns={columns}
  rowKey={(req) => req.id}
  isLoading={loading}
  onRowClick={(req) => {
    setSelectedRequest(req);
    setIsDetailsModalOpen(true);
  }}
  renderActions={(req) => (
    <div className="flex justify-end gap-2 items-center w-full">
      {/* Botões customizados de negócio (Cancelar/Confirmar) */}
      <TableActions 
        onEdit={canEdit ? () => handleEditClick(req) : undefined}
        onDelete={canDelete ? () => handleDeleteClick(req.id) : undefined}
      />
    </div>
  )}
/>
```

## 2. Refatoração dos Modais (`src/components/pcm/`)
Arquivos afetados: `PcmRequestModal.tsx`, `PcmConfirmModal.tsx`, `PcmDetailsModal.tsx`, `PcmCancelModal.tsx`.

**Observação**: Atualmente usam uma estrutura "crua" com `fixed inset-0`, `backdrop-blur-md` e layouts flex complexos para header/footer.
**Ação**: Substituir as cascas nativas pelos containers padrões do Design System: `<Modal>`, `<ModalHeader>` e `<ModalFooter>`.

### Estrutura Base a ser Implementada:
```tsx
import { Modal, ModalHeader, ModalFooter } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

<Modal isOpen={isOpen} onClose={onClose} size="xl">
  <ModalHeader 
    title="Título do Modal" 
    icon={Package} // Ícone correspondente
    onClose={onClose}
  >
    {/* Inserir badges customizados que ficavam ao lado do título original, como os de STATUS */}
  </ModalHeader>

  {/* O Miolo do Split Layout continua igual, mas sem as bordas de janela externas! */}
  <div className="flex flex-1 overflow-hidden">
    {/* ... divs da sidebar esquerda e área principal direita ... */}
  </div>

  <ModalFooter>
    <Button variant="ghost" onClick={onClose} disabled={loading}>
      Fechar / Cancelar
    </Button>
    <Button variant="primary" onClick={handleSubmit} isLoading={loading} icon={Send}>
      Confirmar e Enviar
    </Button>
  </ModalFooter>
</Modal>
```

**Critério importante**: Manter o Split Layout (uma `div` com duas colunas laterais, esquerda para contexto, direita para input) intocável no miolo (body) da modal.
