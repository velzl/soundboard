# GitHub Showcase Guide

## Chosen tagline

Turn Spotify listening into a social identity.

## GitHub About box

Use this as the primary GitHub repository description:

Soundboard is a Spotify-powered social music identity app with public profiles, compatibility matching, follow notifications, and competitive leaderboards.

## Short backup description

If you want a tighter fallback:

Soundboard is a Spotify-powered social music app for public profiles, listener matching, and competitive leaderboards.

## Suggested topics

Use these as GitHub topics:

- nextjs
- typescript
- spotify
- supabase
- music
- social-app
- leaderboard
- oauth
- app-router
- open-source

## First screenshot plan

Capture these in this order so the repo page tells a clear story.

### 1. Landing page hero

- Route: `/`
- Goal: establish product identity quickly
- Capture: hero headline, CTA row, public preview section
- Suggested filename: `landing-hero.png`

### 2. Dashboard

- Route: `/dashboard`
- Goal: show the personal music-identity home view
- Capture: recap card, score/rank cards, suggestion area
- Suggested filename: `dashboard-overview.png`

### 3. Leaderboard

- Route: `/leaderboard`
- Goal: show the competitive angle immediately
- Capture: top rows, rank visuals, action buttons
- Suggested filename: `leaderboard.png`

### 4. Discover search

- Route: `/discover?q=<handle-fragment>`
- Goal: show search and social discovery
- Capture: search box plus real search results
- Suggested filename: `discover-search.png`

### 5. Public profile

- Route: `/u/<username>`
- Goal: show identity and personality
- Capture: profile hero, identity card, top artists/tracks, stat cards
- Suggested filename: `profile-page.png`

### 6. Compare view

- Route: `/compare/<username>`
- Goal: show what makes the app feel personal
- Capture: match score, shared artists, summary language
- Suggested filename: `compare-view.png`

### 7. Notifications

- Route: `/notifications`
- Goal: show the social loop is real
- Capture: unread follow alerts and the bell state if possible
- Suggested filename: `notifications.png`

## Screenshot checklist

If you want the repo page to feel polished fast, add 4-6 screenshots to the top of the README or in repo media assets.

Recommended minimum set:

1. Landing page
2. Dashboard
3. Public profile page
4. Compare page
5. Notifications inbox

## Screenshot tips

- use consistent browser width
- crop out personal email addresses if visible
- use real synced music data if it looks interesting
- keep the header and the main hero/content visible
- prefer 16:9 or wide landscape images for README display

## Demo GIF or short video plan

If you want one strong visual asset, a 20-45 second demo is enough.

Recommended flow:

1. open landing page
2. open leaderboard
3. search a listener on discover
4. open a public profile
5. compare two listeners
6. show follow plus notification result
7. end on dashboard or profile identity view

## Suggested README media order

1. Title plus one-sentence pitch
2. Hero screenshot or short GIF
3. What it does
4. Why it exists
5. Setup instructions

## Suggested alt text

- "Soundboard landing page"
- "Soundboard dashboard with synced Spotify stats"
- "Soundboard music profile page"
- "Soundboard listener comparison view"
- "Soundboard notifications inbox"

## Manual GitHub UI steps

### About box

Paste the primary description into the repo About section.

### Topics

Add the topic list from this document in the repo About settings.

### Social preview / screenshots

Once you capture images, either:

- add them to a `screenshots/` folder in the repo and reference them from the README
- or upload a social preview image in GitHub repo settings

## Optional future polish

If you want the repo page to look even stronger later:

- add a short animated GIF under the title
- add a feature grid with icons
- add a small architecture diagram
- add a dedicated `screenshots/` folder for repo media
