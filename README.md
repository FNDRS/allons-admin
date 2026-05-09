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
# SUPABASE_SERVICE_ROLE_KEY, and ROOT_ADMIN_EMAILS.
pnpm dev
```

## Auth model

- Login uses Supabase email/password (same accounts as the mobile app).
- The middleware in `middleware.ts` checks the session AND that the user's
  email is in `ROOT_ADMIN_EMAILS`. Everyone else is signed out and bounced
  to `/login`.
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
