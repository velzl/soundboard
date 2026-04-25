# Phase 1 Status

## What is implemented

- Next.js-style project scaffold
- App Router page structure for MVP routes
- shared styling and navigation
- typed profile, stats, leaderboard, and comparison models
- scoring helpers for music activity and compatibility
- mock data that matches the product spec
- Spotify auth code exchange and profile fetch
- Supabase-backed private session and token persistence when configured
- Supabase-backed profile persistence for onboarding and settings
- Spotify top artists/tracks sync with persisted music snapshots
- public leaderboard and profile routes now read persisted data when available
- persisted follow relationships and following-page reads
- comparison now uses persisted artists and genres when both profiles have synced stats
- dashboard suggestions now use persisted compatibility matches when possible
- following page now includes a real personal leaderboard built from follow edges and persisted scores
- signed-in dashboard/profile views now stop showing seeded personal placeholders when real sync/setup is still missing
- compare and landing-page discovery now lean more heavily on real public/persisted data instead of demo stand-ins
- following and settings now use clearer sync/setup language, with no seeded comparison fallback left in the social circle view
- dashboard is now gated for anonymous visitors instead of showing a fake personal identity preview, and the core pages have a stronger UI polish baseline
- settings includes a live readiness checklist, and leaderboard/profile pages now feel more explicitly competitive without expanding scope
- in-memory fallback only when Supabase env is still missing
- local Node.js 20 workspace toolchain
- successful lint pass
- successful production build

## What is intentionally mocked

- dashboard discovery suggestions
- anonymous demo profile data
- cross-user seeded leaderboard fallback when no persisted profiles exist
- comparison for profiles that still have no synced music snapshot

## Exact next step

Build discovery suggestions from persisted stats and compatibility in this order:

1. replace seeded dashboard suggestions with persisted-user matches
2. remove more seeded profile/demo dependencies as persisted data grows
3. add richer filtering or time-window controls once the persisted user base grows
