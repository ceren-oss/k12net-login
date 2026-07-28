alter table if exists public.pre_orders
add column if not exists onaylanma_tarihi timestamptz;
