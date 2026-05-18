# Registro de auditoría del panel (`admin_audit_logs`)

## Qué problema resuelve

Permite responder, ante Finanzas o cumplimiento, **quién** hizo **qué cambio sensible**, sobre **qué recurso**, **cuándo** y con **éxito o error**, de forma **inmutable** (sin edición posterior de líneas históricas desde la aplicación).

## Alta en Supabase

1. Abrí **SQL Editor** en el proyecto usado por allons-admin / waitlist.  
2. Pegá el contenido completo de `db/admin_audit_log.sql` y ejecutalo **una vez**.  
3. Verificá que la tabla `admin_audit_logs` exista (`Table Editor` o `\dt`).

### Por qué RLS sin políticas

Igual que `waitlist_qr_sources`: el cliente público anon no debe leer/escribir. El servidor Next.js valida usuarios root y luego usa `service_role` para insertar (bypass RLS). Esto minimiza superficie expuesta desde el navegador.

## Convenciones de `action`

Mantener nombres estables tipo `area.palabra_clave`:

| Action | Cuándo |
|--------|--------|
| `auth.user_suspend` / `auth.user_unsuspend` | Suspende o reactiva acceso desde `/users`. |
| `provider.status_change` | Cambia estado de comerciante en `/providers`. |
| `event.status_patch` | Cambia estado del evento vía API administrativa. |
| `waitlist_qr.source_upsert` | Crea/edita QR waitlist desde API routes. |
| `waitlist_qr.source_delete` | Elimina fuente QR. |

Los nuevos puntos del panel deben **añadir** filas usando `logAdminAudit` y extendiendo el tipo `AdminAuditAction` en `lib/admin/auditLog.ts`.

## Estado JSON (`state_before` / `state_after`)

Sondeo superficial de valores relevantes cuando es barato obtenerlos (ej. estado previo/proximo). **No** sustituye el respaldo oficial de registros financieros o contratos. Evitar exponer datos personales más allá del necesario (principio de minimización GDPR).

## Retención

Definido por **Legal / Finanzas** (duración típica 1–7 años para trazabilidad organizacional). Esta tabla puede crecer: planificar purga/export archivado bajo proceso documentado fuera del SQL.
