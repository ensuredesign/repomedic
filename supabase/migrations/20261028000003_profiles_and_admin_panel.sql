-- RepoMedic M3/M4 Migration: Extended User Profiles, RBAC Admin Policies, and Admin Governance RPCs

-- 1. Extend public.profiles with rich profile management and role columns
alter table public.profiles
  add column if not exists email text,
  add column if not exists role text not null default 'developer' check (role in ('developer', 'admin')),
  add column if not exists organization text not null default 'RepoMedic Engineering',
  add column if not exists job_title text not null default 'Software Engineer',
  add column if not exists github_username text,
  add column if not exists notification_email text,
  add column if not exists bio text,
  add column if not exists updated_at timestamptz not null default now();

-- Backfill email from auth.users for existing profiles
update public.profiles p
set
  email = u.email,
  notification_email = coalesce(p.notification_email, u.email),
  role = case when u.email = 'admin@repomedic.dev' then 'admin' else p.role end
from auth.users u
where p.id = u.id and (p.email is null or p.notification_email is null);

-- Ensure every auth.users row has a corresponding profile row
insert into public.profiles (id, email, display_name, role, organization, job_title, notification_email)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1)),
  case when u.email = 'admin@repomedic.dev' then 'admin' else 'developer' end,
  coalesce(u.raw_user_meta_data ->> 'organization', 'RepoMedic Engineering'),
  coalesce(u.raw_user_meta_data ->> 'job_title', 'Software Engineer'),
  u.email
from auth.users u
on conflict (id) do update
set
  email = excluded.email,
  role = case when excluded.email = 'admin@repomedic.dev' then 'admin' else public.profiles.role end;

-- 2. Update handle_new_user trigger function to populate profile metadata on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name,
    role,
    organization,
    job_title,
    github_username,
    notification_email,
    bio
  )
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    case when lower(new.email) = 'admin@repomedic.dev' then 'admin' else 'developer' end,
    coalesce(nullif(new.raw_user_meta_data ->> 'organization', ''), 'RepoMedic Engineering'),
    coalesce(nullif(new.raw_user_meta_data ->> 'job_title', ''), 'Software Engineer'),
    nullif(new.raw_user_meta_data ->> 'github_username', ''),
    new.email,
    nullif(new.raw_user_meta_data ->> 'bio', '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    role = case when lower(excluded.email) = 'admin@repomedic.dev' then 'admin' else public.profiles.role end,
    updated_at = now();
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 3. Security definer helper to check whether current authenticated user is an admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- 4. Trigger to prevent non-admin users from self-escalating role column
create or replace function public.guard_profile_role_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    if not public.is_admin() and (select auth.uid()) is not null then
      raise exception 'Only administrators may modify user roles';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_role_update on public.profiles;
create trigger trg_guard_profile_role_update
  before update on public.profiles
  for each row execute function public.guard_profile_role_update();

-- 5. Admin RLS read/manage policies (preserving strict owner isolation for non-admin developers)
drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select to authenticated
  using (public.is_admin());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists incidents_select_admin on public.incidents;
create policy incidents_select_admin on public.incidents
  for select to authenticated
  using (public.is_admin());

drop policy if exists runs_select_admin on public.runs;
create policy runs_select_admin on public.runs
  for select to authenticated
  using (public.is_admin());

drop policy if exists run_events_select_admin on public.run_events;
create policy run_events_select_admin on public.run_events
  for select to authenticated
  using (public.is_admin());

drop policy if exists patches_select_admin on public.patches;
create policy patches_select_admin on public.patches
  for select to authenticated
  using (public.is_admin());

drop policy if exists test_results_select_admin on public.test_results;
create policy test_results_select_admin on public.test_results
  for select to authenticated
  using (public.is_admin());

drop policy if exists approvals_select_admin on public.approvals;
create policy approvals_select_admin on public.approvals
  for select to authenticated
  using (public.is_admin());

drop policy if exists pull_requests_select_admin on public.pull_requests;
create policy pull_requests_select_admin on public.pull_requests
  for select to authenticated
  using (public.is_admin());

-- 6. Admin RPC to update a user's role safely
create or replace function public.admin_set_user_role(
  p_target_user_id uuid,
  p_new_role text
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Forbidden: admin role required';
  end if;

  if p_new_role not in ('developer', 'admin') then
    raise exception 'Invalid role: must be developer or admin';
  end if;

  update public.profiles
  set
    role = p_new_role,
    updated_at = now()
  where id = p_target_user_id
  returning * into v_updated;

  if v_updated.id is null then
    raise exception 'Target user profile not found';
  end if;

  return v_updated;
end;
$$;

grant execute on function public.admin_set_user_role(uuid, text) to authenticated;
