---
name: escuadra-tenant-isolation
description: Use when writing ANY Escuadra data access — Supabase migrations, RLS policies, server queries, the DB repository layer, the public report endpoint, cron/ingestion jobs, or ANY Supabase MCP write. Triggers whenever studio data is read or written, or whenever provisioning the Supabase project. Prevents cross-tenant leaks and protects the forbidden production DB.
---

# Escuadra Tenant Isolation

## Overview

Escuadra is multi-tenant and sold to customers: a cross-tenant leak is the worst possible bug.
**RLS alone does not protect you here, because the ingestion/admin paths use the service role,
which BYPASSES RLS.** So isolation is enforced in two layers: (1) RLS for the authenticated
panel path, and (2) a disciplined repository layer that bakes `studio_id` into every
service-role query. Both are mandatory.

**Violating the letter of these rules is violating the spirit.** A single missing
`.eq('studio_id', …)` in a service-role query leaks another studio's data silently.

## Non-negotiable rules

1. **Every domain row has `studio_id`** (FK → `studios`, `on delete cascade`).
2. **RLS enabled on EVERY table.** Tenant tables: `FOR SELECT TO authenticated USING ((select is_studio_member(studio_id)))`. Ops tables (`inbound_messages`, `processing_jobs`, `pending_clarifications`, `cloud_sync_*`, `audit_log`, `rate_limits`, `onboarding_codes`): **no client policy = deny-all**; only the service role touches them.
3. **Panel reads use the RLS-enforced `authenticated` client**, NOT the service role. Service role is reserved for the ingestion pipeline, cron, and admin. (Defense in depth: the DB enforces isolation even if app code is wrong.)
4. **All service-role access goes through a typed repository** that REQUIRES an explicit `studioId` argument and bakes the filter in. No raw `supabaseAdmin.from(...)` scattered in route handlers.
5. **Public report** (`/r/[token]`): read with the service role scoped to ONE `public_token`; never accept `studio_id` from the client; never add an `anon` SELECT policy on tenant tables (so the blast radius is provably one report).
6. **Membership chokepoint:** one `is_studio_member(studio_id)` `SECURITY DEFINER STABLE` helper, wrapped as `(select is_studio_member(...))` so Postgres evaluates it once per query, not per row. Index `studio_members(user_id, studio_id)`.

## Forbidden-ref guard (Supabase MCP)

`assertSafeRef(ref)` is an **allowlist**: it throws unless `ref` equals the recorded
freshly-created `escuadra-prod` ref. A typo to any other project — especially the production DB
`luutdozbhinfiogugjbv` (a different product) — must throw. Call it before EVERY
`apply_migration` / `execute_sql` / `deploy_edge_function`. Never call a Supabase write tool
without passing the recorded ref explicitly.

## Repository pattern (the only way to query as service role)

```ts
// ✅ studioId is required and baked in — impossible to forget
export async function listObras(studioId: string) {
  const { data, error } = await admin
    .from("obras").select("*").eq("studio_id", studioId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ❌ NEVER: raw admin query in a route handler with no studio_id filter
const { data } = await admin.from("obras").select("*");   // leaks every studio
```

## Verification (its "test" — write these FIRST, keep them in smoke.ts)

- After migrations: `get_advisors(type:security)` returns ZERO "RLS disabled / no policy" findings.
- Create 2 studios + 2 users: user A **cannot** SELECT studio B's `obras` via the anon/authenticated key.
- **Service-role path test** (the one that matters): exercise the actual repository functions and prove they cannot return/write cross-studio rows.
- Public report: a tampered/guessed token → 404; the page exposes zero data from any other report/studio.
- `assertSafeRef('luutdozbhinfiogugjbv')` throws; `assertSafeRef(<wrong ref>)` throws; only the recorded ref passes.

## Red flags — STOP and fix

- A `supabaseAdmin.from(...)` call outside the repository layer.
- A service-role query without an explicit `studio_id` filter.
- Using the service role for a panel read "because it was easier".
- Any `anon`/`authenticated` SELECT policy on a tenant table for the public report.
- A Supabase MCP write call without `assertSafeRef` and an explicit project ref.
- Shipping the service-role key anywhere reachable by the client bundle.
