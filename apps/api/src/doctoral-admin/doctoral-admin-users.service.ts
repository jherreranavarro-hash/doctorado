import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';
import type { CreateDoctoralStudentDto } from './dto/create-doctoral-student.dto.js';
import type { UpdateDoctoralStudentDto } from './dto/update-doctoral-student.dto.js';
import type { CreateDoctoralProfessorDto } from './dto/create-doctoral-professor.dto.js';
import type { AssignProfessorToCohortDto } from './dto/assign-professor-to-cohort.dto.js';

/**
 * Mantenedor de alumnos/docentes del Dominio Doctorado ("mantenedor de
 * personas" pedido por el encargo) — mismo patrón que AdminUsersService del
 * lado K-12: crea User + perfil + UserRole en una transacción, reutiliza
 * AuthService.hashPassword para la contraseña inicial, y re-verifica contra
 * organizationId cualquier id que llegue del cliente antes de leer o mutar.
 */
@Injectable()
export class DoctoralAdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  private async audit(
    actorUserId: string,
    action: string,
    entityType: string,
    entityId: string,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: { actorUserId, action, entityType, entityId },
    });
  }

  /** Confirma que la cohorte pertenece a la organización del admin (vía su programa). */
  private async resolveOrgScopedCohort(
    organizationId: string,
    cohortId: string,
  ) {
    const cohort = await this.prisma.doctoralCohort.findFirst({
      where: { id: cohortId, deletedAt: null, program: { organizationId } },
    });
    if (!cohort) {
      throw new NotFoundException(
        'Esta cohorte no pertenece a tu organización',
      );
    }
    return cohort;
  }

  /** Confirma que el perfil de estudiante pertenece a la organización del admin. */
  private async resolveOrgScopedStudent(
    organizationId: string,
    studentProfileId: string,
  ) {
    const profile = await this.prisma.doctoralStudentProfile.findFirst({
      where: { id: studentProfileId, organizationId, deletedAt: null },
      include: { user: { select: { id: true, email: true, status: true } } },
    });
    if (!profile) {
      throw new NotFoundException(
        'Este estudiante no pertenece a tu organización',
      );
    }
    return profile;
  }

  /** Confirma que el perfil de docente pertenece a la organización del admin. */
  private async resolveOrgScopedProfessor(
    organizationId: string,
    professorProfileId: string,
  ) {
    const profile = await this.prisma.doctoralProfessorProfile.findFirst({
      where: { id: professorProfileId, organizationId, deletedAt: null },
    });
    if (!profile) {
      throw new NotFoundException(
        'Este docente no pertenece a tu organización',
      );
    }
    return profile;
  }

  // --- Estudiantes ---

  async createStudent(
    organizationId: string,
    actorUserId: string,
    dto: CreateDoctoralStudentDto,
  ) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese correo');
    }

    const role = await this.prisma.role.findUnique({
      where: { key: 'doctoral_student' },
    });
    if (!role) {
      throw new ConflictException('Rol no disponible');
    }

    // Si se indica cohortId, se verifica ANTES de crear nada — evita crear
    // la cuenta y fallar recién al inscribir.
    const cohort = dto.cohortId
      ? await this.resolveOrgScopedCohort(organizationId, dto.cohortId)
      : null;

    const passwordHash = await this.auth.hashPassword(dto.password);

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash, status: 'active' },
      });
      const profile = await tx.doctoralStudentProfile.create({
        data: {
          userId: user.id,
          organizationId,
          displayName: dto.displayName,
        },
      });
      if (cohort) {
        await tx.doctoralCohortStudent.create({
          data: {
            cohortId: cohort.id,
            doctoralStudentProfileId: profile.id,
          },
        });
      }
      await tx.userRole.create({
        data: { userId: user.id, roleId: role.id, organizationId },
      });
      await tx.auditLog.create({
        data: {
          actorUserId,
          action: 'doctoral_admin.student.create',
          entityType: 'doctoral_student_profile',
          entityId: profile.id,
        },
      });
      return { user, profile };
    });

    return { studentProfileId: created.profile.id, userId: created.user.id };
  }

  async listStudents(
    organizationId: string,
    filters: { query?: string; cohortId?: string },
  ) {
    const query = filters.query?.trim();
    const rows = await this.prisma.doctoralStudentProfile.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(filters.cohortId
          ? { cohortMemberships: { some: { cohortId: filters.cohortId } } }
          : {}),
        ...(query
          ? {
              OR: [
                { displayName: { contains: query, mode: 'insensitive' } },
                {
                  user: { email: { contains: query, mode: 'insensitive' } },
                },
              ],
            }
          : {}),
      },
      include: {
        user: { select: { id: true, email: true, status: true } },
        cohortMemberships: {
          include: {
            cohort: { select: { id: true, name: true, programId: true } },
          },
        },
        moduleEnrollments: {
          include: { module: { select: { id: true, title: true } } },
        },
      },
      orderBy: { displayName: 'asc' },
    });

    return rows.map((r) => ({
      studentProfileId: r.id,
      userId: r.user.id,
      email: r.user.email,
      displayName: r.displayName,
      status: r.user.status,
      cohorts: r.cohortMemberships.map((cm) => ({
        cohortId: cm.cohort.id,
        name: cm.cohort.name,
        programId: cm.cohort.programId,
      })),
      moduleEnrollments: r.moduleEnrollments.map((me) => ({
        moduleId: me.module.id,
        title: me.module.title,
        status: me.status,
      })),
    }));
  }

  async updateStudent(
    organizationId: string,
    actorUserId: string,
    studentProfileId: string,
    dto: UpdateDoctoralStudentDto,
  ) {
    await this.resolveOrgScopedStudent(organizationId, studentProfileId);
    const profile = await this.prisma.doctoralStudentProfile.update({
      where: { id: studentProfileId },
      data: { displayName: dto.displayName },
    });
    await this.audit(
      actorUserId,
      'doctoral_admin.student.update',
      'doctoral_student_profile',
      studentProfileId,
    );
    return profile;
  }

  async setStudentSuspended(
    organizationId: string,
    actorUserId: string,
    studentProfileId: string,
    suspended: boolean,
  ) {
    const profile = await this.resolveOrgScopedStudent(
      organizationId,
      studentProfileId,
    );
    await this.prisma.user.update({
      where: { id: profile.user.id },
      data: { status: suspended ? 'suspended' : 'active' },
    });
    await this.audit(
      actorUserId,
      suspended
        ? 'doctoral_admin.student.suspend'
        : 'doctoral_admin.student.reactivate',
      'doctoral_student_profile',
      studentProfileId,
    );
    return {
      studentProfileId,
      status: suspended ? 'suspended' : 'active',
    };
  }

  async softDeleteStudent(
    organizationId: string,
    actorUserId: string,
    studentProfileId: string,
  ) {
    await this.resolveOrgScopedStudent(organizationId, studentProfileId);
    // Nunca se toca User aquí — solo el perfil de doctorado, tal como pide
    // el encargo (una misma cuenta puede tener otros roles en otra
    // organización, ver comentario en el schema).
    await this.prisma.doctoralStudentProfile.update({
      where: { id: studentProfileId },
      data: { deletedAt: new Date() },
    });
    await this.audit(
      actorUserId,
      'doctoral_admin.student.delete',
      'doctoral_student_profile',
      studentProfileId,
    );
    return { studentProfileId };
  }

  async enrollStudentInCohort(
    organizationId: string,
    actorUserId: string,
    studentProfileId: string,
    cohortId: string,
  ) {
    await this.resolveOrgScopedStudent(organizationId, studentProfileId);
    await this.resolveOrgScopedCohort(organizationId, cohortId);

    const existing = await this.prisma.doctoralCohortStudent.findUnique({
      where: {
        cohortId_doctoralStudentProfileId: {
          cohortId,
          doctoralStudentProfileId: studentProfileId,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        'Este estudiante ya está inscrito en esta cohorte',
      );
    }

    const link = await this.prisma.doctoralCohortStudent.create({
      data: { cohortId, doctoralStudentProfileId: studentProfileId },
    });
    await this.audit(
      actorUserId,
      'doctoral_admin.cohort_student.enroll',
      'doctoral_cohort_student',
      link.id,
    );
    return link;
  }

  async removeStudentFromCohort(
    organizationId: string,
    actorUserId: string,
    studentProfileId: string,
    cohortId: string,
  ) {
    await this.resolveOrgScopedStudent(organizationId, studentProfileId);
    await this.resolveOrgScopedCohort(organizationId, cohortId);

    const link = await this.prisma.doctoralCohortStudent.findUnique({
      where: {
        cohortId_doctoralStudentProfileId: {
          cohortId,
          doctoralStudentProfileId: studentProfileId,
        },
      },
    });
    if (!link) {
      throw new NotFoundException(
        'Este estudiante no está inscrito en esta cohorte',
      );
    }
    await this.prisma.doctoralCohortStudent.delete({
      where: { id: link.id },
    });
    await this.audit(
      actorUserId,
      'doctoral_admin.cohort_student.remove',
      'doctoral_cohort_student',
      link.id,
    );
    return { studentProfileId, cohortId };
  }

  /**
   * "Vincular módulo con alumno" pedido explícitamente por el encargo — solo
   * se permite si el alumno ya tiene una cohorte en el MISMO programa del
   * módulo (nunca un acceso directo a un programa donde no fue inscrito por
   * cohorte).
   */
  async enrollStudentInModule(
    organizationId: string,
    actorUserId: string,
    studentProfileId: string,
    moduleId: string,
  ) {
    await this.resolveOrgScopedStudent(organizationId, studentProfileId);

    const module_ = await this.prisma.programModule.findFirst({
      where: { id: moduleId, deletedAt: null, program: { organizationId } },
    });
    if (!module_) {
      throw new NotFoundException('Este módulo no pertenece a tu organización');
    }

    const hasCohortInProgram =
      await this.prisma.doctoralCohortStudent.findFirst({
        where: {
          doctoralStudentProfileId: studentProfileId,
          cohort: { programId: module_.programId },
        },
      });
    if (!hasCohortInProgram) {
      throw new ForbiddenException(
        'El estudiante no tiene una cohorte en el programa de este módulo',
      );
    }

    const existing = await this.prisma.doctoralModuleEnrollment.findUnique({
      where: {
        doctoralStudentProfileId_moduleId: {
          doctoralStudentProfileId: studentProfileId,
          moduleId,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        'Este estudiante ya está inscrito en este módulo',
      );
    }

    const enrollment = await this.prisma.doctoralModuleEnrollment.create({
      data: {
        doctoralStudentProfileId: studentProfileId,
        moduleId,
        status: 'in_progress',
      },
    });
    await this.audit(
      actorUserId,
      'doctoral_admin.module_enrollment.create',
      'doctoral_module_enrollment',
      enrollment.id,
    );
    return enrollment;
  }

  async removeModuleEnrollment(
    organizationId: string,
    actorUserId: string,
    studentProfileId: string,
    moduleId: string,
  ) {
    await this.resolveOrgScopedStudent(organizationId, studentProfileId);
    const module_ = await this.prisma.programModule.findFirst({
      where: { id: moduleId, program: { organizationId } },
    });
    if (!module_) {
      throw new NotFoundException('Este módulo no pertenece a tu organización');
    }

    const enrollment = await this.prisma.doctoralModuleEnrollment.findUnique({
      where: {
        doctoralStudentProfileId_moduleId: {
          doctoralStudentProfileId: studentProfileId,
          moduleId,
        },
      },
    });
    if (!enrollment) {
      throw new NotFoundException(
        'Este estudiante no está inscrito en este módulo',
      );
    }
    await this.prisma.doctoralModuleEnrollment.delete({
      where: { id: enrollment.id },
    });
    await this.audit(
      actorUserId,
      'doctoral_admin.module_enrollment.remove',
      'doctoral_module_enrollment',
      enrollment.id,
    );
    return { studentProfileId, moduleId };
  }

  // --- Docentes ---

  async createProfessor(
    organizationId: string,
    actorUserId: string,
    dto: CreateDoctoralProfessorDto,
  ) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese correo');
    }

    const role = await this.prisma.role.findUnique({
      where: { key: 'doctoral_professor' },
    });
    if (!role) {
      throw new ConflictException('Rol no disponible');
    }

    const passwordHash = await this.auth.hashPassword(dto.password);

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash, status: 'active' },
      });
      const profile = await tx.doctoralProfessorProfile.create({
        data: {
          userId: user.id,
          organizationId,
          displayName: dto.displayName,
          title: dto.title,
        },
      });
      await tx.userRole.create({
        data: { userId: user.id, roleId: role.id, organizationId },
      });
      await tx.auditLog.create({
        data: {
          actorUserId,
          action: 'doctoral_admin.professor.create',
          entityType: 'doctoral_professor_profile',
          entityId: profile.id,
        },
      });
      return { user, profile };
    });

    return {
      professorProfileId: created.profile.id,
      userId: created.user.id,
    };
  }

  async assignProfessorToCohort(
    organizationId: string,
    actorUserId: string,
    cohortId: string,
    dto: AssignProfessorToCohortDto,
  ) {
    await this.resolveOrgScopedCohort(organizationId, cohortId);

    let professor: { id: string } | null = null;
    if (dto.doctoralProfessorProfileId) {
      professor = await this.resolveOrgScopedProfessor(
        organizationId,
        dto.doctoralProfessorProfileId,
      );
    } else if (dto.email) {
      const email = dto.email.toLowerCase().trim();
      professor = await this.prisma.doctoralProfessorProfile.findFirst({
        where: { organizationId, deletedAt: null, user: { email } },
      });
      if (!professor) {
        throw new NotFoundException(
          'No se encontró un docente con ese correo en tu organización',
        );
      }
    } else {
      throw new BadRequestException(
        'Debes indicar el docente por id de perfil o por correo',
      );
    }

    const existing = await this.prisma.doctoralCohortProfessor.findUnique({
      where: {
        cohortId_doctoralProfessorProfileId: {
          cohortId,
          doctoralProfessorProfileId: professor.id,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        'Este docente ya está asignado a esta cohorte',
      );
    }

    const link = await this.prisma.doctoralCohortProfessor.create({
      data: { cohortId, doctoralProfessorProfileId: professor.id },
    });
    await this.audit(
      actorUserId,
      'doctoral_admin.cohort_professor.assign',
      'doctoral_cohort_professor',
      link.id,
    );
    return link;
  }
}
