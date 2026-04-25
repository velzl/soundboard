create table if not exists public.user_music_stats (
  spotify_user_id text primary key references public.spotify_accounts (spotify_user_id) on delete cascade,
  top_artists_json jsonb not null default '[]'::jsonb,
  top_tracks_json jsonb not null default '[]'::jsonb,
  top_genres_json jsonb not null default '[]'::jsonb,
  music_activity_score integer not null default 0,
  stats_updated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_music_stats enable row level security;

revoke all on public.user_music_stats from anon, authenticated;

drop trigger if exists set_user_music_stats_updated_at on public.user_music_stats;
create trigger set_user_music_stats_updated_at
before update on public.user_music_stats
for each row
execute function public.set_current_timestamp_updated_at();
