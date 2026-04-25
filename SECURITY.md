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
- browser security headers through Next.js configuration
- safer user-facing error messages that avoid exposing raw backend details

## Scope note

This is an MVP social music application. Security is being treated seriously, but it should still be reviewed further before any large-scale public deployment.
