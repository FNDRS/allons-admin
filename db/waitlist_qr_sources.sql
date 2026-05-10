-- Run this in the same Supabase project used by waitlist + admin.
-- Keeps metadata for each waitlist QR source configured from allons-admin.

create table if not exists public.waitlist_qr_sources (
  slug text primary key,
  label text not null,
  location text,
  notes text,
  is_active boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists waitlist_qr_sources_active_idx
  on public.waitlist_qr_sources (is_active);

create or replace function public.touch_waitlist_qr_sources_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists waitlist_qr_sources_updated_at on public.waitlist_qr_sources;
create trigger waitlist_qr_sources_updated_at
before update on public.waitlist_qr_sources
for each row
execute function public.touch_waitlist_qr_sources_updated_at();

alter table public.waitlist_qr_sources enable row level security;

-- No policies on purpose; service_role from admin server code bypasses RLS.
