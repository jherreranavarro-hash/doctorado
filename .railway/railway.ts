import { defineRailway, github, postgres, project, service } from "railway/iac";

export default defineRailway((ctx) => {
  const Postgres = postgres("Postgres", { region: "ams" });

  // API (NestJS) — monorepo pnpm/turbo: fases de build/start definidas
  // explícitamente en nixpacks.toml (raíz del repo), porque la
  // auto-detección de Nixpacks para pnpm en este entorno falla antes de
  // llegar a cualquier buildCommand personalizado aquí. migrate deploy +
  // seed corren en cada arranque (idempotentes, ver packages/db/src/seed.ts)
  // para que la base quede siempre lista sin un paso manual aparte. Sin
  // Redis: el Dominio Doctorado no lo usa (ver docs/adr/0001).
  const api = service("api", {
    source: github("jherreranavarro-hash/doctorado", { branch: "main" }),
    build: {
      builder: "NIXPACKS",
      nixpacksConfigPath: "nixpacks.toml",
    },
    run: {
      healthcheck: "/health",
      healthcheckTimeout: 120,
    },
    networking: {
      serviceDomains: { api: { port: 4000 } },
    },
    variables: {
      NODE_ENV: "production",
      // Railway inyecta PORT automáticamente, pero se fija explícito para
      // que coincida siempre con networking.serviceDomains.api.port.
      PORT: "4000",
      DATABASE_URL: Postgres.env.DATABASE_URL,
      SESSION_SECRET: { value: ctx.randomString("session-secret", 32), isSealed: true },
      // Actualizar con el dominio real una vez creado el proyecto Vercel
      // (ver DEPLOY.md) — CORS rechaza cualquier origen no listado aquí.
      CORS_ALLOWED_ORIGINS: "https://REEMPLAZAR-con-dominio-vercel.vercel.app",
      // Bootstrap opt-in de un doctoral_admin real (ver packages/db/src/seed.ts):
      // sin esto, no hay forma de entrar a producción — ninguno de los 3
      // roles es auto-registrable y el seed omite las cuentas demo cuando
      // NODE_ENV=production. Password generado por Railway (ctx.randomString),
      // nunca en texto plano en el repo — recupérala con
      // `railway variables --service api` tras aplicar.
      ADMIN_BOOTSTRAP_EMAIL: "jherreranavarro@gmail.com",
      ADMIN_BOOTSTRAP_PASSWORD: ctx.randomString("admin-bootstrap-password", 24),
    },
  });

  return project("doctorado", {
    resources: [Postgres, api],
  });
});
