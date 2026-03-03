-- Create table for Goods Receipts
create table public.goods_receipts (
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

-- Enable RLS
alter table public.goods_receipts enable row level security;

-- Policies (Adjust as needed, generic public access for now or authenticated)
create policy "Enable read access for all users" on public.goods_receipts for select using (true);
create policy "Enable insert for authenticated users only" on public.goods_receipts for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users only" on public.goods_receipts for update using (auth.role() = 'authenticated');
