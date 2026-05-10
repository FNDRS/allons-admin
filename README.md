# Allons Admin

Internal control panel for the Allons platform. Used by the root team to
monitor activity, manage providers and users, and review finance metrics.

## Stack

- Next.js 15 (App Router) + React 19
- TypeScript + Tailwind CSS
- Supabase (auth + admin) — same project as `allons-mobile`
- Lucide icons

## Getting started

```sh
pnpm install
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, ROOT_ADMIN_EMAILS, and (optional)
# NEXT_PUBLIC_WAITLIST_BASE_URL.
pnpm dev
```

## Auth model

- Login uses Supabase email/password (same accounts as the mobile app).
- The middleware in `middleware.ts` checks the session AND that the user's
  email is in `ROOT_ADMIN_EMAILS`. Everyone else is signed out and bounced
  to `/login`.
- Current root admin allowlist: `marlon.castro@allonsapp.com`.
- The service-role key is only ever read in server components / route
  handlers via `lib/supabase/server.ts`. It must never be exposed to the
  browser bundle.

## Deploy (Vercel)

1. Connect the repo to Vercel.
2. Set the env vars from `.env.example`.
3. Production runs on `vercel deploy --prod`.

## Pages

- `/` — Overview KPIs (users, providers, events, GMV, tickets, scans).
- `/providers` — Provider list with approve/pause/suspend.
- `/users` — Client list with suspend/reactivate.
- `/events` — All events with status + provider filters.
- `/finance` — GMV, fees, payouts.
- `/waitlist-qr` — Create QR sources and track waitlist signups by source.

## Waitlist QR setup

Run the SQL in `db/waitlist_qr_sources.sql` on the same Supabase project used
by the waitlist app. This creates the metadata table the admin panel uses to
store slugs like `diunsa`, `la20`, etc.

### QR script (admin)

You can also generate printable assets from this repo:

```sh
pnpm run qr
# or override destination URL
BASE_URL=https://allonsapp.com pnpm run qr
```
