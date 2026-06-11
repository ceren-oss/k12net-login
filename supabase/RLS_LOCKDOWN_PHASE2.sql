-- Phase-2 güvenlik sıkılaştırması
-- ÖNEMLİ: Bu scripti, tüm kritik veri akışlarını backend (service role) API'ye taşıdıktan sonra çalıştırın.
-- Bu script, browser'dan doğrudan tablo erişimini kapatır.

begin;

do $$
declare
  tbl text;
  tables text[] := array[
    'dealers',
    'orders',
    'order_items',
    'order_class_items',
    'pre_orders',
    'pre_order_items',
    'payments',
    'checks',
    'products',
    'dealer_prices',
    'school_forms',
    'school_form_items'
  ];
begin
  foreach tbl in array tables loop
    if exists (
      select 1
      from pg_tables
      where schemaname = 'public'
        and tablename = tbl
    ) then
      execute format('alter table public.%I enable row level security;', tbl);
      execute format('revoke all on table public.%I from anon, authenticated;', tbl);
    end if;
  end loop;
end $$;

commit;

-- Uygulama notu:
-- 1) SQL Editor'de çalıştırdıktan sonra, frontend'in doğrudan Supabase table sorguları başarısız olacaktır.
-- 2) Devam etmek için tüm CRUD işlemlerini /api/* endpointleri üzerinden service-role ile yürütün.
