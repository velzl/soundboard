create extension if not exists pgcrypto;

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.spotify_accounts (
  spotify_user_id text primary key,
  display_name text not null,
  email text,
  avatar_url text,
  access_token text not null,
  refresh_token text,
  scope text[] not null default '{}',
  access_token_expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  spotify_user_id text not null references public.spotify_accounts (spotify_user_id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists app_sessions_spotify_user_id_idx
  on public.app_sessions (spotify_user_id);

create index if not exists app_sessions_expires_at_idx
  on public.app_sessions (expires_at);

alter table public.spotify_accounts enable row level security;
alter table public.app_sessions enable row level security;

revoke all on public.spotify_accounts from anon, authenticated;
revoke all on public.app_sessions from anon, authenticated;

drop trigger if exists set_spotify_accounts_updated_at on public.spotify_accounts;
create trigger set_spotify_accounts_updated_at
before update on public.spotify_accounts
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_app_sessions_updated_at on public.app_sessions;
create trigger set_app_sessions_updated_at
before update on public.app_sessions
for each row
execute function public.set_current_timestamp_updated_at();
