-- ============================================
-- MÓDULO DE CONTROLE DE NFs PENDENTES
-- ============================================

-- 1. Tabela de Fornecedores (Espelho Unisystem)
CREATE TABLE IF NOT EXISTS unisystem_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(100), -- ID original no Unisystem
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(20) UNIQUE NOT NULL, -- Chave principal de validação
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de NFs Lançadas no Unisystem (Espelho para Comparação)
CREATE TABLE IF NOT EXISTS unisystem_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(100),
    invoice_number VARCHAR(50) NOT NULL,
    supplier_cnpj VARCHAR(20) NOT NULL REFERENCES unisystem_suppliers(cnpj) ON DELETE RESTRICT,
    supplier_name VARCHAR(255), -- Redundância intencional para facilidade de leitura
    issue_date DATE NOT NULL, -- Data Emissão
    entry_date DATE NOT NULL, -- Data Lançamento (Contábil)
    amount DECIMAL(15, 2),
    farm_id UUID REFERENCES fazendas(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para busca rápida de duplicidade (Fornecedor + Número)
CREATE INDEX IF NOT EXISTS idx_unisystem_invoices_check ON unisystem_invoices(supplier_cnpj, invoice_number);

-- 3. Tabela de NFs Pendentes (Registro Manual na Fazenda)
CREATE TABLE IF NOT EXISTS pending_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) NOT NULL,
    
    -- Dados do Fornecedor
    supplier_name VARCHAR(255) NOT NULL,
    supplier_cnpj VARCHAR(20), -- Opcional inicialmente, mas ideal para match
    unisystem_supplier_id UUID REFERENCES unisystem_suppliers(id) ON DELETE SET NULL,
    
    -- Datas Importantes
    issue_date DATE NOT NULL,      -- Emissão
    delivery_date DATE NOT NULL,   -- Data de Chegada (Fato gerador do nosso KPI)
    
    amount DECIMAL(15, 2),
    
    farm_id UUID REFERENCES fazendas(id) ON DELETE CASCADE,
    registered_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    
    status VARCHAR(50) DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Conciliada', 'Cancelada')),
    observation TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pending_invoices_status ON pending_invoices(status);
CREATE INDEX IF NOT EXISTS idx_pending_invoices_farm ON pending_invoices(farm_id);

-- 4. RLS POLICIES

ALTER TABLE unisystem_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE unisystem_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_invoices ENABLE ROW LEVEL SECURITY;

-- Policies Simples (Baseado no schema atual que é permissivo para auth.uid() ou 'true' em dev)
-- UNISYSTEM SUPPLIERS
DROP POLICY IF EXISTS "Todos podem gerenciar fornecedores espelho" ON unisystem_suppliers;
CREATE POLICY "Todos podem gerenciar fornecedores espelho"
    ON unisystem_suppliers FOR ALL
    USING (true)
    WITH CHECK (true);

-- UNISYSTEM INVOICES
DROP POLICY IF EXISTS "Todos podem gerenciar notas espelho" ON unisystem_invoices;
CREATE POLICY "Todos podem gerenciar notas espelho"
    ON unisystem_invoices FOR ALL
    USING (true)
    WITH CHECK (true);

-- PENDING INVOICES
DROP POLICY IF EXISTS "Todos podem ver e criar notas pendentes" ON pending_invoices;
CREATE POLICY "Todos podem ver e criar notas pendentes"
    ON pending_invoices FOR ALL
    USING (true)
    WITH CHECK (true);
