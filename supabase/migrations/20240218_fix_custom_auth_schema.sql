-- 1. Disable RLS temporarily to allow schema changes and access
alter table public.goods_receipts disable row level security;

-- 2. Drop the incorrect Foreign Key (referencing auth.users)
alter table public.goods_receipts drop constraint if exists goods_receipts_receiver_id_fkey;

-- 3. Add the correct Foreign Key (referencing public.usuarios)
-- Assuming 'usuarios' is the table where app users are stored
alter table public.goods_receipts 
  add constraint goods_receipts_receiver_id_fkey 
  foreign key (receiver_id) 
  references public.usuarios (id);

-- 4. Enable RLS but allow 'anon' role (since app handles auth)
alter table public.goods_receipts enable row level security;

-- Drop previous strict policies
drop policy if exists "Enable read access for all users" on public.goods_receipts;
drop policy if exists "Enable insert for authenticated users only" on public.goods_receipts;
drop policy if exists "Enable update for authenticated users only" on public.goods_receipts;
drop policy if exists "Allow all actions for authenticated users" on public.goods_receipts;

-- Create policy allowing the application (anon/public role) to perform actions
create policy "Allow application access"
on public.goods_receipts
for all
using (true)
with check (true);
