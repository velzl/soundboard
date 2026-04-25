create table if not exists public.follows (
  follower_spotify_user_id text not null references public.profiles (spotify_user_id) on delete cascade,
  followed_spotify_user_id text not null references public.profiles (spotify_user_id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (follower_spotify_user_id, followed_spotify_user_id),
  check (follower_spotify_user_id <> followed_spotify_user_id)
);

create index if not exists follows_followed_idx
  on public.follows (followed_spotify_user_id);

alter table public.follows enable row level security;

revoke all on public.follows from anon, authenticated;
