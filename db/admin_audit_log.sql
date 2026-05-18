-- =====================================================================
-- Auditoría de cambios en allons-admin / Supabase
-- =====================================================================
-- Objetivos (alineado a buenas prácticas comunes en controles SOC2 /
-- COSO): trazabilidad de QUIÉN hizo QUÉ, SOBRE QUÉ recurso, CUÁNDO, desde
-- dónde aprox., y resultado (éxito / fallo).
--
-- Principios aplicados aquí:
--   • Solo inserción (sin UPDATE/DELETE) en filas históricas — trigger.
--   • RLS sin políticas públicas: la app usa service_role tras validar root.
--   • Campos suficientemente genéricos (resource_type/resource_id/action).
--   • JSON opcional antes/después sin sustituir el sistema de registros oficial.
--
-- Ejecutar en el SQL Editor de Supabase (mismo proyecto que waitlist-admin).
--
-- RETENCIÓN: política empresa (p. ej. 1–7 años según Ley de Protección de
-- datos / normativa interna). Purga/control de volumen a definir con legal.
--

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),

  -- Momento efectivo UTC (preferir hora servidor de DB para consistencia)
  occurred_at timestamptz not null default now(),

  -- Actor (usualmente Sesión Supabase Auth del usuario root-admin)
  actor_user_id uuid,
  actor_email text,

  -- Origen técnico en la app Next (útil ante forense futuro)
  source text not null,
  action text not null,

  resource_type text not null,
  resource_id text not null,

  outcome text not null check (outcome in ('success', 'failure')),

  http_method text,
  http_path text,

  ip_address text,
  user_agent text,

  correlation_id uuid,
  client_request_id text,

  error_code text,
  error_message text,

  -- Cambios conocidos cuando aplica (nunca debe ser la única fuente jurídica)
  state_before jsonb not null default '{}'::jsonb,
  state_after jsonb not null default '{}'::jsonb,

  constraint admin_audit_logs_action_nonempty check (length(trim(action)) > 0),
  constraint admin_audit_logs_resource_type_nonempty check (length(trim(resource_type)) > 0),
  constraint admin_audit_logs_resource_id_nonempty check (length(trim(resource_id)) > 0)
);

comment on table public.admin_audit_logs is
  'Registro inmutable de acciones privilegiadas (panel admin). Append-only enforced by trigger.';
comment on column public.admin_audit_logs.source is
  'Sub-sistema dentro de Next: ej. server_action | route_handler.';
comment on column public.admin_audit_logs.action is
  'Taxonomía estable: punto.sección.operacion (ej. auth.user_suspend, event.status_patch).';

create index if not exists admin_audit_logs_occurred_at_idx
  on public.admin_audit_logs (occurred_at desc);

create index if not exists admin_audit_logs_resource_idx
  on public.admin_audit_logs (resource_type, resource_id);

create index if not exists admin_audit_logs_actor_idx
  on public.admin_audit_logs (actor_user_id);

create index if not exists admin_audit_logs_action_idx
  on public.admin_audit_logs (action);

-- =====================================================================
-- Inmutabilidad histórica: bloquear UPDATE y DELETE desde roles normales.
-- =====================================================================
create or replace function public.admin_audit_logs_reject_mutations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'admin_audit_logs is append-only: % not allowed', tg_op;
end;
$$;

drop trigger if exists trg_admin_audit_logs_no_update_delete on public.admin_audit_logs;

create trigger trg_admin_audit_logs_no_update_delete
before update or delete on public.admin_audit_logs
for each row
execute function public.admin_audit_logs_reject_mutations();

alter table public.admin_audit_logs enable row level security;

-- Sin políticas: anon/authenticated no acceden por PostgREST. El server de
-- allons-admin usa service_role después de gate root (same pattern que waitlist_qr_sources).
