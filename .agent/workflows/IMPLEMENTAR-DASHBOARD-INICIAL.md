---
description: Pipeline de implementação da nova Tela Inicial (Dashboard) do Usuário
---

# Plano de Implementação: Dashboard Inicial do Usuário

Este roteiro descreve as etapas para criar uma tela inicial unificada ("Torre de Controle") que agrega dados dos módulos de Combustível (Nuntec) e Solicitações de Cadastro (SC).

## 1. Banco de Dados e Backend

### 1.1. Criar Tabela `system_timeline`
Necessária para o componente "Timeline de Atividade".
- **Campos:**
  - `id` (uuid, pk)
  - `title` (text)
  - `description` (text, opcional)
  - `event_date` (timestamp)
  - `type` (enum/text: 'MANUTENCAO', 'FISCAL', 'GERAL')
  - `created_by` (uuid, fk usuarios)
  - `created_at` (timestamp)
- **Policies:** Leitura para todos, escrita apenas para Administradores.

### 1.2. Criar `dashboardService.ts`
Centralizar a lógica de agregação de dados para performance e organização.
- **Métodos:**
  - `getGeneralStats(userId, filters)`: Retorna os KPIs aglomerados.
  - `getTimelineEvents()`: Retorna eventos futuros da timeline.
  - `getActivityFeed()`: Busca híbrida combinando:
    - Últimas 5 SCs criadas/atualizadas.
    - Últimos 5 Abastecimentos Pendentes (Nuntec).
    - Ordena tudo cronologicamente.

## 2. Componentes de UI (Reutilizáveis)

### 2.1. `DashboardStatCard`
- Design novo com ícone colorido, valor principal grande e label descritivo.
- Suporte a variação de cor (Amber, Blue, Green).

### 2.2. `PriorityChart` (Gráfico de Rosca)
- Visualização simples da distribuição Urgente vs. Normal das SCs.
- Utilizar CSS cônico ou biblioteca leve (`recharts` se já instalada, senão CSS puro para leveza).

### 2.3. `ActivityTimeline`
- Lista vertical de eventos com linha do tempo visual.
- Destaque para a data e o tipo de evento.
- **Condicional:** Botão de "Adicionar Evento" visível apenas para Admin.

### 2.4. `NotificationFeed`
- Lista de cards compactos mostrando as últimas atividades.
- Ícones distintos para diferenciar origem (Gota para Combustível, Documento para SC).
- Ação rápida: Botão "Ver" que leva ao módulo específico.

## 3. Construção da Página `HomeDashboard.tsx`

### 3.1. Layout Grid
- Estrutura de Grid Responsivo (Mobile: 1 coluna, Desktop: 3 colunas).
- **Coluna Esquerda/Central (2/3):**
  - Linha de KPIs (Saldo Pendente, Cadastros Mês, Tempo Médio).
  - Seção de Gráficos (Status das SCs).
  - Componente Timeline.
- **Coluna Direita (1/3):**
  - Feed de Notificações (Altura total ou fixa com scroll).

### 3.2. Integração de Dados
- `useEffect` para carregar dados via `dashboardService`.
- Hooks de Loading (`isLoading`) e tratamento de erro.
- Cálculo de KPIs em tempo real (ex: filtrar `pendenciasNuntec` do contexto ou fetch fresco).

## 4. Roteamento e Navegação

### 4.1. Atualizar `Sidebar`
- Adicionar novo item "Início" ou "Dashboard" no topo da sidebar.
- Ícone: `LayoutDashboard` ou `Home`.

### 4.2. Configurar Rotas (`App.tsx`)
- Definir `/dashboard` (ou a raiz `/`) como rota para `HomeDashboard`.
- Garantir proteção por `PrivateRoute`.

## 5. Validação
- Verificar se KPIs batem com os valores nos módulos individuais.
- Testar permissão de edição da Timeline (Admin vs User).
- Verificar responsividade em telas menores.
