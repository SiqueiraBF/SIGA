export type Modulo =
  | 'abrir_solicitacao'
  | 'analisar_cadastros'
  | 'gestao_usuarios'
  | 'config_fazendas'
  | 'gestao_combustivel'
  | 'gestao_postos'
  | 'abast_lancar'
  | 'abast_conferir'
  | 'sys_admin';

export type ViewScope = 'ALL' | 'OWN_ONLY' | 'SAME_FARM' | 'NONE';
export type EditScope = 'ALL' | 'OWN_ONLY' | 'OWN_PENDING' | 'NONE';

export interface ModulePermission {
  view_scope: ViewScope;
  edit_scope: EditScope;
  can_confirm: boolean;
  manage_fleet?: boolean;
  manage_roles?: boolean;
  can_ignore_nuntec?: boolean; // Permite ignorar pendências da Nuntec
  can_create_manual?: boolean; // Permite criar baixas manuais (sem integração)
}

export interface Funcao {
  id: string;
  nome: string;
  modulos_permitidos: Modulo[];
  permissoes?: Record<string, ModulePermission>; // Key is Modulo, but string for flexibility
}

export interface Usuario {
  id: string;
  nome: string;
  login: string;
  senha?: string; // Optional for safety when retrieving
  funcao_id: string;
  fazenda_id?: string; // Nullable if Central user
  ativo: boolean;
  email?: string;
  telefone?: string;
  last_login?: string; // ISO Date of last authentication
  last_seen?: string; // ISO Date of last heartbeat
  // Joined Fields
  funcao?: { nome: string };
  fazenda?: { nome: string };
}

export interface Fazenda {
  id: string;
  nome: string;
  ativo: boolean;
}

export type Prioridade = 'Normal' | 'Urgente';
export type StatusSolicitacao =
  | 'Aberto'
  | 'Aguardando'
  | 'Em Cadastro'
  | 'Finalizado'
  | 'Devolvido';

export interface Solicitacao {
  id: string;
  numero: number; // Sequential number for display
  usuario_id: string;
  fazenda_id: string;
  data_abertura: string; // ISO Date
  prioridade: Prioridade;
  status: StatusSolicitacao;
  observacao_geral?: string;
  created_at?: string;
}

export type StatusItem =
  | 'Pendente'
  | 'Aprovado'
  | 'Reprovado'
  | 'Existente'
  | 'Reativado'
  | 'Devolvido';

export interface ItemSolicitacao {
  id: string;
  numero: number; // Sequential number within the request
  solicitacao_id: string;
  descricao: string;
  unidade: string;
  marca?: string;
  referencia?: string;
  status_item: StatusItem;
  cod_reduzido_unisystem?: string;
  motivo_reprovacao?: string;
  tipo_tratativa?: 'NOVO' | 'REATIVADO' | 'EXISTENTE' | 'CORRECAO';
}

export type AcaoLog = 'CRIAR' | 'EDITAR' | 'STATUS' | 'EXCLUIR' | 'ITEM_EXCLUIDO' | 'ITEM_ALTERADO';

export interface AuditLog {
  id: string;
  data_hora: string; // ISO Date
  usuario_id: string;
  acao: AcaoLog;
  tabela: string;
  registro_id: string;
  dados_anteriores?: unknown;
  dados_novos?: unknown;
}

// --- Módulo de Combustíveis ---

export interface Veiculo {
  id: string;
  identificacao: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Posto {
  id: string;
  fazenda_id: string;
  nome: string;
  ativo: boolean;
  created_at?: string;
  nuntec_reservoir_id?: string; // ID do reservatório de DESTINO para monitorar no Nuntec
  tipo?: 'FISICO' | 'VIRTUAL'; // Classificação para monitoramento de medições
  tanques_adicionais?: { id: string; nome: string }[] | null;
  exibir_na_drenagem?: boolean;
}

export interface NuntecMeasurement {
  id: string;
  'operator-id': string;
  'reservoir-id': string;
  amount: number;
  'measured-at': string;
}

export interface NuntecReservoir {
  id: string;
  name: string;
  'fuel-id': string;
  capacity: number;
  stock?: number;
  'station-id': string;
  nozzleIds?: string[];
}

export interface NuntecAdmeasurement {
  id: string;
  'operator-id': string;
  'nozzle-id': string;
  'pulse-factor': number; // Saúde da bomba
  'updated-at': string;
}

export interface NuntecStation {
  id: string;
  name: string;
  reservoirs: NuntecReservoir[];
}

export interface NuntecConsumption {
  id: string;
  amount: number;
  'end-date': string; // Data da baixa
  'nozzle-id'?: string; // Optional now
  'reservoir-id': string; // Direct link
  'tag-number'?: string;
  'vehicle-plate'?: string;
}

export type TipoMarcador = 'ODOMETRO' | 'HORIMETRO' | 'SEM_MEDIDOR';

export interface Abastecimento {
  id: string;
  numero: number;
  data_abastecimento: string;
  fazenda_id: string;
  posto_id: string;
  veiculo_possui_cadastro: boolean;
  veiculo_id?: string | null;
  veiculo_nome?: string | null;
  volume: number;
  operador: string;
  operacao: string;
  cultura: string;
  tipo_marcador: TipoMarcador;
  leitura_marcador?: number | null;
  motivo_sem_marcador?: string | null;
  status: string;
  usuario_id: string;
  nuntec_transfer_id?: string; // ID da transferência Nuntec para evitar duplicidade
  nuntec_operator_id?: string; // ID do operador na Nuntec (para baixa correta)
  nuntec_generated_id?: string; // ID gerado pela API Nuntec após baixa (Audit)
  nuntec_fuel_id?: string; // ID do combustível na Nuntec (NUNCA deve ser nulo se integrado)
  nuntec_reservoir_id?: string; // Reservatório de origem na Nuntec
  nuntec_nozzle_number?: string; // Bico utilizado

  // Manager Mode Monitoring
  is_manager_mode?: boolean;
  manager_mode_reason?: 'ERRO_LEITURA' | 'SEM_TAG' | 'TERCEIRO' | 'MANUTENCAO' | 'OUTROS';
  manager_mode_description?: string; // Justificativa manual se OUTROS



  // Campos para display (Joins)
  usuario?: { nome: string };
  fazenda?: { nome: string };
  posto?: { nome: string; nuntec_reservoir_id?: string };
}

// --- Integração Nuntec ---

export interface NuntecPointing {
  id: string;
  amount: number;
  'reservoir-id'?: string;
  'fuel-id'?: string;
  'nozzle-number'?: string;
}

export interface NuntecTransfer {
  id: string;
  'start-at': string;
  'end-at'?: string;
  'operator-id'?: string;
  'pointing-in': NuntecPointing;
  'pointing-out'?: NuntecPointing;
  // Campos enriquecidos no cliente
  operatorName?: string;
  status?: 'PENDENTE_DADOS' | 'BAIXADO' | 'IGNORADO';
}

export interface IntegrationConfig {
  id: string;
  provider: 'NUNTEC';
  username?: string;
  password?: string;
  sync_start_date?: string;
  is_active: boolean;
  base_url?: string;
}

// --- Módulo de Solicitação de Materiais (Estoque) ---

export interface Material {
  id: string;
  name: string;
  unisystem_code?: string;
  group_name?: string;
  sub_group?: string;
  unit: string;
  current_stock: number;
  image_url?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
  last_exit_date?: string;
}

export type StockRequestStatus = 'PENDING' | 'SEPARATING' | 'SEPARATED' | 'DELIVERED' | 'CANCELED';

export interface StockRequest {
  id: string;
  friendly_id?: number; // Serial 1, 2, 3...
  farm_id: string;
  requester_id: string;
  separator_id?: string;
  status: StockRequestStatus | 'DRAFT';
  notes?: string;
  created_at: string;
  updated_at: string;

  // Joins
  fazenda?: { nome: string };
  usuario?: { nome: string; email?: string }; // Requester
  separator?: { nome: string }; // Separator
}

export type StockItemStatus = 'PENDING' | 'CONFIRMED' | 'UNAVAILABLE';

export interface StockRequestItem {
  id: string;
  request_id: string;
  material_id: string;
  quantity_requested: number;
  quantity_separated?: number;
  status: StockItemStatus;
  notes?: string;
  created_at: string;

  // Joins
  material?: Material;
}
