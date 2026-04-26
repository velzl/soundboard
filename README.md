# Soundboard

> Turn Spotify listening into a social identity.

Soundboard is a social music identity app built around Spotify. It turns listening habits into public profiles, compatibility scores, follow relationships, activity feeds, notifications, and competitive leaderboards.

Instead of treating music data like a private analytics dashboard, Soundboard treats it like something social: a way to compare taste, discover people with similar listening habits, and build a profile that actually feels alive.

## What it does

- Spotify sign-in with server-side token handling
- public music profiles with usernames, bios, and synced listening snapshots
- leaderboard scoring based on listening-profile breadth and activity
- profile comparison using artist and genre overlap
- follow system and following-only leaderboard
- in-app notifications for new follows
- system-generated public and circle activity feeds
- mutual-follow social cues and follow-back flows
- lightweight profile badges and pinned identity markers
- graph-aware follow suggestions that combine taste overlap with circle signals
- search and discover flow for public profiles
- weekly recap logic based on synced listening history

## Why this exists

Most music stat tools are interesting for a minute and then forgotten.

Soundboard is designed around a different loop:

1. connect Spotify
2. build a music identity
3. compare with other listeners
4. follow people with interesting taste
5. come back for rank changes, recap, and social activity

## Current status

This repository contains a working MVP-oriented build with:

- Next.js App Router
- Supabase-backed persistence for auth-linked app data
- Spotify OAuth and top-item sync
- public profile, leaderboard, activity, compare, discover, and notifications flows
- stronger username sanitization and reserved-handle protection
- browser security headers, safer user-facing error handling, and intentionally narrow social surfaces

The app is functional, but still clearly in MVP territory.

## Stack

- Next.js
- TypeScript
- Supabase
- Spotify Web API

## Local setup

### 1. Install dependencies

This workspace already includes a local Node 20 toolchain under `.tools/`, but standard local Node 20+ works too.

If needed:

```powershell
cd path\to\soundboard
$nodeDir = (Resolve-Path '.\.tools\node-v20.19.6-win-x64').Path
$env:PATH = "$nodeDir;$env:PATH"
& '.\.tools\node-v20.19.6-win-x64\npm.cmd' install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI`

For local Spotify auth, use `127.0.0.1` instead of `localhost` in the redirect URI.

### 3. Run the Supabase migrations

Apply the SQL from:

- `supabase/migrations/20260414_create_private_auth_tables.sql`
- `supabase/migrations/20260414_create_profiles_table.sql`
- `supabase/migrations/20260414_create_user_music_stats_table.sql`
- `supabase/migrations/20260414_create_follows_table.sql`
- `supabase/migrations/20260414_create_music_sync_history_table.sql`
- `supabase/migrations/20260414_create_notifications_table.sql`

### 4. Start the app

```powershell
cd path\to\soundboard
$nodeDir = (Resolve-Path '.\.tools\node-v20.19.6-win-x64').Path
$env:PATH = "$nodeDir;$env:PATH"
& '.\.tools\node-v20.19.6-win-x64\npm.cmd' run dev
```

Then open:

- [http://127.0.0.1:3000](http://127.0.0.1:3000)

## Open-source and security notes

- real secrets belong in `.env.local`
- `.env.local` is intentionally ignored and should never be committed
- use `.env.example` as the shareable setup template
- if any credential was ever exposed outside your machine, rotate it before reuse

See [`SECURITY.md`](./SECURITY.md) for the security disclosure note.

## Spotify limitation

Spotify development-mode apps are limited to allowlisted users. That means public visitors may be able to browse parts of the app, but authentication and synced-data flows are restricted unless the account has been added in the Spotify Developer Dashboard.

## GitHub presentation

For a polished public repo presentation, use the guidance in:

- [`docs/github-showcase.md`](./docs/github-showcase.md)
- [`screenshots/README.md`](./screenshots/README.md)

That file includes:

- a chosen repo tagline
- a suggested GitHub repo description
- suggested repo topics
- a first screenshot plan tied to real app routes
- demo GIF / video shot list

## Verification

Current local verification passes:

- `npm run lint`
- `npm run build`
