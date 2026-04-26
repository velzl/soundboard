create table if not exists public.pinned_profiles (
  pinner_spotify_user_id text not null references public.profiles (spotify_user_id) on delete cascade,
  pinned_spotify_user_id text not null references public.profiles (spotify_user_id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (pinner_spotify_user_id, pinned_spotify_user_id),
  check (pinner_spotify_user_id <> pinned_spotify_user_id)
);

create index if not exists pinned_profiles_pinner_created_idx
  on public.pinned_profiles (pinner_spotify_user_id, created_at desc);

alter table public.pinned_profiles enable row level security;

revoke all on public.pinned_profiles from anon;
revoke all on public.pinned_profiles from authenticated;
