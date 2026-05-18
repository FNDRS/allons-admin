# SQL suelto (`allons-admin/db`)

Este directorio sólo incluye **`waitlist_qr_sources.sql`** (setup histórico de waitlist QR).

Las tablas que comparte el mismo proyecto Postgres con la app (**p. ej. `admin_audit_logs`**) deben vivir como **migraciones Prisma** en **`../allons-api/prisma/`** (`migrate deploy`), no como SQL pegado aquí salvo urgencia operativa.
