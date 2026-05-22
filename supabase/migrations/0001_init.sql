-- Escuadra — schema inicial (multi-tenant, alta seguridad)
-- Ref del proyecto: ehvsfintmkoclqehqwdv (org Yacaré). NUNCA tocar luutdozbhinfiogugjbv.
-- Reglas: RLS en TODAS las tablas; lecturas tenant por membresía; ops tables deny-all;
-- escrituras desde server (service role). Ver skill escuadra-tenant-isolation.

-- ===================== Extensiones =====================
create extension if not exists pgcrypto;
create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- ===================== Helpers de búsqueda (trigger genérico) =====================
-- Mantiene search_vector vía trigger (no generated column) porque unaccent() es STABLE.
-- Uso: create trigger ... execute function tsv_update('col_a','col_b');
create or replace function tsv_update() returns trigger
language plpgsql as $$
declare
  col text;
  acc text := '';
  j jsonb := to_jsonb(new);
begin
  foreach col in array tg_argv loop
    acc := acc || ' ' || coalesce(j->>col, '');
  end loop;
  new.search_vector := to_tsvector('spanish', unaccent(acc));
  return new;
end $$;

-- ===================== Billing-ready =====================
create table plans (
  id text primary key,
  name text not null,
  price_monthly numeric not null default 0,
  max_obras int,
  max_users int,
  max_storage_mb int,
  features jsonb not null default '{}'::jsonb
);

-- ===================== Identidad / tenancy =====================
create table studios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_storage_path text,
  plan_id text references plans(id) default 'starter',
  status text not null default 'active' check (status in ('active','paused','closed')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

create table studio_members (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  invited_by uuid references auth.users(id),
  joined_at timestamptz not null default now(),
  unique (studio_id, user_id)
);
create index on studio_members (user_id, studio_id);

create table studio_invites (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('owner','admin','member')),
  token text unique not null,
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  expires_at timestamptz not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Ruteo WhatsApp: teléfono -> user+studio. Único POR ESTUDIO (un freelance puede estar en 2).
create table whatsapp_links (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  phone_e164 text not null,
  status text not null default 'pending' check (status in ('pending','active','revoked')),
  verified_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  unique (studio_id, phone_e164)
);
create index on whatsapp_links (phone_e164) where status = 'active';

create table onboarding_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  studio_id uuid not null references studios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

-- ===================== Dominio: obras =====================
create table obras (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  name text not null,
  address text,
  client_name text,
  client_phone text,
  cover_photo_id uuid,
  status text not null default 'active' check (status in ('active','paused','done','archived')),
  is_inbox boolean not null default false,  -- la "obra" Sin clasificar de cada estudio
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  search_vector tsvector
);
create index on obras (studio_id, status);
create index on obras using gin (search_vector);

create table albums (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  obra_id uuid not null references obras(id) on delete cascade,
  name text not null,
  kind text not null default 'custom' check (kind in ('fachada','banos','instalacion','terminaciones','custom')),
  is_system boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index on albums (obra_id);

create table providers (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  name text not null,
  trade text,
  phone_e164 text,
  notes text,
  is_provisional boolean not null default false,
  created_at timestamptz not null default now(),
  search_vector tsvector
);
create index on providers (studio_id);
create index on providers using gin (search_vector);

create table clients (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  obra_id uuid references obras(id) on delete set null,
  name text not null,
  phone_e164 text,
  email text,
  created_at timestamptz not null default now()
);

-- Aprendizaje por estudio (capa 2): asociaciones aprendidas proveedor/alias -> obra
create table provider_obra_associations (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  provider_id uuid references providers(id) on delete cascade,
  alias text,
  obra_id uuid not null references obras(id) on delete cascade,
  weight int not null default 1,
  updated_at timestamptz not null default now()
);
create index on provider_obra_associations (studio_id);

-- ===================== Estado conversacional (por usuario) =====================
create table conversation_state (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  active_obra_id uuid references obras(id) on delete set null,
  active_obra_set_at timestamptz,
  last_message_at timestamptz,
  last_reconfirm_at timestamptz,
  created_at timestamptz not null default now(),
  unique (studio_id, user_id)
);

-- Avance: agrupa media del mismo remitente (ventana de agrupación)
create table entry_groups (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  user_id uuid references auth.users(id),
  obra_id uuid references obras(id) on delete set null,
  album_id uuid references albums(id) on delete set null,
  status text not null default 'open' check (status in ('open','filed','inbox')),
  caption text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);
create index on entry_groups (studio_id, user_id, status);

create table pending_clarifications (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_group_id uuid references entry_groups(id) on delete cascade,
  question text not null,
  options jsonb not null default '[]'::jsonb,         -- opciones ordenadas para respuesta "1/2"
  candidate_obras jsonb not null default '[]'::jsonb,
  partial_extraction jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open','resolved','cancelled','expired')),
  reminded boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index on pending_clarifications (studio_id, user_id, status);

-- ===================== Timeline + adjuntos =====================
create table timeline_entries (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  obra_id uuid not null references obras(id) on delete cascade,
  entry_group_id uuid references entry_groups(id) on delete set null,
  type text not null check (type in ('photo','audio','text','quote','approval','payment','issue','visit','delivery','note','video')),
  created_by_user_id uuid references auth.users(id),
  provider_id uuid references providers(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  body_text text,
  source text not null default 'whatsapp' check (source in ('whatsapp','web')),
  inbound_message_id uuid,
  confidence real,                 -- confianza estructural del ruteo (0..1)
  needs_review boolean not null default false,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  search_vector tsvector
);
create index on timeline_entries (studio_id, obra_id, occurred_at desc);
create index on timeline_entries using gin (search_vector);

create table photos (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  obra_id uuid not null references obras(id) on delete cascade,
  album_id uuid references albums(id) on delete set null,
  timeline_entry_id uuid references timeline_entries(id) on delete cascade,
  storage_path text not null,
  width int, height int,
  caption text,
  taken_at timestamptz,
  created_by_user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  search_vector tsvector
);
create index on photos (obra_id, album_id);
create index on photos using gin (search_vector);

create table media_assets (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  timeline_entry_id uuid references timeline_entries(id) on delete cascade,
  kind text not null check (kind in ('audio','document','image','video')),
  storage_path text not null,
  mime text,
  bytes bigint,
  transcript text,
  transcript_lang text,
  content_hash text,               -- dedup (MU-01)
  created_at timestamptz not null default now(),
  search_vector tsvector
);
create index on media_assets (studio_id, content_hash);
create index on media_assets using gin (search_vector);

create table quotes (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  obra_id uuid not null references obras(id) on delete cascade,
  provider_id uuid references providers(id) on delete set null,
  timeline_entry_id uuid references timeline_entries(id) on delete cascade,
  amount numeric, currency text default 'ARS',
  description text,
  status text not null default 'received' check (status in ('received','approved','rejected','expired')),
  valid_until date,
  file_media_asset_id uuid references media_assets(id) on delete set null,
  needs_review boolean not null default false,
  created_at timestamptz not null default now()
);
create index on quotes (studio_id, obra_id);

create table approvals (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  obra_id uuid not null references obras(id) on delete cascade,
  timeline_entry_id uuid references timeline_entries(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  subject text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_at timestamptz default now(),
  resolved_at timestamptz
);
create index on approvals (studio_id, obra_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  obra_id uuid not null references obras(id) on delete cascade,
  provider_id uuid references providers(id) on delete set null,
  timeline_entry_id uuid references timeline_entries(id) on delete cascade,
  amount numeric, currency text default 'ARS',
  due_date date, paid_at timestamptz,
  status text not null default 'due' check (status in ('due','paid','overdue')),
  created_at timestamptz not null default now()
);
create index on payments (studio_id, obra_id);

create table issues (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  obra_id uuid not null references obras(id) on delete cascade,
  timeline_entry_id uuid references timeline_entries(id) on delete cascade,
  provider_id uuid references providers(id) on delete set null,
  title text, description text,
  severity text default 'media' check (severity in ('baja','media','alta')),
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz not null default now()
);
create index on issues (studio_id, obra_id);

create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  obra_id uuid references obras(id) on delete cascade,
  type text not null check (type in ('deadline','visit','delivery','payment','note')),
  scope text not null default 'obra' check (scope in ('obra','studio')),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  related_quote_id uuid references quotes(id) on delete set null,
  related_payment_id uuid references payments(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on calendar_events (studio_id, starts_at);

create table alerts (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  obra_id uuid references obras(id) on delete cascade,
  kind text not null,
  message text not null,
  severity text default 'media' check (severity in ('baja','media','alta')),
  due_at timestamptz,
  status text not null default 'open' check (status in ('open','dismissed')),
  generated_at timestamptz not null default now()
);
create index on alerts (studio_id, status);

create table comments (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  timeline_entry_id uuid references timeline_entries(id) on delete cascade,
  user_id uuid references auth.users(id),
  body text not null,
  created_at timestamptz not null default now(),
  search_vector tsvector
);
create index on comments using gin (search_vector);

-- ===================== Informes al cliente =====================
create table reports (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  obra_id uuid not null references obras(id) on delete cascade,
  title text, note text,
  public_token text unique not null,
  passcode text,
  is_active boolean not null default true,
  view_count int not null default 0,
  last_viewed_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by_user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index on reports (studio_id, obra_id);

create table report_photos (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  report_id uuid not null references reports(id) on delete cascade,
  photo_id uuid not null references photos(id) on delete cascade,
  sort_order int not null default 0
);
create index on report_photos (report_id);

create table report_views (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  report_id uuid not null references reports(id) on delete cascade,
  viewer_hash text,
  viewed_at timestamptz not null default now()
);
create index on report_views (report_id);

-- ===================== Ingesta / ops (deny-all a clientes) =====================
create table inbound_messages (
  id uuid primary key default gen_random_uuid(),
  twilio_sid text unique not null,
  from_phone text,
  studio_id uuid references studios(id) on delete set null,
  user_id uuid references auth.users(id),
  num_media int default 0,
  body text,
  raw jsonb,
  received_at timestamptz not null default now()
);

create table processing_jobs (
  id uuid primary key default gen_random_uuid(),
  inbound_message_id uuid references inbound_messages(id) on delete cascade,
  studio_id uuid references studios(id) on delete set null,
  status text not null default 'queued' check (status in ('queued','processing','awaiting_reply','done','failed','dead')),
  attempts int not null default 0,
  max_attempts int not null default 5,
  locked_at timestamptz,
  next_attempt_at timestamptz default now(),
  last_error text,
  created_at timestamptz not null default now()
);
create index on processing_jobs (status, next_attempt_at);

create table cloud_sync_connections (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  provider text not null check (provider in ('gdrive','dropbox')),
  access_token_enc text, refresh_token_enc text,
  root_folder_id text,
  status text not null default 'active' check (status in ('active','revoked')),
  connected_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (studio_id, provider)
);

create table cloud_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  photo_id uuid references photos(id) on delete cascade,
  provider text not null,
  status text not null default 'queued' check (status in ('queued','done','failed')),
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now()
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid references studios(id) on delete set null,
  actor_user_id uuid references auth.users(id),
  action text not null,
  target_table text, target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip text,
  created_at timestamptz not null default now()
);
create index on audit_log (studio_id, created_at desc);

create table rate_limits (
  bucket_key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (bucket_key, window_start)
);

-- Instrumentación day-1 (alimenta health-score / auditor en fast-follow)
create table event_log (
  id bigint generated always as identity primary key,
  studio_id uuid references studios(id) on delete set null,
  user_id uuid references auth.users(id),
  event text not null,             -- forward, correction, clarification_asked, inbox, report_generated, ...
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on event_log (studio_id, event, created_at);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid unique not null references studios(id) on delete cascade,
  plan_id text references plans(id) default 'starter',
  status text not null default 'trial' check (status in ('active','trial','past_due','canceled')),
  provider text not null default 'manual' check (provider in ('manual','stripe','mercadopago')),
  external_ref text,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create table usage_counters (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  period text not null,
  obras_count int not null default 0,
  users_count int not null default 0,
  storage_mb int not null default 0,
  unique (studio_id, period)
);

-- ===================== Helpers de membresía (SECURITY DEFINER) =====================
create or replace function is_studio_member(target_studio uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from studio_members m
    where m.studio_id = target_studio and m.user_id = auth.uid()
  );
$$;

create or replace function studio_role(target_studio uuid) returns text
language sql security definer stable set search_path = public as $$
  select role from studio_members m
  where m.studio_id = target_studio and m.user_id = auth.uid() limit 1;
$$;

-- ===================== RLS =====================
-- Tablas tenant: lectura por membresía. Escrituras = service role (bypassa RLS).
do $$
declare t text;
begin
  foreach t in array array[
    'studios','studio_members','studio_invites','whatsapp_links','obras','albums','providers',
    'clients','provider_obra_associations','conversation_state','entry_groups','pending_clarifications',
    'timeline_entries','photos','media_assets','quotes','approvals','payments','issues',
    'calendar_events','alerts','comments','reports','report_photos','report_views',
    'subscriptions','usage_counters'
  ] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- studios: miembro puede ver su estudio (id = studio_id aquí)
create policy studios_sel on studios for select to authenticated using (is_studio_member(id));
-- resto de tablas tenant con columna studio_id:
do $$
declare t text;
begin
  foreach t in array array[
    'studio_members','studio_invites','whatsapp_links','obras','albums','providers',
    'clients','provider_obra_associations','conversation_state','entry_groups','pending_clarifications',
    'timeline_entries','photos','media_assets','quotes','approvals','payments','issues',
    'calendar_events','alerts','comments','reports','report_photos','report_views',
    'subscriptions','usage_counters'
  ] loop
    execute format('create policy %I on %I for select to authenticated using (is_studio_member(studio_id))', t||'_sel', t);
  end loop;
end $$;

-- comments: los miembros pueden escribir
create policy comments_ins on comments for insert to authenticated with check (is_studio_member(studio_id));

-- profiles: cada uno ve/edita el suyo
alter table profiles enable row level security;
create policy profiles_sel on profiles for select to authenticated using (id = auth.uid());
create policy profiles_upd on profiles for update to authenticated using (id = auth.uid());
create policy profiles_ins on profiles for insert to authenticated with check (id = auth.uid());

-- plans: lectura pública (para mostrar precios)
alter table plans enable row level security;
create policy plans_sel on plans for select using (true);

-- Ops tables: deny-all (RLS on, sin policies → solo service role)
do $$
declare t text;
begin
  foreach t in array array[
    'onboarding_codes','inbound_messages','processing_jobs','cloud_sync_connections',
    'cloud_sync_jobs','audit_log','rate_limits','event_log'
  ] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- ===================== Triggers de búsqueda =====================
create trigger tsv_obras before insert or update on obras for each row execute function tsv_update('name','address','client_name');
create trigger tsv_providers before insert or update on providers for each row execute function tsv_update('name','trade','notes');
create trigger tsv_timeline before insert or update on timeline_entries for each row execute function tsv_update('body_text');
create trigger tsv_photos before insert or update on photos for each row execute function tsv_update('caption');
create trigger tsv_media before insert or update on media_assets for each row execute function tsv_update('transcript');
create trigger tsv_comments before insert or update on comments for each row execute function tsv_update('body');

-- ===================== Búsqueda universal =====================
create or replace function universal_search(target_studio uuid, q text)
returns table(kind text, id uuid, obra_id uuid, title text, occurred_at timestamptz, rank real)
language sql stable security definer set search_path = public as $$
  with query as (select websearch_to_tsquery('spanish', unaccent(q)) as tsq)
  select 'timeline'::text, e.id, e.obra_id, left(coalesce(e.body_text,''),120), e.occurred_at,
         ts_rank(e.search_vector, query.tsq)
    from timeline_entries e, query
   where e.studio_id = target_studio and e.search_vector @@ query.tsq
  union all
  select 'audio', m.id, e.obra_id, left(coalesce(m.transcript,''),120), e.occurred_at,
         ts_rank(m.search_vector, query.tsq)
    from media_assets m join timeline_entries e on e.id = m.timeline_entry_id, query
   where m.studio_id = target_studio and m.search_vector @@ query.tsq
  union all
  select 'photo', p.id, p.obra_id, coalesce(p.caption,''), p.created_at,
         ts_rank(p.search_vector, query.tsq)
    from photos p, query
   where p.studio_id = target_studio and p.search_vector @@ query.tsq
  union all
  select 'comment', c.id, e.obra_id, left(c.body,120), c.created_at,
         ts_rank(c.search_vector, query.tsq)
    from comments c join timeline_entries e on e.id = c.timeline_entry_id, query
   where c.studio_id = target_studio and c.search_vector @@ query.tsq
  order by rank desc
  limit 100;
$$;

-- ===================== Default albums por obra =====================
create or replace function create_default_albums(p_obra uuid, p_studio uuid)
returns void language plpgsql as $$
begin
  insert into albums (studio_id, obra_id, name, kind, is_system, sort_order) values
    (p_studio, p_obra, 'Fachada', 'fachada', true, 1),
    (p_studio, p_obra, 'Baños', 'banos', true, 2),
    (p_studio, p_obra, 'Instalación', 'instalacion', true, 3),
    (p_studio, p_obra, 'Terminaciones', 'terminaciones', true, 4);
end $$;

-- ===================== Storage (bucket privado) =====================
insert into storage.buckets (id, name, public) values ('obra-media','obra-media', false)
on conflict (id) do nothing;
-- Sin policies públicas: acceso solo vía service role + signed URLs (server).

-- ===================== Seed: planes =====================
insert into plans (id, name, price_monthly, max_obras, max_users, max_storage_mb, features) values
  ('starter','Starter',0,10,3,2048,'{}'::jsonb),
  ('pro','Pro',0,50,15,20480,'{}'::jsonb)
on conflict (id) do nothing;
