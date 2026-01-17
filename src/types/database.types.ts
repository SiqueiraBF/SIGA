export interface Database {
  public: {
    Tables: {
      // Funções
      funcoes: {
        Row: {
          id: string;
          nome: string;
          modulos_permitidos: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          modulos_permitidos: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          modulos_permitidos?: string[];
          created_at?: string;
        };
      };

      // Fazendas
      fazendas: {
        Row: {
          id: string;
          nome: string;
          ativo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          ativo?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          ativo?: boolean;
          created_at?: string;
        };
      };

      // Usuários
      usuarios: {
        Row: {
          id: string;
          nome: string;
          login: string;
          senha: string;
          funcao_id: string | null;
          fazenda_id: string | null;
          ativo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          login: string;
          senha: string;
          funcao_id?: string | null;
          fazenda_id?: string | null;
          ativo?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          login?: string;
          senha?: string;
          funcao_id?: string | null;
          fazenda_id?: string | null;
          ativo?: boolean;
          created_at?: string;
        };
      };

      // Solicitações
      solicitacoes: {
        Row: {
          id: string;
          numero: number;
          usuario_id: string | null;
          fazenda_id: string | null;
          data_abertura: string;
          prioridade: 'Normal' | 'Urgente';
          status: string;
          observacao_geral: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          numero?: number;
          usuario_id?: string | null;
          fazenda_id?: string | null;
          data_abertura?: string;
          prioridade?: 'Normal' | 'Urgente';
          status?: string;
          observacao_geral?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          numero?: number;
          usuario_id?: string | null;
          fazenda_id?: string | null;
          data_abertura?: string;
          prioridade?: 'Normal' | 'Urgente';
          status?: string;
          observacao_geral?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      // Itens de Solicitação
      itens_solicitacao: {
        Row: {
          id: string;
          solicitacao_id: string | null;
          numero: number;
          descricao: string;
          unidade: string;
          marca: string | null;
          status_item: string | null;
          cod_reduzido_unisystem: string | null;
          motivo_reprovacao: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          solicitacao_id?: string | null;
          numero: number;
          descricao: string;
          unidade?: string;
          marca?: string | null;
          status_item?: string | null;
          cod_reduzido_unisystem?: string | null;
          motivo_reprovacao?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          solicitacao_id?: string | null;
          numero?: number;
          descricao?: string;
          unidade?: string;
          marca?: string | null;
          status_item?: string | null;
          cod_reduzido_unisystem?: string | null;
          motivo_reprovacao?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      // Audit Logs
      audit_logs: {
        Row: {
          id: string;
          data_hora: string;
          usuario_id: string | null;
          acao: string;
          tabela: string;
          registro_id: string | null;
          dados_anteriores: any | null;
          dados_novos: any | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          data_hora?: string;
          usuario_id?: string | null;
          acao: string;
          tabela: string;
          registro_id?: string | null;
          dados_anteriores?: any | null;
          dados_novos?: any | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          data_hora?: string;
          usuario_id?: string | null;
          acao?: string;
          tabela?: string;
          registro_id?: string | null;
          dados_anteriores?: any | null;
          dados_novos?: any | null;
          created_at?: string;
        };
      };
    };
  };
}
