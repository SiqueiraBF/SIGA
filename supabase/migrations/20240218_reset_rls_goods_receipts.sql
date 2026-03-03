-- Reset RLS for goods_receipts
alter table public.goods_receipts disable row level security;
alter table public.goods_receipts enable row level security;

-- Drop all existing policies to avoid conflicts
drop policy if exists "Enable read access for all users" on public.goods_receipts;
drop policy if exists "Enable insert for authenticated users only" on public.goods_receipts;
drop policy if exists "Enable update for authenticated users only" on public.goods_receipts;
drop policy if exists "Enable delete for authenticated users only" on public.goods_receipts;

-- Create permissive policies for authenticated users
create policy "Allow all actions for authenticated users"
on public.goods_receipts
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');
