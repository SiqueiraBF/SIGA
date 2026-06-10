---
trigger: ui_changes, layout_creation, frontend_review
---

# Catálogo de Componentes UI (Obrigatório)

Este é o catálogo central de todos os componentes de Interface de Usuário (UI) do sistema. O uso destes componentes é **OBRIGATÓRIO** na criação de novas páginas e módulos. Eles garantem a consistência visual do padrão **Light Premium (Elite)**.

**Página de Referência (Gold Standard):** `src/pages/RequestList.tsx`

> [!WARNING]
> NUNCA construa UIs do zero com `<div>` ou `<table>` genéricas quando um destes componentes existir para a mesma finalidade.
> NÃO use `alert()` ou `window.confirm()`. Utilize `react-hot-toast` e `<ConfirmDialog>`.

## 1. Receita de Página Padrão (Page-Level Layout)
Toda página nova que segue o padrão Elite deve adotar esta estrutura principal:
```tsx
<div className="max-w-7xl mx-auto pb-20 space-y-6 animate-in fade-in duration-500">
  <PageHeader title="Título" subtitle="Subtítulo descritivo" icon={Box}>
    <Button icon={Plus} onClick={...}>Ação Principal</Button>
  </PageHeader>
  
  <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setTab} />
  
  {/* KPIs - Stats */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <StatsCard title="Total" value={100} icon={Hash} />
  </div>

  {/* Filtros e Busca */}
  <FilterBar onSearch={setSearch} searchValue={search} advancedFilters={<>...</>}>
    <Select options={...} />
  </FilterBar>

  {/* Tabela de Dados */}
  <DataTable data={data} columns={columns} rowKey={r => r.id} />
</div>
```

## 2. Layouts e Containers Principais

### `PageHeader` (`src/components/ui/PageHeader.tsx`)
Cabeçalho de nível superior das páginas.
- **Props**: `title` (string), `subtitle?` (string), `icon?` (LucideIcon), `children?` (para botões à direita).
- **Uso**: Sempre no topo da página. Não utilize headers internos em componentes filhos.

### `Card` (`src/components/ui/Card.tsx`)
Container genérico com estilos padronizados (rounded-2xl, shadow, etc).
- **Props**: `children`, `padding?`, `hover?`, `onClick?`.

## 3. Dados e Listagem

### `DataTable` (`src/components/ui/DataTable.tsx`)
A tabela de dados completa com suporte a ordenação, paginação e ações. **Obrigatória em substituição a `<table>` manuais**.
- **Props**: `data`, `columns`, `rowKey`, `isLoading`, `emptyTitle/Description`, `renderActions` (renderiza coluna Ações), `onRowClick`.
- **Modos**: Suporta paginação/ordenação interna ou server-side (passando `onPageChange` e `onSortChange`).

### `FilterBar` (`src/components/ui/FilterBar.tsx`)
Barra de busca superior com painel expansível de filtros.
- **Props**: `onSearch`, `searchValue`, `children` (filtros rápidos inline), `advancedFilters` (painel expansível colapsável).

### `StatsCard` (`src/components/ui/StatsCard.tsx`)
KPI Card para indicadores principais (ex: Qtd Registrada, Em Atraso). *Nota: é o único componente com export default*.
- **Props**: `title`, `value`, `icon`, `variant` (default, blue, green, red, yellow...).

### `StatusBadge` (`src/components/ui/StatusBadge.tsx`)
Pílula colorida para indicar o estado de um registro.
- **Props**: `status` (texto que aparece), `variant` (sucess, warning, error, info).

### `EmptyState` (`src/components/ui/EmptyState.tsx`)
Exibe tela vazia para tabelas ou listas sem dados.
- **Props**: `title`, `description`, `icon`, `action`.

### `Pagination` & `SortableHeader`
Componentes internos, normalmente não precisam ser chamados diretamente a menos que você construa uma tabela customizada (prefira usar `DataTable`).

## 4. Navegação e Ações

### `TabBar` (`src/components/ui/TabBar.tsx`)
Sistema de abas horizontais com indicadores (badges).
- **Props**: `tabs` (Array de objetos `{id, label, icon?, badge?}`), `activeTab`, `onTabChange`.

### `Button` (`src/components/ui/Button.tsx`)
Botão primário do sistema com feedback de clique e estado de carregamento.
- **Props**: `variant` (primary, secondary, danger, ghost), `icon`, `isLoading`, `fullWidth`.

### `IconButton` (`src/components/ui/IconButton.tsx`)
Botão apenas com ícone. Usado para ações compactas.
- **Props**: `icon`, `variant`, `label` (aria-label obrigatório).

### `TableActions` (`src/components/ui/TableActions.tsx`)
Conjunto padronizado de botões de ação para linhas da tabela (View, Edit, Delete, History).
- **Props**: `onEdit`, `onDelete`, `onView`, `onHistory`. Usado com a prop `renderActions` da `DataTable`.

## 5. Feedback e Validação

### `ConfirmDialog` (`src/components/ui/ConfirmDialog.tsx`)
Modal OBRIGATÓRIO para substituir `window.confirm()`.
- **Props**: `isOpen`, `title`, `description`, `variant` (danger, warning, info), `onConfirm`, `onClose`.

### React Hot Toast (`import toast from 'react-hot-toast'`)
Uso obrigatório para feedback de sucesso/erro. **Nunca use `alert()`**.
- `toast.success('Salvo!')` ou `toast.error('Falhou.')`

### Componentes de Skeleton (`TableSkeleton.tsx`, `StatsSkeleton.tsx`)
Placeholders para estado de carregamento assíncrono. Substituem spinners genéricos em grandes blocos visuais.

## 6. Modais

### `Modal` (`src/components/ui/Modal.tsx`)
Container base (backdrop e janela) com suporte a animação. Componha junto com `ModalHeader` e `ModalFooter`.
- **Modos recomendados**: Use 'Split Layout' (grid com sidebar e main) para formulários e visualizações densas (veja `layout_patterns_elite.md` para exemplo de montagem).

## 7. Formulários e Inputs

### `FormField` (`src/components/ui/FormField.tsx`)
Wrapper para qualquer campo que inclui rótulo (label), validação, asterisco e hints visuais.
- **Props**: `label`, `error`, `hint`, `required`. Engloba o input real dentro de `children`.

### Inputs (`Input.tsx`, `Select.tsx`, `MultiSelect.tsx`, `Textarea.tsx`)
Componentes atomizados com `forwardRef` para o `react-hook-form`. Reagem visualmente à prop `error` e têm UI alinhada.

## 8. Específicos de Negócio

- **`PhotoEvidenceUploader.tsx`**: Uploader unificado de evidências/fotos com funcionalidade de arrastar e soltar e visão mobile first da câmera.
- **`SyncStatusWidget.tsx`**: Floating Action Button flutuante fixo que lida com dados offline, exibido quando o sistema detecta `useAutoSync`.

---
## Checklist de Regras Absolutas de Migração:
- Substitua `<table>` por `<DataTable>`
- Substitua `window.confirm` por `<ConfirmDialog>`
- Substitua `alert` por `toast`
- Substitua layouts avulsos (`w-full bg-white rounded`) pelo flow `space-y-6` e `PageHeader` + `Card`
