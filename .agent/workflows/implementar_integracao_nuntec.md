---
description: Implementação de Integração de Transferências Nuntec (Módulo Combustível)
---

Este workflow descreve as etapas para integrar a API da Nuntec ao módulo de Baixas de Combustível, permitindo transformar transferências de "Gerente" em pendências de abastecimento.

### 1. Definição de Estrutura e Parâmetros

- [x] **Tipagem e Configuração Global**:
  - Definir `START_DATE_SYNC = '2026-01-01'` como constante ou variável de ambiente.
  - Atualizar interface `Posto` (`src/types.ts`) com novos campos opcionais:
    - `nuntec_reservoir_id`: string/number (ID do Reservatório de Destino na API externa para monitorar).
    - _Nota_: O vínculo com a Fazenda já existe na interface `Posto` atual e será mantido para controle de acesso.

- [x] **Serviço de Integração (`src/services/nuntecService.ts`)**:
  - `getTransfers(dateFrom)`: Busca transferências filtradas pela data de corte.
  - `getOperatorName(id)`: Busca nome do operador no endpoint `/operators/{id}.xml` (com cache simples).
  - **Lógica de Cruza (Simplificada)**:
    - Recebe lista de Postos ativos do sistema.
    - Para cada transferência, verifica se o `pointing-in.reservoir-id` corresponde ao `nuntec_reservoir_id` de algum posto cadastrado.
    - Ignora a origem (`pointing-out`).
    - O nome do posto/reservatório usado na exibição será o do cadastro do sistema Nadiana, vinculado à Fazenda correta.

### 2. Adaptação do Módulo de Gestão de Postos (`StationManagement.tsx`)

- [x] **Atualizar Formulário de Posto**:
  - Manter seleção de Fazenda e Nome do Posto.
  - Adicionar campo único: **"ID Reservatório Monitorado (Nuntec)"**.
  - Remover redundâncias: Não precisa pedir nome do reservatório externo, pois o foco é apenas monitorar as entradas neste ID.

### 3. Integração na Tela de Baixas (`FuelingList.tsx`)

- [x] **Visualização de Pendências**:
  - Adicionar aba/filtro "Pendências de Integração".
  - **Regra de Visibilidade**:
    - O sistema filtra as transferências cujo `reservoir-id` bate com os postos que o usuário tem permissão de ver (baseado na Fazenda do Posto).
    - Admins veem todas as pendências mapeadas.

- [x] **Modal de Resolução de Pendência**:
  - **Dados Fixos (Read-only)**:
    - Data/Hora (da API).
    - Volume (da API).
    - Posto (Nome do Posto Nadiana vinculado ao ID Nuntec).
    - Operador (Nome buscado na API).
  - **Dados de Entrada (Obrigatórios)**:
    - Veículo (Select com busca).
    - Hodômetro/Horímetro.
    - Operação (Select).
    - Cultura (Select).
  - **Validação**: Veículo deve ter cadastro ativo.

### 4. Persistência

- [x] **Salvar Baixa**:
  - Criar registro em `abastecimentos`.
  - Gravar ID da transferência (`nuntec_transfer_id`) para evitar duplicidade na listagem futura.
