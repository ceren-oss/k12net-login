alter table if exists public.orders
add column if not exists onaylanan_siparis boolean not null default false;
