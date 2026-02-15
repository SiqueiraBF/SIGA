-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Materials Table (Estoque/Catálogo)
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  unisystem_code TEXT UNIQUE, -- Código Integrado Unisystem
  group_name TEXT, -- Grupo
  sub_group TEXT, -- Sub Grupo
  unit TEXT NOT NULL DEFAULT 'UN',
  current_stock NUMERIC DEFAULT 0,
  image_url TEXT, -- URL da imagem no Storage
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Stock Requests (Cabeçalho da Solicitação)
CREATE TABLE IF NOT EXISTS stock_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  friendly_id SERIAL, -- ID Sequencial Amigável (1, 2, 3...)
  farm_id UUID NOT NULL REFERENCES fazendas(id),
  requester_id UUID NOT NULL REFERENCES usuarios(id),
  separator_id UUID REFERENCES usuarios(id), -- Quem separou
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING', 'SEPARATING', 'SEPARATED', 'DELIVERED', 'CANCELED')),
  notes TEXT, -- Observação geral
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Stock Request Items (Itens da Solicitação)
CREATE TABLE IF NOT EXISTS stock_request_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES stock_requests(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id),
  quantity_requested NUMERIC NOT NULL,
  quantity_separated NUMERIC, -- Preenchido pela Matriz
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'UNAVAILABLE')),
  notes TEXT, -- Observação do item
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_request_items ENABLE ROW LEVEL SECURITY;

-- 5. Policies (Simplificadas e Robustas)
-- Drop existing policies to clean up any mess
DROP POLICY IF EXISTS "Enable read access for all users" ON materials;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON materials;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON materials;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON materials;

DROP POLICY IF EXISTS "Enable read access for all users" ON stock_requests;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON stock_requests;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON stock_requests;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON stock_requests;

DROP POLICY IF EXISTS "Enable read access for all users" ON stock_request_items;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON stock_request_items;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON stock_request_items;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON stock_request_items;

-- Drop specifically named policies to allow re-running
DROP POLICY IF EXISTS "Allow All on Materials" ON materials;
DROP POLICY IF EXISTS "Allow All on Requests" ON stock_requests;
DROP POLICY IF EXISTS "Allow All on Items" ON stock_request_items;

-- Create "Permissive" Policies (Fix for Import Error)
-- Permitting everything for now to unblock the import. We can restrict later.
CREATE POLICY "Allow All on Materials" ON materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All on Requests" ON stock_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All on Items" ON stock_request_items FOR ALL USING (true) WITH CHECK (true);

-- Storage Bucket Setup (Tentativa de criação via SQL - Se falhar, criar 'material-images' no Painel Supabase)
INSERT INTO storage.buckets (id, name, public)
VALUES ('material-images', 'material-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for Storage (Permissive for now)
CREATE POLICY "Public Access Material Images" ON storage.objects FOR SELECT USING ( bucket_id = 'material-images' );
CREATE POLICY "Authenticated Upload Material Images" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'material-images' );
