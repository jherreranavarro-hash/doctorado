import { ROLES } from "@doctorado/shared";
import { PrismaClient } from "@prisma/client";
import { seedDoctoral } from "./seed-doctoral.js";

const ROLE_LABELS: Record<(typeof ROLES)[number], string> = {
  doctoral_student: "Estudiante de doctorado",
  doctoral_professor: "Docente de doctorado",
  doctoral_admin: "Administrador de doctorado",
};

const prisma = new PrismaClient();

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
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
