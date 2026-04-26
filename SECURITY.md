# Security

## Reporting a vulnerability

If you find a security issue in this project, please do not post working exploit details in a public issue first.

Instead:

1. Open a private report if the platform supports it.
2. Or contact the maintainer directly before public disclosure.

## Secrets and local development

- Keep real credentials in `.env.local`.
- Never commit `.env.local` or provider secrets to the repository.
- Use `.env.example` as the template for local setup.
- If any credential may have been exposed, rotate it before sharing the project publicly.

## Current security posture

This project currently includes:

- server-side Spotify token handling
- separation between public profile data and private auth data
- username normalization and duplicate protection
- reserved-handle blocking
- sanitized bios with strict length limits
- browser security headers through Next.js configuration
- safer user-facing error messages that avoid exposing raw backend details
- system-generated social activity and follow notifications instead of open public posting
- a social design that avoids direct messaging, public comments, and arbitrary user-to-user HTML content in MVP
- bounded pin-to-circle state so personal watchlists stay small and easier to reason about

## Social feature privacy note

The app intentionally keeps its social features narrow for security reasons.

- The public activity feed is derived from controlled system events like follows, Spotify syncs, and completed onboarding.
- Notification content is system-generated and does not render raw user-authored rich text.
- User-generated text is currently limited to short bios, which are normalized and constrained before storage.
- MVP social surfaces intentionally avoid comments, DMs, embeds, link-rich posting, and custom profile markup.

This keeps the product feeling social without taking on a much larger spam, phishing, moderation, and XSS surface area too early.

## Scope note

This is an MVP social music application. Security is being treated seriously, but it should still be reviewed further before any large-scale public deployment.
