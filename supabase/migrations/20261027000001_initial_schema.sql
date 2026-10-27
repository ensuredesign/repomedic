-- RepoMedic M1 Initial Schema Migration
-- Enforces strict RLS, foreign key indexing, atomic stage locks, and approval-gated PR constraints.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'run_status') then
    create type public.run_status as enum (
      'queued',
      'fetching',
      'baseline_running',
      'investigating',
      'patch_generating',
      'patch_testing',
      'refining',
      'verified',
      'unverified',
      'failed',
      'awaiting_approval',
      'draft_pr_created'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'test_result_kind') then
    create type public.test_result_kind as enum ('baseline', 'candidate');
  end if;
end
$$;

-- 1. profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Auto-confirm email on dev instance & auto-create profile on signup
create or replace function public.before_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;

revoke execute on function public.before_auth_user_created() from public, anon, authenticated;

drop trigger if exists on_auth_user_before_created on auth.users;
create trigger on_auth_user_before_created
  before insert on auth.users
  for each row execute function public.before_auth_user_created();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. incidents
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  repository_full_name text not null check (char_length(repository_full_name) between 3 and 200),
  repository_id text,
  base_sha text not null check (char_length(base_sha) between 7 and 64),
  error_text_redacted text not null check (char_length(error_text_redacted) between 10 and 12000),
  title text not null check (char_length(title) between 3 and 240),
  affected_file_hint text check (affected_file_hint is null or char_length(affected_file_hint) <= 260),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists incidents_user_id_created_at_idx on public.incidents (user_id, created_at desc);
create index if not exists incidents_is_demo_idx on public.incidents (is_demo) where is_demo = true;

alter table public.incidents enable row level security;
alter table public.incidents force row level security;

drop policy if exists incidents_select_own_or_demo on public.incidents;
create policy incidents_select_own_or_demo on public.incidents
  for select to anon, authenticated
  using (is_demo = true or (select auth.uid()) = user_id);

drop policy if exists incidents_insert_own on public.incidents;
create policy incidents_insert_own on public.incidents
  for insert to authenticated
  with check ((select auth.uid()) = user_id and is_demo = false);

drop policy if exists incidents_delete_own on public.incidents;
create policy incidents_delete_own on public.incidents
  for delete to authenticated
  using ((select auth.uid()) = user_id and is_demo = false);

-- 3. runs
create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.run_status not null default 'queued',
  attempt_count integer not null default 0 check (attempt_count >= 0 and attempt_count <= 2),
  current_stage text not null default 'queued',
  model_id text not null,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  estimated_cost_usd numeric(10, 6),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  last_error text,
  runner_id text,
  claim_token text,
  claim_expires_at timestamptz,
  diagnosis_json jsonb,
  idempotency_key text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index if not exists runs_incident_id_idx on public.runs (incident_id);
create index if not exists runs_user_id_created_at_idx on public.runs (user_id, created_at desc);
create index if not exists runs_status_idx on public.runs (status);
create index if not exists runs_is_demo_idx on public.runs (is_demo) where is_demo = true;

alter table public.runs enable row level security;
alter table public.runs force row level security;

drop policy if exists runs_select_own_or_demo on public.runs;
create policy runs_select_own_or_demo on public.runs
  for select to anon, authenticated
  using (is_demo = true or (select auth.uid()) = user_id);

drop policy if exists runs_insert_own on public.runs;
create policy runs_insert_own on public.runs
  for insert to authenticated
  with check ((select auth.uid()) = user_id and is_demo = false);

drop policy if exists runs_update_own on public.runs;
create policy runs_update_own on public.runs
  for update to authenticated
  using ((select auth.uid()) = user_id and is_demo = false)
  with check ((select auth.uid()) = user_id and is_demo = false);

-- 4. run_events
create table if not exists public.run_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seq integer not null check (seq >= 1),
  stage text not null,
  event_type text not null,
  summary text not null check (char_length(summary) <= 1000),
  payload jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (run_id, seq)
);

create index if not exists run_events_run_id_seq_idx on public.run_events (run_id, seq asc);
create index if not exists run_events_user_id_idx on public.run_events (user_id);

alter table public.run_events enable row level security;
alter table public.run_events force row level security;

drop policy if exists run_events_select_own_or_demo on public.run_events;
create policy run_events_select_own_or_demo on public.run_events
  for select to anon, authenticated
  using (is_demo = true or (select auth.uid()) = user_id);

drop policy if exists run_events_insert_own on public.run_events;
create policy run_events_insert_own on public.run_events
  for insert to authenticated
  with check ((select auth.uid()) = user_id and is_demo = false);

-- 5. patches
create table if not exists public.patches (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_number integer not null check (attempt_number between 1 and 2),
  unified_diff text not null check (char_length(unified_diff) between 1 and 100000),
  diff_sha256 text not null check (char_length(diff_sha256) = 64),
  touched_paths text[] not null default '{}',
  rationale text not null,
  risk_notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (run_id, attempt_number)
);

create index if not exists patches_run_id_idx on public.patches (run_id);
create index if not exists patches_user_id_idx on public.patches (user_id);

alter table public.patches enable row level security;
alter table public.patches force row level security;

drop policy if exists patches_select_own_or_demo on public.patches;
create policy patches_select_own_or_demo on public.patches
  for select to anon, authenticated
  using (is_demo = true or (select auth.uid()) = user_id);

drop policy if exists patches_insert_own on public.patches;
create policy patches_insert_own on public.patches
  for insert to authenticated
  with check ((select auth.uid()) = user_id and is_demo = false);

-- 6. test_results
create table if not exists public.test_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  patch_id uuid references public.patches(id) on delete set null,
  kind public.test_result_kind not null,
  command text not null,
  exit_code integer not null,
  passed integer check (passed is null or passed >= 0),
  failed integer check (failed is null or failed >= 0),
  duration_ms integer not null check (duration_ms >= 0),
  stdout_excerpt text not null default '',
  stderr_excerpt text not null default '',
  log_object_path text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists test_results_run_id_idx on public.test_results (run_id);
create index if not exists test_results_patch_id_idx on public.test_results (patch_id);
create index if not exists test_results_user_id_idx on public.test_results (user_id);

alter table public.test_results enable row level security;
alter table public.test_results force row level security;

drop policy if exists test_results_select_own_or_demo on public.test_results;
create policy test_results_select_own_or_demo on public.test_results
  for select to anon, authenticated
  using (is_demo = true or (select auth.uid()) = user_id);

drop policy if exists test_results_insert_own on public.test_results;
create policy test_results_insert_own on public.test_results
  for insert to authenticated
  with check ((select auth.uid()) = user_id and is_demo = false);

-- 7. approvals
create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  approved_sha text not null,
  approved_patch_id uuid not null references public.patches(id) on delete cascade,
  approved_diff_sha256 text not null check (char_length(approved_diff_sha256) = 64),
  approved_at timestamptz not null default now(),
  action text not null default 'create_draft_pr' check (action = 'create_draft_pr'),
  unique (run_id, approved_patch_id)
);

create index if not exists approvals_run_id_idx on public.approvals (run_id);
create index if not exists approvals_user_id_idx on public.approvals (user_id);
create index if not exists approvals_approved_patch_id_idx on public.approvals (approved_patch_id);

alter table public.approvals enable row level security;
alter table public.approvals force row level security;

drop policy if exists approvals_select_own on public.approvals;
create policy approvals_select_own on public.approvals
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists approvals_insert_own on public.approvals;
create policy approvals_insert_own on public.approvals
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- 8. pull_requests
create table if not exists public.pull_requests (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  approval_id uuid not null references public.approvals(id) on delete restrict,
  github_pr_number integer not null,
  github_pr_url text not null,
  branch_name text not null,
  head_sha text,
  is_draft boolean not null default true check (is_draft = true),
  created_at timestamptz not null default now()
);

create index if not exists pull_requests_user_id_idx on public.pull_requests (user_id);
create index if not exists pull_requests_approval_id_idx on public.pull_requests (approval_id);

alter table public.pull_requests enable row level security;
alter table public.pull_requests force row level security;

drop policy if exists pull_requests_select_own on public.pull_requests;
create policy pull_requests_select_own on public.pull_requests
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists pull_requests_insert_own on public.pull_requests;
create policy pull_requests_insert_own on public.pull_requests
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Atomic stage lock / claim helper (runs as security invoker so RLS applies)
create or replace function public.claim_run_stage(
  p_run_id uuid,
  p_claim_token text,
  p_lease_seconds integer default 90
)
returns setof public.runs
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  update public.runs r
  set
    claim_token = p_claim_token,
    claim_expires_at = now() + make_interval(secs => greatest(10, least(p_lease_seconds, 300)))
  where r.id = p_run_id
    and r.user_id = (select auth.uid())
    and r.is_demo = false
    and r.status not in ('verified', 'unverified', 'failed', 'draft_pr_created')
    and (r.claim_expires_at is null or r.claim_expires_at < now())
  returning r.*;
end;
$$;

-- Release stage claim helper
create or replace function public.release_run_claim(
  p_run_id uuid,
  p_claim_token text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.runs r
  set
    claim_token = null,
    claim_expires_at = null
  where r.id = p_run_id
    and r.user_id = (select auth.uid())
    and r.claim_token = p_claim_token;
end;
$$;

-- Append run event with automatic monotonic seq per run
create or replace function public.append_run_event(
  p_run_id uuid,
  p_stage text,
  p_event_type text,
  p_summary text,
  p_payload jsonb default '{}'::jsonb
)
returns public.run_events
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_next_seq integer;
  v_event public.run_events;
  v_uid uuid;
begin
  v_uid := (select auth.uid());
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  -- Lock the parent run row owned by user to serialize seq allocation
  perform 1 from public.runs where id = p_run_id and user_id = v_uid for update;
  if not found then
    raise exception 'Run not found or access denied';
  end if;

  select coalesce(max(seq), 0) + 1 into v_next_seq
  from public.run_events
  where run_id = p_run_id;

  insert into public.run_events (run_id, user_id, seq, stage, event_type, summary, payload, is_demo)
  values (p_run_id, v_uid, v_next_seq, p_stage, p_event_type, left(p_summary, 1000), coalesce(p_payload, '{}'::jsonb), false)
  returning * into v_event;

  return v_event;
end;
$$;

grant usage on schema public to anon, authenticated;
grant select on public.incidents, public.runs, public.run_events, public.patches, public.test_results to anon;
grant select, insert, update, delete on public.profiles, public.incidents, public.runs, public.run_events, public.patches, public.test_results, public.approvals, public.pull_requests to authenticated;
grant execute on function public.claim_run_stage(uuid, text, integer) to authenticated;
grant execute on function public.release_run_claim(uuid, text) to authenticated;
grant execute on function public.append_run_event(uuid, text, text, text, jsonb) to authenticated;
