# Deploy

Mismo patrón ya probado en producción para `aventuras-del-estudio`: **Vercel** para `apps/web`, **Railway** para
`apps/api` + Postgres. No hay Redis (el Dominio Doctorado no lo usa).

## Prerrequisitos

- Cuenta en [Vercel](https://vercel.com) y en [Railway](https://railway.app).
- `VERCEL_TOKEN` y `RAILWAY_TOKEN` disponibles para el CLI (o hacerlo desde el dashboard de cada uno).
- El repo debe estar en GitHub y accesible desde ambas plataformas (ya lo está:
  `jherreranavarro-hash/doctorado`, rama `main`).

## 1. Railway — API + Postgres

Todo está declarado como código en [`.railway/railway.ts`](.railway/railway.ts) (ver
[`.railway/README.md`](.railway/README.md) para los comandos de `railway config`).

```bash
railway login                 # o railway login --browserless con RAILWAY_TOKEN
railway link                  # crea/vincula el proyecto "doctorado"
railway config plan           # previsualiza qué va a crear (Postgres + servicio api)
railway config apply          # aplica — crea Postgres, el servicio api, variables y dominio público
```

Esto crea:

- Un Postgres gestionado por Railway (`Postgres.env.DATABASE_URL` referenciado automáticamente).
- El servicio `api`, con build/start definidos en [`nixpacks.toml`](nixpacks.toml) (raíz del repo) — instala y
  construye el monorepo pnpm/turbo completo, luego en cada arranque corre `prisma migrate deploy` + el seed
  (ambos idempotentes) antes de levantar `apps/api/dist/main.js`.
- Variables ya declaradas en `railway.ts`: `NODE_ENV`, `PORT`, `DATABASE_URL`, `SESSION_SECRET` (generado y
  sellado), `ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_PASSWORD` (crea el primer `doctoral_admin` — sin esto no hay
  forma de entrar en producción, ver `docs/adr/0001-extraccion-repo-standalone.md`).
- `CORS_ALLOWED_ORIGINS` queda con un placeholder — **hay que actualizarlo** con el dominio real de Vercel
  después del paso 2 (editar `.railway/railway.ts` y volver a `railway config apply`, o
  `railway variables --service api --set CORS_ALLOWED_ORIGINS=https://tu-dominio.vercel.app`).

Anota el dominio público que Railway asigna al servicio `api` (`railway domain` o el dashboard) — se necesita en
el paso 2.

**Redeploy manual** (igual que en `aventuras-del-estudio` — conectar auto-deploy de Railway vía GitHub App queda
pendiente):

```bash
railway up --service api --detach --json
```

**Recuperar la contraseña del admin inicial** generada por Railway:

```bash
railway variables --service api | grep ADMIN_BOOTSTRAP_PASSWORD
```

## 2. Vercel — Web

Proyecto Next.js dentro del monorepo — **Root Directory = `apps/web`** al crear el proyecto (necesario para que
Vercel construya solo esa app pero resuelva `workspace:*` subiendo el monorepo completo; ver
[`.vercelignore`](.vercelignore), que excluye caché/artefactos de build para no romper el límite de 100MB por
archivo).

```bash
vercel login                  # o usa VERCEL_TOKEN
vercel link                   # vincula/crea el proyecto — Root Directory: apps/web
vercel env add NEXT_PUBLIC_API_BASE_URL production   # pega el dominio de Railway del paso 1
vercel deploy --prod
```

Alternativa por dashboard: New Project → importar `jherreranavarro-hash/doctorado` → Root Directory `apps/web` →
Framework Next.js (auto-detectado) → agregar `NEXT_PUBLIC_API_BASE_URL` en Settings → Environment Variables →
Deploy. Una vez desplegado, Vercel autodespliega en cada push a `main` (Git-connected).

## 3. Cerrar el círculo — CORS

Con el dominio real de Vercel en mano, actualiza `CORS_ALLOWED_ORIGINS` en Railway (ver paso 1) y redeploya la
API (`railway up --service api`). Sin esto, el login funciona pero el navegador bloquea las respuestas por CORS.

## Notas

- **Cookies cross-domain**: `apps/web` y `apps/api` quedan en dominios distintos en producción — las cookies de
  sesión usan `SameSite=None; Secure` solo cuando `NODE_ENV=production` (ver `apps/api/src/auth/auth.controller.ts`).
  La protección CSRF no depende de esa cookie (synchronizer token, ver `CsrfService`), así que `SameSite=None` no
  reabre ese riesgo.
- **Sin cuentas demo en producción**: `pnpm db:seed` las omite cuando `NODE_ENV=production` — el único acceso
  inicial es `ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_PASSWORD`. Desde ahí, ese `doctoral_admin` crea
  docentes/estudiantes reales vía `apps/web/administrador`.
- Si cambia el dominio de Vercel o de Railway, hay que actualizar ambos lados (`railway.ts` +
  `NEXT_PUBLIC_API_BASE_URL` en Vercel) — no hay descubrimiento automático.
