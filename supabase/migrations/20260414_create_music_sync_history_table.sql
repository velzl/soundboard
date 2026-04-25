create table if not exists public.music_sync_history (
  id uuid primary key default gen_random_uuid(),
  spotify_user_id text not null,
  music_activity_score integer not null,
  top_artist_name text,
  top_track_name text,
  top_genres_json jsonb not null default '[]'::jsonb,
  synced_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists music_sync_history_spotify_user_id_idx
  on public.music_sync_history (spotify_user_id, synced_at desc);

alter table public.music_sync_history enable row level security;

revoke all on public.music_sync_history from anon, authenticated;
