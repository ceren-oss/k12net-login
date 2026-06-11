create extension if not exists pgcrypto;

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  admin_username text not null,
  admin_name text,
  action text not null,
  target text,
  details jsonb not null default '{}'::jsonb
);

create index if not exists idx_admin_audit_logs_created_at
  on public.admin_audit_logs (created_at desc);

create index if not exists idx_admin_audit_logs_admin_username
  on public.admin_audit_logs (admin_username);

alter table public.admin_audit_logs enable row level security;

revoke all on public.admin_audit_logs from anon, authenticated;
