-- 1. Create Table (if not exists)
create table if not exists public.goods_receipts (
  id uuid not null default gen_random_uuid (),
  receiver_id uuid not null references auth.users (id),
  entry_at timestamp with time zone not null default now(),
  supplier text not null,
  destination_farm_id uuid not null references public.fazendas (id),
  invoice_number text not null,
  exit_at timestamp with time zone null,
  driver_name text null,
  observation_entry text null,
  observation_exit text null,
  created_at timestamp with time zone not null default now(),
  constraint goods_receipts_pkey primary key (id)
);

-- 2. Enable RLS
alter table public.goods_receipts enable row level security;

-- 3. Reset Policies (Process: Drop all -> Add Allow)
drop policy if exists "Enable read access for all users" on public.goods_receipts;
drop policy if exists "Enable insert for authenticated users only" on public.goods_receipts;
drop policy if exists "Enable update for authenticated users only" on public.goods_receipts;
drop policy if exists "Enable delete for authenticated users only" on public.goods_receipts;
drop policy if exists "Allow all actions for authenticated users" on public.goods_receipts;

-- 4. Create ONE Permissive Policy
create policy "Allow all actions for authenticated users"
on public.goods_receipts
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');
