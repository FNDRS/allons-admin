# Registro de auditoría del panel (`admin_audit_logs`)

## Qué problema resuelve

Permite responder, ante Finanzas o cumplimiento, **quién** hizo **qué cambio sensible**, sobre **qué recurso**, **cuándo** y con **éxito o error**, de forma **inmutable** (sin edición posterior de líneas históricas desde la aplicación).

## Quién escribe las filas

**`allons-api`**, dentro del mismo endpoint que hace el cambio.

Antes las escribía este panel con `logAdminAudit` y el `service_role`: eran dos
llamadas independientes, así que cualquier pantalla que se olvidara de la
segunda cambiaba producción sin dejar rastro, y el «estado anterior» era el que
supusiera quien llamaba, no el que tenía la base. Ahora la mutación no se puede
alcanzar sin pasar por un endpoint que la registra.

El panel manda quién está detrás de la llamada en tres headers, que
`readAdminActor` lee en la API:

| Header | Qué lleva |
| --- | --- |
| `x-admin-actor-id` | `sub` de la sesión root; se rechaza si no es un uuid |
| `x-admin-actor-email` | correo del root admin |
| `x-admin-source` | `server_action` o `route_handler` |

El secreto compartido (`x-admin-secret`) sólo prueba que la petición es el
panel; sin estos headers la fila no nombraría a nadie.

### La excepción

`POST /admin/audit` existe para lo único que ocurre entero acá y no deja huella
en la API: la exportación de datos de un comercio
(`app/(dashboard)/providers/[userId]/export/route.ts`, vía `recordAdminAudit`
en `lib/admin/auditApi.ts`). Su lista de acciones permitidas tiene una sola
entrada a propósito: un panel que pudiera publicar cualquier acción también
podría publicar un cambio de estado que nunca hizo.

## Migración contra la base de datos

La tabla se define en **`allons-api`** como parte del esquema Prisma oficial
(fuente única para el Postgres que comparten mobile, API y admin):

```bash
cd allons-api
pnpm exec prisma migrate deploy
```

*(En desarrollo local: `pnpm exec prisma migrate dev`.)*

Verificá en Supabase **Table Editor** que exista **`admin_audit_logs`**.
`GET /admin/platform-status` también lo reporta como `adminAuditLogsReady`.

### Por qué RLS sin políticas

Igual que `waitlist_qr_sources`: nadie debe leer ni escribir esta tabla desde el
navegador. La única ruta de escritura es `allons-api` con su propia conexión, y
este panel ya no tiene llave de `service_role`.

## Convenciones de `action`

Mantener nombres estables tipo `area.palabra_clave`. El catálogo vive en
`AdminAuditAction`, en `src/features/admin/admin-audit.service.ts` de
`allons-api`:

| Action | Cuándo |
|--------|--------|
| `auth.user_suspend` / `auth.user_unsuspend` | Suspende o reactiva acceso desde `/users`. |
| `provider.status_change` | Cambia estado de comercio en `/providers`. |
| `provider.plan_change` | Cambia el plan de suscripción. |
| `provider.commission_fees_change` | Cambia las comisiones por ticket. |
| `provider.subscription_cancel` | Corte inmediato de la suscripción. |
| `provider.comercio_create` | Alta de comercio desde `/providers/create`. |
| `provider.invite_resend` | Reenvío de la invitación. |
| `provider.data_export` | Exportación de datos del comercio. |
| `event.create` | Alta de evento desde `/events/create`. |
| `event.status_patch` | Cambia estado del evento. |
| `event.kit_pickup_patch` | Edita el punto de retiro de kit desde `/events/[id]`. |
| `waitlist_qr.source_upsert` | Crea o edita una fuente QR de waitlist. |
| `waitlist_qr.source_delete` | Elimina una fuente QR. |

Una acción nueva se agrega **en `allons-api`**: al tipo `AdminAuditAction` y al
endpoint que la ejecuta, envolviendo la operación en `AdminAuditService.run`
para que quede registrada tanto si sale bien como si falla. Renombrar una
existente deja sin etiqueta a todas las filas históricas, así que no se
renombran.

## Estado JSON (`state_before` / `state_after`)

Sondeo superficial de los valores relevantes. `AdminAuditService.run` toma el
«antes» de lo que la operación efectivamente encontró, no de lo que supuso quien
llamó. **No** sustituye el respaldo oficial de registros financieros o
contratos, y se evita exponer datos personales más allá de lo necesario: el
retiro de kit, por ejemplo, registra si quedó puesto o vacío, nunca la dirección
que dice.

`ip_address` sale del primer valor de `x-forwarded-for`, que un cliente puede
poner. Sirve para leer el rastro, no como control: nada autoriza por IP.

## Retención

Definido por **Legal / Finanzas** (duración típica 1-7 años para trazabilidad
organizacional). Esta tabla puede crecer: planificar purga o archivado bajo
proceso documentado.
