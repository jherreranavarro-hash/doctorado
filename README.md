# Doctorado

Plataforma de estudio para programas de doctorado (Doctorado en Psicología PUCV; Doctorado en Psicología, Salud y
Calidad de Vida), con 3 roles propios: **estudiante**, **docente** y **administrador**. Extraída como repositorio
standalone del monorepo `aventuras-del-estudio` — ver
[`docs/adr/0001-extraccion-repo-standalone.md`](docs/adr/0001-extraccion-repo-standalone.md) para el porqué de cada
decisión de la extracción.

## Qué hace

- **Estudiante**: módulos con contenido conceptual, ejercicios progresivos (simple → muy complejo) con pistas e
  intentos ilimitados, un examen final "sin ayuda" por módulo (nota en escala 10–70), seguimiento de su propio
  progreso, y una encuesta de cierre por módulo.
- **Docente**: revisa el progreso de sus estudiantes, un mapa de calor de competencias calculado con un motor
  semántico heurístico a partir de ejercicios/exámenes calificados (mide "sin que el alumno se entere"; una
  competencia sin evidencia nunca se muestra como débil, se muestra sin datos), KPIs por cohorte, e inscribe
  estudiantes. Envía tareas (individuales, grupales o a toda la cohorte) con plantilla descargable y calificación.
- **Administrador**: mantenedor completo de programas, módulos, cohortes, estudiantes y docentes; vincula módulos a
  estudiantes.

## Stack

- **Backend**: NestJS + Prisma + PostgreSQL. Sesión por cookie HttpOnly (`sid`/`rt`, rotación de refresh token con
  detección de reuso), Argon2id para contraseñas, CSRF por synchronizer token (no doble-submit — API y frontend en
  dominios distintos en producción).
- **Frontend**: Next.js 16 (App Router), Tailwind v4 (CSS-first).
- **Monorepo**: pnpm workspaces + Turborepo.

## Estructura

```
apps/
  api/    # NestJS — auth + común (sesión/CSRF/RBAC) + doctoral-{admin,learning,analytics,assignments,common}
  web/    # Next.js — portales estudiante / docente / administrador
packages/
  db/     # schema.prisma, migraciones, seed (malla real de Psicología PUCV)
  shared/ # tipos compartidos entre apps/api y apps/web (roles, enums del dominio)
docs/adr/ # decisiones de arquitectura
infra/    # docker-compose (Postgres)
```

## Desarrollo local

Requisitos: Node ≥22, pnpm 11, Docker (o un Postgres 16 local).

```bash
cp .env.example .env        # ajustar si hace falta
docker compose -f infra/docker-compose.yml up -d
pnpm install
pnpm db:migrate              # aplica la migración inicial
pnpm db:seed                 # siembra roles + malla curricular + 3 cuentas demo
pnpm dev                     # API en :4000, web en :3000
```

Sin Docker: apunta `DATABASE_URL` en `.env` a cualquier Postgres 16 al que tengas acceso y sáltate el paso de
`docker compose`.

### Cuentas demo (creadas por `pnpm db:seed`)

| Rol           | Email                                          | Password                          |
| ------------- | ----------------------------------------------- | ---------------------------------- |
| Administrador | `admin-doctorados@demo.doctorado.local`         | `demo-doctorado-solo-desarrollo`   |
| Docente       | `docente-doctorados@demo.doctorado.local`       | `demo-doctorado-solo-desarrollo`   |
| Estudiante    | `estudiante-doctorados@demo.doctorado.local`    | `demo-doctorado-solo-desarrollo`   |

Nunca usar estas credenciales ni `SESSION_SECRET`/`ARGON2_*` por defecto en producción — `.env.example` lo marca
explícitamente.

## Scripts

| Comando                  | Qué hace                                              |
| ------------------------- | ------------------------------------------------------ |
| `pnpm dev`                 | Levanta API + web en modo desarrollo (Turborepo)        |
| `pnpm build`                | Build de producción de todos los paquetes/apps          |
| `pnpm typecheck` / `lint`  | Typecheck / lint en todos los paquetes/apps              |
| `pnpm test:integration`    | Pruebas de integración de `apps/api` contra Postgres real |
| `pnpm db:migrate`          | Aplica migraciones Prisma (dev)                         |
| `pnpm db:seed`             | Siembra roles, malla curricular y cuentas demo           |

## Estado del contenido curricular

La malla completa del Doctorado en Psicología PUCV (24 módulos, con código/créditos/semestre reales) está
sembrada, pero solo 2 módulos del primer semestre tienen contenido conceptual + ejercicios + examen + encuesta
redactados en profundidad — el resto trae la estructura de la malla sin contenido pedagógico aún.
`ProgramModule.hasRealContent` distingue explícitamente ambos casos; nunca se simula contenido como listo cuando
no lo está. El Doctorado en Psicología, Salud y Calidad de Vida se siembra como una estructura provisoria de 8
módulos genéricos — su malla curricular oficial nunca llegó y sigue pendiente.
