import { ROLES } from "@doctorado/shared";
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { seedDoctoral, DOCTORADOS_ORGANIZATION_SLUG } from "./seed-doctoral.js";

const ROLE_LABELS: Record<(typeof ROLES)[number], string> = {
  doctoral_student: "Estudiante de doctorado",
  doctoral_professor: "Docente de doctorado",
  doctoral_admin: "Administrador de doctorado",
};

const prisma = new PrismaClient();

/**
 * Ninguno de los 3 roles es auto-registrable (ver ADR 0001 de este repo) y
 * las cuentas demo se omiten en producción (ver seed-doctoral.ts) — sin
 * esto, un despliegue nuevo queda sin ningún doctoral_admin capaz de crear
 * al resto. Opt-in vía ADMIN_BOOTSTRAP_EMAIL/ADMIN_BOOTSTRAP_PASSWORD: si
 * faltan, se omite (no es obligatorio, ej. cuando el admin ya se creó a
 * mano contra el propio endpoint de login/gestión).
 */
async function seedAdminBootstrap(): Promise<void> {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!email || !password) {
    console.log(
      "[db:seed] ADMIN_BOOTSTRAP_EMAIL/ADMIN_BOOTSTRAP_PASSWORD no configurados — se omite el admin inicial.",
    );
    return;
  }

  const organization = await prisma.organization.findUniqueOrThrow({
    where: { slug: DOCTORADOS_ORGANIZATION_SLUG },
  });
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { key: "doctoral_admin" },
  });

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, status: "active" },
  });
  const existingRole = await prisma.userRole.findFirst({
    where: { userId: user.id, roleId: adminRole.id, organizationId: organization.id },
  });
  if (!existingRole) {
    await prisma.userRole.create({
      data: { userId: user.id, roleId: adminRole.id, organizationId: organization.id },
    });
  }
  console.log(`[db:seed] Admin inicial listo (${email}).`);
}

/**
 * Siembra idempotente: roles fijos del sistema (RBAC) + la malla curricular
 * real del Doctorado en Psicología (24 módulos, transcrita del PDF del
 * encargo original) con contenido conceptual/ejercicios/examen/encuesta
 * redactados en profundidad para 2 módulos representativos del primer
 * semestre, más el Doctorado en Psicología, Salud y Calidad de Vida como
 * estructura provisoria (su malla oficial no llegó con el encargo). Ver
 * seed-doctoral.ts.
 */
async function main(): Promise<void> {
  for (const key of ROLES) {
    await prisma.role.upsert({
      where: { key },
      update: { label: ROLE_LABELS[key] },
      create: { key, label: ROLE_LABELS[key] },
    });
  }
  console.log(`[db:seed] ${ROLES.length} roles sembrados/actualizados.`);

  await seedDoctoral(prisma);
  await seedAdminBootstrap();
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
