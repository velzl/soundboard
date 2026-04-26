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
- a new activity route now surfaces system-generated public and follow-circle activity
- the activity route now supports safer public-vs-circle filtering without introducing open posting
- the activity route now supports event-type filtering for follows, syncs, and new profiles
- notifications now support follow-back flows and mutual-follow signals
- profile and following views now expose mutual-follow state instead of feeling one-directional only
- discover results now show social-proof labels and system-generated profile badges
- dashboard suggestions now blend taste overlap with circle-graph signals instead of using taste alone
- followed profiles can now be pinned into a bounded personal shortlist
- compare pages now include a history view based on saved sync snapshots
- mobile layout hierarchy is stronger across the header, actions, and compare flow
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

- anonymous demo profile data
- cross-user seeded leaderboard fallback when no persisted profiles exist
- comparison for profiles that still have no synced music snapshot
- follow activity in memory-only fallback mode before Supabase is configured

## Exact next step

Keep pushing the social layer without opening moderation-heavy surfaces:

1. add richer activity filtering or follow-circle segmentation
2. consider lightweight profile badges or pinned identity markers
3. keep avoiding comments, DMs, and arbitrary posting until moderation/security goals are better funded
