import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../common/types.js';

/**
 * Helpers compartidos del Dominio Doctorado — mismo criterio de aislamiento
 * que el resto de la app (ver practice.helpers.ts/resolve-admin-role.ts):
 * (1) resolver el propio perfil/grant desde el userId de sesión, nunca desde
 * un parámetro del cliente; (2) derivar organizationId de ese grant; (3)
 * verificar que cualquier recurso referenciado (cohorte, módulo, alumno)
 * pertenezca a esa organización/relación antes de leer o escribir.
 */

export async function resolveDoctoralStudentProfile(
  prisma: PrismaService,
  userId: string,
): Promise<{ id: string; organizationId: string; displayName: string }> {
  const profile = await prisma.doctoralStudentProfile.findUnique({
    where: { userId },
  });
  if (!profile) {
    throw new ForbiddenException(
      'Esta cuenta no tiene un perfil de estudiante de doctorado',
    );
  }
  return profile;
}

export async function resolveDoctoralProfessorProfile(
  prisma: PrismaService,
  userId: string,
): Promise<{ id: string; organizationId: string; displayName: string }> {
  const profile = await prisma.doctoralProfessorProfile.findUnique({
    where: { userId },
  });
  if (!profile) {
    throw new ForbiddenException(
      'Esta cuenta no tiene un perfil de docente de doctorado',
    );
  }
  return profile;
}

/** La organización a usar viene siempre del grant de rol de la sesión,
 * nunca de un parámetro del cliente (mismo criterio que resolveAdminRole
 * del lado K-12). */
export function resolveDoctoralAdminOrganizationId(
  user: AuthenticatedUser,
): string {
  const adminRole = user.roles.find((r) => r.roleKey === 'doctoral_admin');
  if (!adminRole) {
    throw new ForbiddenException(
      'No tienes un rol de administración de doctorado asignado',
    );
  }
  return adminRole.organizationId;
}

/** Verifica que el docente esté efectivamente asignado a la cohorte antes
 * de dejarlo leer/escribir cualquier dato de esa cohorte. */
export async function assertProfessorOwnsCohort(
  prisma: PrismaService,
  doctoralProfessorProfileId: string,
  cohortId: string,
): Promise<void> {
  const link = await prisma.doctoralCohortProfessor.findUnique({
    where: {
      cohortId_doctoralProfessorProfileId: {
        cohortId,
        doctoralProfessorProfileId,
      },
    },
  });
  if (!link) {
    throw new ForbiddenException('No tienes acceso a esta cohorte');
  }
}

/** Cadena de verificación de dos saltos: el docente debe estar asignado a
 * ALGUNA cohorte que a su vez incluya a este alumno — nunca se confía en un
 * studentProfileId de cliente sin este chequeo. Devuelve el id de esa
 * cohorte por si el caller la necesita. */
export async function assertProfessorOwnsCohortStudent(
  prisma: PrismaService,
  doctoralProfessorProfileId: string,
  doctoralStudentProfileId: string,
): Promise<{ cohortId: string }> {
  const link = await prisma.doctoralCohortStudent.findFirst({
    where: {
      doctoralStudentProfileId,
      cohort: {
        professors: { some: { doctoralProfessorProfileId } },
      },
    },
    select: { cohortId: true },
  });
  if (!link) {
    throw new ForbiddenException('No tienes acceso a este estudiante');
  }
  return link;
}

/** Gate de acceso a contenido de un módulo: exige una vinculación explícita
 * alumno-módulo (DoctoralModuleEnrollment), tal como la crea el
 * administrador o el flujo de inscripción — nunca acceso implícito por solo
 * pertenecer a la cohorte del programa. */
export async function assertStudentEnrolledInModule(
  prisma: PrismaService,
  doctoralStudentProfileId: string,
  moduleId: string,
) {
  const enrollment = await prisma.doctoralModuleEnrollment.findUnique({
    where: {
      doctoralStudentProfileId_moduleId: {
        doctoralStudentProfileId,
        moduleId,
      },
    },
    include: { module: true },
  });
  if (!enrollment) {
    throw new ForbiddenException('No estás inscrito en este módulo todavía');
  }
  if (!enrollment.module.hasRealContent) {
    throw new NotFoundException(
      'El contenido de este módulo todavía no está disponible',
    );
  }
  return enrollment;
}
