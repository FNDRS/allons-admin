# Allons Admin

Panel interno: cuentas, comercios, eventos, pagos y waitlist.

## Stack

- Next.js 16 (App Router) + React 19
- TypeScript + Tailwind CSS
- Supabase, sólo para el login del propio admin
- `allons-api` para todo lo demás: este panel no toca la base de datos
- Sentry para errores
- Lucide icons

## Getting started

```sh
pnpm install
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# ROOT_ADMIN_EMAILS, ADMIN_API_BASE_URL, ADMIN_API_SECRET, and (optional)
# NEXT_PUBLIC_WAITLIST_BASE_URL.
pnpm dev
```

## Auth model

- Login uses Supabase email/password (same accounts as the mobile app).
- The middleware in `middleware.ts` checks the session AND that the user's
  email is in `ROOT_ADMIN_EMAILS`. Everyone else is signed out and bounced
  to `/login`.
- Current root admin allowlist: `marlon.castro@allonsapp.com`.
- That session is the only thing Supabase is used for here. This panel holds
  no service-role key: every read and write goes to `allons-api` behind
  `ADMIN_API_SECRET`, and the API records who did what in `admin_audit_logs`.

## Sentry

Sin `NEXT_PUBLIC_SENTRY_DSN` no se inicializa: local y CI quedan iguales. Las
tres variables del cliente son `NEXT_PUBLIC_` porque Next las incrusta en el
bundle del navegador, así que van como `--build-arg`, no sólo en runtime.

Los source maps se suben sólo si el build recibe `SENTRY_AUTH_TOKEN`, que viaja
como secret de BuildKit y no como build arg: un build arg quedaría en el
historial de la imagen que se publica en ECR.

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

`waitlist_qr_sources` is owned by `allons-api` (migration
`20260921120000_adopt_waitlist_qr_sources`). `db/waitlist_qr_sources.sql` is
kept only as the record of how the table was first created by hand.

### QR script (admin)

You can also generate printable assets from this repo:

```sh
pnpm run qr
# or override destination URL
BASE_URL=https://allonsapp.com pnpm run qr
```
