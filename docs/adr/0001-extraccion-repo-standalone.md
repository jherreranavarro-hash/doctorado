# ADR 0001 — Extracción a repositorio standalone

## Estado

Aceptado.

## Contexto

El Dominio Doctorado (plataforma de estudio para programas de doctorado, 3 roles —
`doctoral_student`/`doctoral_professor`/`doctoral_admin`) se construyó originalmente dentro del monorepo
`aventuras-del-estudio`, reutilizando su `packages/db`/Postgres, RBAC, sesión/CSRF y convenciones de `apps/api`
(ver ADR 0013 de ese repositorio). El usuario pidió después separar **solo** el dominio Doctorado en un
repositorio propio e independiente, con su propia base de datos — no un espejo/copia de solo lectura, sino una
extracción real: decidir qué pasa con la infraestructura compartida (auth, RBAC, sesión) que en el monorepo vive
en `apps/api` junto a un producto K-12 mucho más grande.

## Decisión

### Infraestructura compartida: duplicar el mínimo necesario, no todo `apps/api`

Se **duplica** (no se referencia por paquete ni submódulo) el subconjunto de `apps/api` que el Dominio Doctorado
genuinamente usa: Prisma (`prisma.module.ts`/`prisma.service.ts`), sesión+CSRF+tokens
(`common/services/{session,csrf,token,request-meta}`), guards (`session-auth`/`roles`/`csrf`), decoradores
(`current-user`/`public`/`roles`/`skip-csrf`), y `auth/` completo (login/logout/refresh/password-reset/me). Un
paquete compartido o submódulo habría acoplado el ciclo de vida de este repo al del monorepo (mismo problema que
se pidió resolver) por una base de código pequeña (~15 archivos) que ya no cambia con frecuencia — duplicar es
más simple y dejar cada repo evolucionar su propia infraestructura de sesión sin coordinación entre equipos/repos.

### Recortado explícitamente al portar (no es infraestructura del Dominio Doctorado)

- **Auto-registro** (`AuthService.register`/`AuthController@register`, `RegisterDto`): ningún rol de este dominio
  es auto-registrable — los provisiona siempre un `doctoral_admin` (ver `doctoral-admin`). `register()` además
  dependía de `unlockCoursesUpTo`, que referencia `Course`/`CourseUnlock` (modelos K-12 no portados).
- **Dispositivos de confianza** (`TrustedDevice`, `registerTrustedDevice`/`verifyPin`, `TrustedDeviceDto`): UX
  pensada para estudiantes K-12 compartiendo un dispositivo familiar; no aplica a un portal de posgrado.
- **`Permission`/`RolePermission`**: existían en el schema del monorepo sin ningún uso real — la app autoriza por
  `role.key` directamente vía `RolesGuard`, nunca por permiso fino. Confirmado sin referencias antes de excluirlos.
- **Gamificación** (`PointsService`, `IncentiveConfig`, `IncentivesService`): exclusiva del producto K-12
  (puntos/insignias/rachas). El Dominio Doctorado nunca las importa (verificado por búsqueda antes de excluirlas
  del `CommonModule` portado).
- **`schoolId` en `UserRole`**: el modelo `School` (K-12) no se porta; el Dominio Doctorado nunca pobló ese campo.
  Se simplificó el `@@unique` de `UserRole` de `[userId, roleId, organizationId, schoolId]` a
  `[userId, roleId, organizationId]`.

### Se conserva sin cambios (sí es infraestructura genuina de auth/seguridad)

`AuditLog`/`SecurityEvent` — descartados en un primer borrador como "tablas de gobernanza K-12", pero
`AuthService.login`/`refresh` (rama de reuso de refresh token)/`resetPassword` escriben en ambas: son
infraestructura de seguridad de sesión, no específica del producto K-12, así que se re-incorporaron al schema.

### Prefijo `doctoral_` en los roles, aunque ya no hay convivencia con K-12

`packages/shared/src/roles.ts` conserva `doctoral_student`/`doctoral_professor`/`doctoral_admin` (no se
renombraron a `student`/`professor`/`admin`) — evita renombres en schema/controllers/seed/frontend por un cambio
puramente cosmético, y no genera ambigüedad real dentro de este proyecto (no hay ningún otro dominio con el que
confundirse).

### Base de datos propia, no compartida

El repo trae su propio `docker-compose.yml` (Postgres 16, sin Redis — el Dominio Doctorado nunca lo usa, verificado
por búsqueda) y su propia migración inicial, generada contra una base de datos dedicada (`doctorado`, no
`aventuras_del_estudio`). El seed (`packages/db/src/seed-doctoral.ts`, malla curricular real de Psicología PUCV) se
copió sin cambios de contenido — solo se adaptó `grantRoleIfMissing` a la firma de `UserRole` sin `schoolId`.

## Consecuencias

- El repositorio es completamente autocontenido: `pnpm install && pnpm db:migrate && pnpm db:seed && pnpm dev`
  levanta todo sin depender del monorepo `aventuras-del-estudio` en ningún punto.
- Verificado de punta a punta igual de riguroso que la versión monorepo: `typecheck`/`lint`/`build` limpios en los
  4 paquetes, 11 pruebas de integración contra Postgres real (aislamiento por cohorte/organización, corrección de
  ejercicios 100% server-side, examen sin fuga de respuestas, anti-doble-envío de encuesta), servidor API real
  arrancado con los ~55 endpoints mapeados, y los 3 portales verificados en un navegador real (Chromium) con login
  contra las 3 cuentas demo y datos reales renderizados (incluido el mapa de calor, que respeta la invariante
  "sin datos ≠ cero").
- Cualquier fix futuro a la infraestructura de sesión/auth compartida (ej. un bug en `SessionService.rotate`) debe
  aplicarse por separado en ambos repositorios si corresponde — es el costo aceptado de la duplicación decidida
  arriba.
- El segundo doctorado (Psicología, Salud y Calidad de Vida) sigue como estructura provisoria (8 módulos
  genéricos) — su malla curricular oficial nunca llegó durante el encargo original y esa limitación se hereda
  sin cambios.
