# Soundboard

Soundboard is a responsive social music-tracking web app built around Spotify login, music identity, public profiles, leaderboards, and taste comparison.

## Open-source notes

- Local secrets belong in `.env.local` and should never be committed.
- Use `.env.example` as the shareable template for setup.
- If any credential was ever exposed outside your machine, rotate it before publishing.
- Spotify development-mode apps are limited to allowlisted users, so public visitors may be able to browse the app but not authenticate unless they are registered testers.

## Current milestone

This repository currently contains the first implementation scaffold:

- Next.js App Router project structure
- design system and shared layout
- MVP route skeletons
- typed domain models
- starter scoring utilities
- mock data for rapid UI iteration
- real Spotify auth code exchange
- Supabase-backed private session and token persistence when configured
- Supabase-backed profile persistence and server actions for onboarding/settings
- Spotify top artists, tracks, and derived genres can now sync into persisted music snapshots
- public leaderboard and profile pages now prefer persisted Supabase reads when data exists
- persisted follow relationships now power follow/unfollow actions and the following page
- comparison now uses persisted artist and genre overlap when both profiles have synced stats
- dashboard suggestions now prefer persisted compatibility matches and exclude users you already follow
- following page now includes a real follow-circle leaderboard built from persisted scores
- signed-in dashboard and profile flows now prefer honest empty states over seeded personal demo data
- compare now requires a real signed-in viewer context, and the landing discovery preview now prefers real public profiles
- following no longer falls back to seeded match scores, and sync/setup messaging is clearer across social surfaces
- anonymous dashboard access is now a clearly gated public preview, and the main shell has a stronger visual polish pass
- settings now shows live integration readiness, and leaderboard/profile pages have a more competition-focused presentation
- a dedicated discover page, notification inbox, live username normalization preview, and stronger open-source-safe UI messaging
- stricter browser security defaults and cleaner user-facing error handling
- server-side in-memory fallback only when Supabase is not configured yet
- successful `npm run lint`
- successful `npm run build`

## Planned stack

- Next.js
- Supabase
- Spotify Web API
- Vercel

## Local setup target

According to the current Next.js installation docs, App Router projects require Node.js 20.9 or newer and can be created with `create-next-app@latest`.

This workspace now includes a local Node 20 toolchain under `.tools/` so the app can be installed and verified without relying on a system-wide Node install.

The next steps are:

1. Create the Supabase project and fill in `.env.local`. For local Spotify auth, use `127.0.0.1` instead of `localhost` in the redirect URI.
2. Run the SQL in:
   - `supabase/migrations/20260414_create_private_auth_tables.sql`
   - `supabase/migrations/20260414_create_profiles_table.sql`
   - `supabase/migrations/20260414_create_user_music_stats_table.sql`
   - `supabase/migrations/20260414_create_follows_table.sql`
   - `supabase/migrations/20260414_create_music_sync_history_table.sql`
   - `supabase/migrations/20260414_create_notifications_table.sql`
3. Add richer social discovery and leaderboard filtering on top of persisted follows.
4. Replace more seeded profile/demo dependencies as the persisted user base grows.

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values when Spotify and Supabase are ready.

## Supabase setup for the current auth pass

The current auth layer expects:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`

When those values are present, Spotify sessions and tokens are stored in Supabase using the private tables defined in:

- `supabase/migrations/20260414_create_private_auth_tables.sql`
- `supabase/migrations/20260414_create_profiles_table.sql`
- `supabase/migrations/20260414_create_user_music_stats_table.sql`
- `supabase/migrations/20260414_create_follows_table.sql`
- `supabase/migrations/20260414_create_music_sync_history_table.sql`
- `supabase/migrations/20260414_create_notifications_table.sql`

If Supabase is not configured yet, the app falls back to an in-memory session store so local development can still work, but that fallback should be treated as temporary only.
