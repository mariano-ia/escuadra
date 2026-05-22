-- Escuadra — remediación de advisors de seguridad (solo escuadra-prod ehvsfintmkoclqehqwdv)

-- 1) Mover extensiones fuera de public (lint 0014)
create schema if not exists extensions;
alter extension unaccent set schema extensions;
alter extension pg_trgm set schema extensions;

-- 2) search_path fijo + extensions donde se usa unaccent (lint 0011)
create or replace function tsv_update() returns trigger
language plpgsql set search_path = public, extensions as $$
declare
  col text; acc text := ''; j jsonb := to_jsonb(new);
begin
  foreach col in array tg_argv loop
    acc := acc || ' ' || coalesce(j->>col, '');
  end loop;
  new.search_vector := to_tsvector('spanish', unaccent(acc));
  return new;
end $$;

create or replace function create_default_albums(p_obra uuid, p_studio uuid)
returns void language plpgsql set search_path = public as $$
begin
  insert into albums (studio_id, obra_id, name, kind, is_system, sort_order) values
    (p_studio, p_obra, 'Fachada', 'fachada', true, 1),
    (p_studio, p_obra, 'Baños', 'banos', true, 2),
    (p_studio, p_obra, 'Instalación', 'instalacion', true, 3),
    (p_studio, p_obra, 'Terminaciones', 'terminaciones', true, 4);
end $$;

-- 3) universal_search: SECURITY INVOKER (respeta RLS → no fuga cross-tenant) + extensions en path
create or replace function universal_search(target_studio uuid, q text)
returns table(kind text, id uuid, obra_id uuid, title text, occurred_at timestamptz, rank real)
language sql stable security invoker set search_path = public, extensions as $$
  with query as (select websearch_to_tsquery('spanish', unaccent(q)) as tsq)
  select 'timeline'::text, e.id, e.obra_id, left(coalesce(e.body_text,''),120), e.occurred_at, ts_rank(e.search_vector, query.tsq)
    from timeline_entries e, query where e.studio_id = target_studio and e.search_vector @@ query.tsq
  union all
  select 'audio', m.id, e.obra_id, left(coalesce(m.transcript,''),120), e.occurred_at, ts_rank(m.search_vector, query.tsq)
    from media_assets m join timeline_entries e on e.id = m.timeline_entry_id, query where m.studio_id = target_studio and m.search_vector @@ query.tsq
  union all
  select 'photo', p.id, p.obra_id, coalesce(p.caption,''), p.created_at, ts_rank(p.search_vector, query.tsq)
    from photos p, query where p.studio_id = target_studio and p.search_vector @@ query.tsq
  union all
  select 'comment', c.id, e.obra_id, left(c.body,120), c.created_at, ts_rank(c.search_vector, query.tsq)
    from comments c join timeline_entries e on e.id = c.timeline_entry_id, query where c.studio_id = target_studio and c.search_vector @@ query.tsq
  order by 6 desc limit 100;
$$;

-- 4) Revocar ejecución de helpers a anon (lint 0028). is_studio_member/studio_role quedan
--    ejecutables por authenticated porque las policies RLS los invocan (patrón estándar Supabase).
revoke execute on function is_studio_member(uuid) from anon;
revoke execute on function studio_role(uuid) from anon;
revoke execute on function universal_search(uuid, text) from anon;
