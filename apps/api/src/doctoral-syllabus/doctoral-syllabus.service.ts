import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DoctoralFilesService } from '../doctoral-common/doctoral-files.service.js';
import type { AuthenticatedUser } from '../common/types.js';
import type { UploadSyllabusDto } from './dto/upload-syllabus.dto.js';

interface ModuleWithProgram {
  id: string;
  title: string;
  order: number;
  semester: number;
  programId: string;
  syllabusFileId: string | null;
  syllabusFile: { fileName: string; sizeBytes: number } | null;
  program: { organizationId: string };
}

/**
 * Acceso al syllabus (subida por admin/docente, descarga por
 * admin/docente/alumno) — tres roles distintos comparten estos endpoints,
 * así que la resolución de "a qué le puede acceder este usuario" se hace
 * aquí en base a AuthenticatedUser.roles en vez de depender de un solo
 * organizationId de RolesGuard (como sí hace cada dominio de un solo rol).
 */
@Injectable()
export class DoctoralSyllabusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: DoctoralFilesService,
  ) {}

  private async loadModule(moduleId: string): Promise<ModuleWithProgram> {
    const module_ = await this.prisma.programModule.findFirst({
      where: { id: moduleId, deletedAt: null },
      select: {
        id: true,
        title: true,
        order: true,
        semester: true,
        programId: true,
        syllabusFileId: true,
        syllabusFile: { select: { fileName: true, sizeBytes: true } },
        program: { select: { organizationId: true } },
      },
    });
    if (!module_) {
      throw new NotFoundException('Este módulo no existe');
    }
    return module_;
  }

  /** true si el usuario puede LEER el syllabus (los 3 roles del dominio, cada uno con su propio chequeo de pertenencia). */
  private async canAccess(
    user: AuthenticatedUser,
    module_: ModuleWithProgram,
  ): Promise<boolean> {
    const adminGrant = user.roles.find(
      (r) =>
        r.roleKey === 'doctoral_admin' &&
        r.organizationId === module_.program.organizationId,
    );
    if (adminGrant) return true;

    if (user.roles.some((r) => r.roleKey === 'doctoral_professor')) {
      const professor = await this.prisma.doctoralProfessorProfile.findUnique({
        where: { userId: user.id },
      });
      if (professor) {
        const hasCohort = await this.prisma.doctoralCohortProfessor.findFirst({
          where: {
            doctoralProfessorProfileId: professor.id,
            cohort: { programId: module_.programId },
          },
        });
        if (hasCohort) return true;
      }
    }

    if (user.roles.some((r) => r.roleKey === 'doctoral_student')) {
      const student = await this.prisma.doctoralStudentProfile.findUnique({
        where: { userId: user.id },
      });
      if (student) {
        const hasCohort = await this.prisma.doctoralCohortStudent.findFirst({
          where: {
            doctoralStudentProfileId: student.id,
            cohort: { programId: module_.programId },
          },
        });
        if (hasCohort) return true;
      }
    }

    return false;
  }

  /** true si el usuario puede ESCRIBIR el syllabus (admin de la organización, o docente con una cohorte en el programa — nunca el alumno). */
  private async canManage(
    user: AuthenticatedUser,
    module_: ModuleWithProgram,
  ): Promise<boolean> {
    const adminGrant = user.roles.find(
      (r) =>
        r.roleKey === 'doctoral_admin' &&
        r.organizationId === module_.program.organizationId,
    );
    if (adminGrant) return true;

    if (user.roles.some((r) => r.roleKey === 'doctoral_professor')) {
      const professor = await this.prisma.doctoralProfessorProfile.findUnique({
        where: { userId: user.id },
      });
      if (professor) {
        const hasCohort = await this.prisma.doctoralCohortProfessor.findFirst({
          where: {
            doctoralProfessorProfileId: professor.id,
            cohort: { programId: module_.programId },
          },
        });
        if (hasCohort) return true;
      }
    }

    return false;
  }

  async listModulesForProgram(user: AuthenticatedUser, programId: string) {
    const modules = await this.prisma.programModule.findMany({
      where: { programId, deletedAt: null },
      select: {
        id: true,
        title: true,
        order: true,
        semester: true,
        programId: true,
        syllabusFileId: true,
        syllabusFile: { select: { fileName: true, sizeBytes: true } },
        program: { select: { organizationId: true } },
      },
      orderBy: { order: 'asc' },
    });
    if (modules.length === 0) {
      return [];
    }
    const canSee = await this.canAccess(user, modules[0]);
    if (!canSee) {
      throw new ForbiddenException(
        'No tienes acceso a los módulos de este programa',
      );
    }
    return modules.map((m) => ({
      moduleId: m.id,
      title: m.title,
      order: m.order,
      semester: m.semester,
      syllabus: m.syllabusFile
        ? {
            fileId: m.syllabusFileId,
            fileName: m.syllabusFile.fileName,
            sizeBytes: m.syllabusFile.sizeBytes,
          }
        : null,
    }));
  }

  async upload(
    user: AuthenticatedUser,
    moduleId: string,
    dto: UploadSyllabusDto,
  ) {
    const module_ = await this.loadModule(moduleId);
    if (!(await this.canManage(user, module_))) {
      throw new ForbiddenException(
        'No tienes permiso para subir el syllabus de este módulo',
      );
    }

    const previousFileId = module_.syllabusFileId;
    const stored = await this.files.saveFile({
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      base64Data: dto.base64Data,
      uploadedByUserId: user.id,
    });

    await this.prisma.programModule.update({
      where: { id: moduleId },
      data: { syllabusFileId: stored.id },
    });
    // El archivo anterior queda huérfano una vez desvinculado — se borra
    // aparte (no en la misma transacción) para no bloquear la subida nueva
    // si el borrado fallara por cualquier motivo.
    if (previousFileId) {
      await this.prisma.doctoralFile
        .delete({ where: { id: previousFileId } })
        .catch(() => undefined);
    }

    return {
      moduleId,
      fileId: stored.id,
      fileName: stored.fileName,
      sizeBytes: stored.sizeBytes,
    };
  }

  async remove(user: AuthenticatedUser, moduleId: string) {
    const module_ = await this.loadModule(moduleId);
    if (!(await this.canManage(user, module_))) {
      throw new ForbiddenException(
        'No tienes permiso para quitar el syllabus de este módulo',
      );
    }
    if (!module_.syllabusFileId) {
      throw new NotFoundException('Este módulo no tiene syllabus');
    }
    const fileId = module_.syllabusFileId;
    await this.prisma.programModule.update({
      where: { id: moduleId },
      data: { syllabusFileId: null },
    });
    await this.prisma.doctoralFile
      .delete({ where: { id: fileId } })
      .catch(() => undefined);
    return { moduleId };
  }

  async download(user: AuthenticatedUser, moduleId: string) {
    const module_ = await this.loadModule(moduleId);
    if (!(await this.canAccess(user, module_))) {
      throw new ForbiddenException(
        'No tienes acceso al syllabus de este módulo',
      );
    }
    if (!module_.syllabusFileId) {
      throw new NotFoundException('Este módulo todavía no tiene syllabus');
    }
    return this.files.getFile(module_.syllabusFileId);
  }

  /** Solo metadata (sin el binario) — para que una vista muestre "hay/no hay
   * syllabus" sin depender de listar todos los módulos del programa. */
  async getMeta(user: AuthenticatedUser, moduleId: string) {
    const module_ = await this.loadModule(moduleId);
    if (!(await this.canAccess(user, module_))) {
      throw new ForbiddenException(
        'No tienes acceso al syllabus de este módulo',
      );
    }
    return module_.syllabusFile && module_.syllabusFileId
      ? {
          fileId: module_.syllabusFileId,
          fileName: module_.syllabusFile.fileName,
          sizeBytes: module_.syllabusFile.sizeBytes,
        }
      : null;
  }
}
