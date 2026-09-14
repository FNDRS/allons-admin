# Allons Admin

Panel interno: cuentas, comercios, eventos, pagos y waitlist.

## Stack

- Next.js 15 (App Router) + React 19
- TypeScript + Tailwind CSS
- Supabase (auth + admin), el mismo proyecto que `allons-mobile`
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

- `/` Resumen: cuentas, eventos, GMV, tickets.
- `/providers` Comercios: aprobar, pausar, suspender.
- `/users` Clientes: suspender o reactivar.
- `/events` Eventos, con filtro de estado y comercio.
- `/finance` GMV, comisión y retiros.
- `/waitlist-qr` QR de waitlist y registros por fuente.

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
