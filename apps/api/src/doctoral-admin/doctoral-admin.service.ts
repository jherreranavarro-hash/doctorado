import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateDoctoralProgramDto } from './dto/create-doctoral-program.dto.js';
import type { UpdateDoctoralProgramDto } from './dto/update-doctoral-program.dto.js';
import type { CreateProgramModuleDto } from './dto/create-program-module.dto.js';
import type { UpdateProgramModuleDto } from './dto/update-program-module.dto.js';
import type { CreateDoctoralCohortDto } from './dto/create-doctoral-cohort.dto.js';

const PRISMA_UNIQUE_VIOLATION = 'P2002';

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    err.code === PRISMA_UNIQUE_VIOLATION
  );
}

/**
 * Mantenedor de programas/módulos/cohortes del Dominio Doctorado — mismo
 * criterio de aislamiento por organización que CurriculumAdminService /
 * AdminUsersService: todo lo que el cliente referencia por id se re-verifica
 * contra el organizationId resuelto de la sesión (nunca de un parámetro),
 * antes de leer o mutar. Ver doctoral-common.helpers.ts.
 */
@Injectable()
export class DoctoralAdminService {
  constructor(private readonly prisma: PrismaService) {}

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

  /** Confirma que el programa pertenece a la organización del admin. */
  private async resolveOrgScopedProgram(
    organizationId: string,
    programId: string,
  ) {
    const program = await this.prisma.doctoralProgram.findFirst({
      where: { id: programId, organizationId, deletedAt: null },
    });
    if (!program) {
      throw new NotFoundException(
        'Este programa no pertenece a tu organización',
      );
    }
    return program;
  }

  /** Confirma que el módulo pertenece a este programa (y este a la organización). */
  private async resolveOrgScopedModule(
    organizationId: string,
    programId: string,
    moduleId: string,
  ) {
    await this.resolveOrgScopedProgram(organizationId, programId);
    const module_ = await this.prisma.programModule.findFirst({
      where: { id: moduleId, programId, deletedAt: null },
    });
    if (!module_) {
      throw new NotFoundException('Este módulo no pertenece a este programa');
    }
    return module_;
  }

  // --- Programas ---

  listPrograms(organizationId: string) {
    return this.prisma.doctoralProgram.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async createProgram(
    organizationId: string,
    actorUserId: string,
    dto: CreateDoctoralProgramDto,
  ) {
    try {
      const program = await this.prisma.doctoralProgram.create({
        data: {
          organizationId,
          key: dto.key,
          name: dto.name,
          institution: dto.institution,
          ...(dto.totalSemesters !== undefined
            ? { totalSemesters: dto.totalSemesters }
            : {}),
        },
      });
      await this.audit(
        actorUserId,
        'doctoral_admin.program.create',
        'doctoral_program',
        program.id,
      );
      return program;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('Ya existe un programa con esa clave');
      }
      throw err;
    }
  }

  async updateProgram(
    organizationId: string,
    actorUserId: string,
    programId: string,
    dto: UpdateDoctoralProgramDto,
  ) {
    await this.resolveOrgScopedProgram(organizationId, programId);
    const program = await this.prisma.doctoralProgram.update({
      where: { id: programId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.institution !== undefined
          ? { institution: dto.institution }
          : {}),
        ...(dto.totalSemesters !== undefined
          ? { totalSemesters: dto.totalSemesters }
          : {}),
      },
    });
    await this.audit(
      actorUserId,
      'doctoral_admin.program.update',
      'doctoral_program',
      programId,
    );
    return program;
  }

  // --- Módulos ---

  async listModules(organizationId: string, programId: string) {
    await this.resolveOrgScopedProgram(organizationId, programId);
    return this.prisma.programModule.findMany({
      where: { programId, deletedAt: null },
      orderBy: { order: 'asc' },
    });
  }

  async createModule(
    organizationId: string,
    actorUserId: string,
    programId: string,
    dto: CreateProgramModuleDto,
  ) {
    await this.resolveOrgScopedProgram(organizationId, programId);
    try {
      const module_ = await this.prisma.programModule.create({
        data: {
          programId,
          code: dto.code,
          title: dto.title,
          semester: dto.semester,
          credits: dto.credits,
          type: dto.type,
          order: dto.order,
        },
      });
      await this.audit(
        actorUserId,
        'doctoral_admin.module.create',
        'program_module',
        module_.id,
      );
      return module_;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          'Ya existe un módulo con ese orden en este programa',
        );
      }
      throw err;
    }
  }

  async updateModule(
    organizationId: string,
    actorUserId: string,
    programId: string,
    moduleId: string,
    dto: UpdateProgramModuleDto,
  ) {
    await this.resolveOrgScopedModule(organizationId, programId, moduleId);
    try {
      const module_ = await this.prisma.programModule.update({
        where: { id: moduleId },
        data: {
          ...(dto.code !== undefined ? { code: dto.code } : {}),
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.semester !== undefined ? { semester: dto.semester } : {}),
          ...(dto.credits !== undefined ? { credits: dto.credits } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.order !== undefined ? { order: dto.order } : {}),
        },
      });
      await this.audit(
        actorUserId,
        'doctoral_admin.module.update',
        'program_module',
        moduleId,
      );
      return module_;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          'Ya existe un módulo con ese orden en este programa',
        );
      }
      throw err;
    }
  }

  async softDeleteModule(
    organizationId: string,
    actorUserId: string,
    programId: string,
    moduleId: string,
  ) {
    await this.resolveOrgScopedModule(organizationId, programId, moduleId);
    await this.prisma.programModule.update({
      where: { id: moduleId },
      data: { deletedAt: new Date() },
    });
    await this.audit(
      actorUserId,
      'doctoral_admin.module.delete',
      'program_module',
      moduleId,
    );
    return { id: moduleId };
  }

  // --- Cohortes ---

  async listCohorts(organizationId: string, programId: string) {
    await this.resolveOrgScopedProgram(organizationId, programId);
    return this.prisma.doctoralCohort.findMany({
      where: { programId, deletedAt: null },
      orderBy: { startYear: 'desc' },
    });
  }

  async createCohort(
    organizationId: string,
    actorUserId: string,
    programId: string,
    dto: CreateDoctoralCohortDto,
  ) {
    await this.resolveOrgScopedProgram(organizationId, programId);
    const cohort = await this.prisma.doctoralCohort.create({
      data: { programId, name: dto.name, startYear: dto.startYear },
    });
    await this.audit(
      actorUserId,
      'doctoral_admin.cohort.create',
      'doctoral_cohort',
      cohort.id,
    );
    return cohort;
  }

  // --- Overview ---

  /**
   * Conteos agregados por programa únicamente — nunca filas individuales de
   * alumnos (misma "protección mínima de re-identificación" que
   * AdminService.getOverview del lado K-12). Autocontenido: no depende de
   * CompetencyRollupService ni de ningún módulo de analítica.
   */
  async getOverview(organizationId: string) {
    const programs = await this.prisma.doctoralProgram.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true, key: true, name: true },
      orderBy: { name: 'asc' },
    });
    const programIds = programs.map((p) => p.id);
    if (programIds.length === 0) {
      return { programCount: 0, programs: [] };
    }

    const [moduleCounts, cohorts] = await Promise.all([
      this.prisma.programModule.groupBy({
        by: ['programId'],
        where: { programId: { in: programIds }, deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.doctoralCohort.findMany({
        where: { programId: { in: programIds }, deletedAt: null },
        select: { id: true, programId: true },
      }),
    ]);

    const cohortIds = cohorts.map((c) => c.id);
    const programIdByCohortId = new Map(
      cohorts.map((c) => [c.id, c.programId]),
    );

    const [cohortStudents, cohortProfessors] = await Promise.all([
      this.prisma.doctoralCohortStudent.findMany({
        where: { cohortId: { in: cohortIds } },
        select: { cohortId: true, doctoralStudentProfileId: true },
      }),
      this.prisma.doctoralCohortProfessor.findMany({
        where: { cohortId: { in: cohortIds } },
        select: { cohortId: true, doctoralProfessorProfileId: true },
      }),
    ]);

    const moduleCountByProgram = new Map(
      moduleCounts.map((m) => [m.programId, m._count._all]),
    );

    const cohortCountByProgram = new Map<string, number>();
    for (const c of cohorts) {
      cohortCountByProgram.set(
        c.programId,
        (cohortCountByProgram.get(c.programId) ?? 0) + 1,
      );
    }

    // Un alumno/docente puede estar en varias cohortes del mismo programa —
    // se cuenta por persona distinta, no por vínculo cohorte-persona.
    const studentSetByProgram = new Map<string, Set<string>>();
    for (const cs of cohortStudents) {
      const programId = programIdByCohortId.get(cs.cohortId);
      if (!programId) continue;
      const set = studentSetByProgram.get(programId) ?? new Set<string>();
      set.add(cs.doctoralStudentProfileId);
      studentSetByProgram.set(programId, set);
    }

    const professorSetByProgram = new Map<string, Set<string>>();
    for (const cp of cohortProfessors) {
      const programId = programIdByCohortId.get(cp.cohortId);
      if (!programId) continue;
      const set = professorSetByProgram.get(programId) ?? new Set<string>();
      set.add(cp.doctoralProfessorProfileId);
      professorSetByProgram.set(programId, set);
    }

    return {
      programCount: programs.length,
      programs: programs.map((p) => ({
        programId: p.id,
        key: p.key,
        name: p.name,
        moduleCount: moduleCountByProgram.get(p.id) ?? 0,
        cohortCount: cohortCountByProgram.get(p.id) ?? 0,
        studentCount: studentSetByProgram.get(p.id)?.size ?? 0,
        professorCount: professorSetByProgram.get(p.id)?.size ?? 0,
      })),
    };
  }
}
