create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_spotify_user_id text not null,
  actor_spotify_user_id text not null,
  actor_display_name text not null,
  type text not null check (type in ('follow')),
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_spotify_user_id, created_at desc);

create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_spotify_user_id, read_at);

alter table public.notifications enable row level security;

revoke all on public.notifications from anon;
revoke all on public.notifications from authenticated;
