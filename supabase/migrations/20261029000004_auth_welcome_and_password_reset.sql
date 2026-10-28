-- RepoMedic M4 Migration: Welcome Email Tracking, SHA-256 Password Reset Tokens, and Password Rotation RPCs

create extension if not exists pgcrypto;

-- 1. Track welcome email delivery on public.profiles
alter table public.profiles
  add column if not exists welcome_email_sent_at timestamptz;

-- 2. Create public.password_reset_tokens with strict RLS (accessible only via SECURITY DEFINER RPCs)
create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  token_hash text not null check (char_length(token_hash) = 64),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_tokens_email_hash_idx
  on public.password_reset_tokens (lower(email), token_hash)
  where used_at is null;

create index if not exists password_reset_tokens_user_id_idx
  on public.password_reset_tokens (user_id, created_at desc);

alter table public.password_reset_tokens enable row level security;
alter table public.password_reset_tokens force row level security;

-- No direct SELECT/INSERT/UPDATE/DELETE policies for anon or authenticated;
-- all access is mediated by the SECURITY DEFINER RPCs below.

-- 3. RPC: Request a password reset token (stores SHA-256 hash of the recovery code)
create or replace function public.request_password_reset_token(
  p_email text,
  p_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid;
  v_user_email text;
  v_display_name text;
begin
  if p_email is null or char_length(trim(p_email)) < 3 then
    raise exception 'A valid email address is required';
  end if;

  if p_token_hash is null or char_length(trim(p_token_hash)) <> 64 then
    raise exception 'Token hash must be a 64-character SHA-256 hex digest';
  end if;

  select
    u.id,
    u.email,
    coalesce(p.display_name, u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1))
  into v_user_id, v_user_email, v_display_name
  from auth.users u
  left join public.profiles p on p.id = u.id
  where lower(u.email) = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    return jsonb_build_object(
      'found', false,
      'display_name', null
    );
  end if;

  -- Invalidate prior active reset tokens for this user
  update public.password_reset_tokens
  set used_at = now()
  where user_id = v_user_id
    and used_at is null;

  insert into public.password_reset_tokens (
    user_id,
    email,
    token_hash,
    expires_at
  )
  values (
    v_user_id,
    v_user_email,
    lower(trim(p_token_hash)),
    now() + interval '30 minutes'
  );

  return jsonb_build_object(
    'found', true,
    'user_id', v_user_id,
    'email', v_user_email,
    'display_name', v_display_name
  );
end;
$$;

grant execute on function public.request_password_reset_token(text, text) to anon, authenticated;

-- 4. RPC: Consume a password reset token and update auth.users bcrypt password
create or replace function public.consume_password_reset_token(
  p_email text,
  p_token_hash text,
  p_new_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token record;
begin
  if p_new_password is null or char_length(p_new_password) < 6 then
    raise exception 'New password must be at least 6 characters long';
  end if;

  select *
  into v_token
  from public.password_reset_tokens
  where lower(email) = lower(trim(p_email))
    and token_hash = lower(trim(p_token_hash))
    and used_at is null
    and expires_at > now()
  order by created_at desc
  limit 1
  for update;

  if v_token.id is null then
    raise exception 'Invalid or expired password reset code. Please request a new reset email.';
  end if;

  update auth.users
  set
    encrypted_password = crypt(p_new_password, gen_salt('bf', 10)),
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    updated_at = now()
  where id = v_token.user_id;

  update public.password_reset_tokens
  set used_at = now()
  where id = v_token.id;

  update public.profiles
  set updated_at = now()
  where id = v_token.user_id;

  return jsonb_build_object(
    'reset', true,
    'user_id', v_token.user_id,
    'email', v_token.email
  );
end;
$$;

grant execute on function public.consume_password_reset_token(text, text, text) to anon, authenticated;

-- 5. RPC: Authenticated user password change with optional current-password check
create or replace function public.change_own_password(
  p_new_password text,
  p_current_password text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid;
  v_user record;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Authentication required to change password';
  end if;

  if p_new_password is null or char_length(p_new_password) < 6 then
    raise exception 'New password must be at least 6 characters long';
  end if;

  select id, email, encrypted_password
  into v_user
  from auth.users
  where id = v_uid
  for update;

  if v_user.id is null then
    raise exception 'Authenticated user record not found';
  end if;

  if p_current_password is not null and char_length(p_current_password) > 0 then
    if v_user.encrypted_password is null or v_user.encrypted_password <> crypt(p_current_password, v_user.encrypted_password) then
      raise exception 'Current password is incorrect';
    end if;
  end if;

  update auth.users
  set
    encrypted_password = crypt(p_new_password, gen_salt('bf', 10)),
    updated_at = now()
  where id = v_uid;

  update public.profiles
  set updated_at = now()
  where id = v_uid;

  return jsonb_build_object(
    'updated', true,
    'user_id', v_uid,
    'email', v_user.email
  );
end;
$$;

grant execute on function public.change_own_password(text, text) to authenticated;
