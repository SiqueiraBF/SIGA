export type InvoiceStatus = 'Pendente' | 'Conciliada' | 'Cancelada';

export interface UnisystemSupplier {
  id: string;
  external_id?: string;
  name: string;
  cnpj: string;
  created_at?: string;
}

export interface UnisystemInvoice {
  id: string;
  external_id?: string;
  invoice_number: string;
  supplier_cnpj: string;
  supplier_name: string;
  issue_date: string; // YYYY-MM-DD
  entry_date: string; // YYYY-MM-DD
  amount?: number;
  farm_id?: string;
  created_at?: string;
}

export interface PendingInvoice {
  id: string;
  invoice_number: string;
  supplier_name: string;
  supplier_cnpj?: string;
  unisystem_supplier_id?: string;
  issue_date: string;
  delivery_date: string;
  amount?: number;
  farm_id: string;
  registered_by: string;
  status: InvoiceStatus;
  observation?: string;
  created_at?: string;
  updated_at?: string;

  // Joins
  farm?: { nome: string };
  user?: { nome: string };
  unisystem_supplier?: UnisystemSupplier;
  file_url?: string;
}

export interface InvoiceKPIs {
  pending_count: number;
  avg_delay_days: number;
  oldest_pending_date: string | null;
}
