-- Drop existing policies if needed (or just run this to update)
drop policy if exists "Enable insert for authenticated users only" on public.goods_receipts;
drop policy if exists "Enable update for authenticated users only" on public.goods_receipts;

-- Re-create policies with correct checks
-- Ensure the user inserting is the one in receiver_id OR just allow any authenticated user to insert
create policy "Enable insert for authenticated users only" 
on public.goods_receipts 
for insert 
with check (
  auth.uid() = receiver_id
);

-- Allow updates (for exit)
create policy "Enable update for authenticated users only" 
on public.goods_receipts 
for update 
using (
  auth.role() = 'authenticated'
);
