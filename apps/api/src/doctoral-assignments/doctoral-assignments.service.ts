import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@doctorado/db';
import { PrismaService } from '../prisma/prisma.service.js';
import { DoctoralFilesService } from '../doctoral-common/doctoral-files.service.js';
import {
  assertProfessorOwnsCohort,
  resolveDoctoralProfessorProfile,
  resolveDoctoralStudentProfile,
} from '../doctoral-common/doctoral-common.helpers.js';
import type { CreateDoctoralAssignmentDto } from './dto/create-doctoral-assignment.dto.js';
import type { UpdateDoctoralAssignmentDto } from './dto/update-doctoral-assignment.dto.js';
import type { UploadDoctoralFileDto } from './dto/upload-doctoral-file.dto.js';
import type { GradeDoctoralSubmissionDto } from './dto/grade-doctoral-submission.dto.js';
import type { SubmitDoctoralAssignmentDto } from './dto/submit-doctoral-assignment.dto.js';
import type { CreateDoctoralStudentGroupDto } from './dto/create-doctoral-student-group.dto.js';
import type { UpdateDoctoralStudentGroupDto } from './dto/update-doctoral-student-group.dto.js';

/** Forma persistida de una fila de options (mc) — igual convención que
 * AssignmentQuestion del lado K-12. */
export interface QuestionOption {
  key: string;
  text: string;
}

@Injectable()
export class DoctoralAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: DoctoralFilesService,
  ) {}

  // ---------------------------------------------------------------------
  // Docente — tareas
  // ---------------------------------------------------------------------

  async createAssignment(userId: string, dto: CreateDoctoralAssignmentDto) {
    const professor = await resolveDoctoralProfessorProfile(
      this.prisma,
      userId,
    );
    await assertProfessorOwnsCohort(this.prisma, professor.id, dto.cohortId);

    if (dto.moduleId) {
      await this.assertModuleBelongsToCohortProgram(dto.moduleId, dto.cohortId);
    }
    if (dto.templateFileId) {
      await this.files.getFile(dto.templateFileId);
    }

    const uniqueStudentIds = await this.validateTargetStudents(
      dto.cohortId,
      dto.targetStudentIds,
    );
    const uniqueGroupIds = await this.validateTargetGroups(
      dto.cohortId,
      dto.targetGroupIds,
    );
    const sortedQuestions = this.validateQuestions(dto.questions);

    const created = await this.prisma.$transaction(async (tx) => {
      const assignment = await tx.doctoralAssignment.create({
        data: {
          cohortId: dto.cohortId,
          moduleId: dto.moduleId,
          doctoralProfessorProfileId: professor.id,
          title: dto.title,
          instructions: dto.instructions,
          templateFileId: dto.templateFileId,
          dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        },
      });

      if (sortedQuestions.length > 0) {
        await tx.doctoralAssignmentQuestion.createMany({
          data: sortedQuestions.map((q) => ({
            assignmentId: assignment.id,
            order: q.order,
            type: q.type,
            prompt: q.prompt,
            options:
              (q.options as unknown as Prisma.InputJsonValue) ?? undefined,
            correctOptionKey: q.correctOptionKey,
            maxScore: q.maxScore ?? 100,
          })),
        });
      }
      if (uniqueStudentIds.length > 0) {
        await tx.doctoralAssignmentTarget.createMany({
          data: uniqueStudentIds.map((doctoralStudentProfileId) => ({
            assignmentId: assignment.id,
            doctoralStudentProfileId,
          })),
        });
      }
      if (uniqueGroupIds.length > 0) {
        await tx.doctoralAssignmentTargetGroup.createMany({
          data: uniqueGroupIds.map((groupId) => ({
            assignmentId: assignment.id,
            groupId,
          })),
        });
      }
      return assignment;
    });

    const questions = await this.prisma.doctoralAssignmentQuestion.findMany({
      where: { assignmentId: created.id },
      orderBy: { order: 'asc' },
    });

    return {
      ...this.serializeAssignmentSummary(created),
      targetStudentIds: uniqueStudentIds,
      targetGroupIds: uniqueGroupIds,
      questions: questions.map((q) => this.serializeQuestionForProfessor(q)),
    };
  }

  async updateAssignment(
    userId: string,
    assignmentId: string,
    dto: UpdateDoctoralAssignmentDto,
  ) {
    const professor = await resolveDoctoralProfessorProfile(
      this.prisma,
      userId,
    );
    const assignment = await this.resolveOwnedAssignment(
      professor.id,
      assignmentId,
    );

    if (dto.status === 'published' && assignment.status !== 'published') {
      const questionCount = await this.prisma.doctoralAssignmentQuestion.count({
        where: { assignmentId },
      });
      if (questionCount === 0) {
        throw new ConflictException(
          'Agrega al menos una pregunta antes de publicar la tarea',
        );
      }
    }
    if (dto.moduleId) {
      await this.assertModuleBelongsToCohortProgram(
        dto.moduleId,
        assignment.cohortId,
      );
    }
    if (dto.templateFileId) {
      await this.files.getFile(dto.templateFileId);
    }

    const updated = await this.prisma.doctoralAssignment.update({
      where: { id: assignment.id },
      data: {
        title: dto.title,
        instructions: dto.instructions,
        moduleId: dto.moduleId,
        templateFileId: dto.templateFileId,
        dueAt: dto.dueAt !== undefined ? new Date(dto.dueAt) : undefined,
        status: dto.status,
      },
    });
    return this.serializeAssignmentSummary(updated);
  }

  /** Sube el archivo de plantilla de una tarea (Word/PDF/etc.) — el id que
   * devuelve se usa como templateFileId al crear/editar la tarea. */
  async uploadTemplateFile(userId: string, dto: UploadDoctoralFileDto) {
    // Solo confirma que la cuenta es de un docente de doctorado — el archivo
    // en sí no pertenece a ninguna tarea todavía.
    await resolveDoctoralProfessorProfile(this.prisma, userId);
    return this.files.saveFile({
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      base64Data: dto.base64Data,
      uploadedByUserId: userId,
    });
  }

  /** Análogo a uploadTemplateFile pero para el lado alumno — necesario para
   * que una entrega pueda adjuntar un archivo (fileId) en
   * submitAssignment/SubmitDoctoralAssignmentDto. Sin este endpoint el
   * alumno no tenía ninguna forma de obtener un fileId propio. */
  async uploadSubmissionFile(userId: string, dto: UploadDoctoralFileDto) {
    await resolveDoctoralStudentProfile(this.prisma, userId);
    return this.files.saveFile({
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      base64Data: dto.base64Data,
      uploadedByUserId: userId,
    });
  }

  async listForCohort(userId: string, cohortId: string) {
    const professor = await resolveDoctoralProfessorProfile(
      this.prisma,
      userId,
    );
    await assertProfessorOwnsCohort(this.prisma, professor.id, cohortId);

    const assignments = await this.prisma.doctoralAssignment.findMany({
      where: { cohortId, deletedAt: null },
      include: {
        _count: {
          select: {
            questions: true,
            targets: true,
            targetGroups: true,
            submissions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const gradedCounts = await this.prisma.doctoralAssignmentSubmission.groupBy(
      {
        by: ['assignmentId'],
        where: {
          assignmentId: { in: assignments.map((a) => a.id) },
          status: 'graded',
        },
        _count: { _all: true },
      },
    );
    const gradedByAssignmentId = new Map(
      gradedCounts.map((g) => [g.assignmentId, g._count._all]),
    );

    return assignments.map((a) => ({
      assignmentId: a.id,
      title: a.title,
      moduleId: a.moduleId,
      dueAt: a.dueAt,
      status: a.status,
      createdAt: a.createdAt,
      questionCount: a._count.questions,
      targetStudentCount: a._count.targets,
      targetGroupCount: a._count.targetGroups,
      submissionTotal: a._count.submissions,
      submissionGraded: gradedByAssignmentId.get(a.id) ?? 0,
    }));
  }

  async listSubmissions(userId: string, assignmentId: string) {
    const professor = await resolveDoctoralProfessorProfile(
      this.prisma,
      userId,
    );
    await this.resolveOwnedAssignment(professor.id, assignmentId);

    const submissions = await this.prisma.doctoralAssignmentSubmission.findMany(
      {
        where: { assignmentId },
        include: { student: { select: { id: true, displayName: true } } },
        orderBy: { submittedAt: 'asc' },
      },
    );
    return submissions.map((s) => ({
      submissionId: s.id,
      studentProfileId: s.student.id,
      studentDisplayName: s.student.displayName,
      status: s.status,
      fileId: s.fileId,
      submittedAt: s.submittedAt,
      gradedAt: s.gradedAt,
      totalScore: s.totalScore,
    }));
  }

  /** Detalle de una entrega con cada respuesta — necesario para que el
   * docente vea qué respondió el alumno antes de calificar (el endpoint de
   * calificar solo recibe puntajes, no el contenido de las respuestas). */
  async getSubmissionForProfessor(
    userId: string,
    assignmentId: string,
    submissionId: string,
  ) {
    const professor = await resolveDoctoralProfessorProfile(
      this.prisma,
      userId,
    );
    await this.resolveOwnedAssignment(professor.id, assignmentId);

    const submission = await this.prisma.doctoralAssignmentSubmission.findFirst(
      {
        where: { id: submissionId, assignmentId },
        include: {
          student: { select: { id: true, displayName: true } },
          answers: {
            include: { question: true },
            orderBy: { question: { order: 'asc' } },
          },
        },
      },
    );
    if (!submission) {
      throw new NotFoundException('Entrega no encontrada');
    }
    return {
      submissionId: submission.id,
      studentProfileId: submission.student.id,
      studentDisplayName: submission.student.displayName,
      status: submission.status,
      fileId: submission.fileId,
      submittedAt: submission.submittedAt,
      gradedAt: submission.gradedAt,
      totalScore: submission.totalScore,
      feedback: submission.feedback,
      answers: submission.answers.map((a) => ({
        questionId: a.assignmentQuestionId,
        order: a.question.order,
        type: a.question.type,
        prompt: a.question.prompt,
        maxScore: a.question.maxScore,
        correctOptionKey: a.question.correctOptionKey,
        responseText: a.responseText,
        selectedOptionKey: a.selectedOptionKey,
        score: a.score,
        feedback: a.feedback,
      })),
    };
  }

  async gradeSubmission(
    userId: string,
    assignmentId: string,
    submissionId: string,
    dto: GradeDoctoralSubmissionDto,
  ) {
    const professor = await resolveDoctoralProfessorProfile(
      this.prisma,
      userId,
    );
    await this.resolveOwnedAssignment(professor.id, assignmentId);

    const submission = await this.prisma.doctoralAssignmentSubmission.findFirst(
      { where: { id: submissionId, assignmentId } },
    );
    if (!submission) {
      throw new NotFoundException('Entrega no encontrada');
    }

    const existingAnswers = await this.prisma.doctoralAssignmentAnswer.findMany(
      { where: { assignmentSubmissionId: submissionId } },
    );
    const answerByQuestionId = new Map(
      existingAnswers.map((a) => [a.assignmentQuestionId, a]),
    );
    for (const input of dto.answers) {
      if (!answerByQuestionId.has(input.questionId)) {
        throw new BadRequestException(
          'Una de las respuestas indicadas no pertenece a esta entrega',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const input of dto.answers) {
        const answer = answerByQuestionId.get(input.questionId);
        if (!answer) continue;
        await tx.doctoralAssignmentAnswer.update({
          where: { id: answer.id },
          data: {
            score: input.score,
            feedback: input.feedback,
            gradedByUserId: userId,
            gradedAt: new Date(),
          },
        });
      }

      const allAnswers = await tx.doctoralAssignmentAnswer.findMany({
        where: { assignmentSubmissionId: submissionId },
      });
      const totalScore = allAnswers.reduce((sum, a) => sum + (a.score ?? 0), 0);
      await tx.doctoralAssignmentSubmission.update({
        where: { id: submissionId },
        data: {
          totalScore,
          feedback: dto.feedback,
          status: 'graded',
          gradedAt: new Date(),
        },
      });
    });

    return this.getSubmissionForProfessor(userId, assignmentId, submissionId);
  }

  // ---------------------------------------------------------------------
  // Docente — grupos de estudiantes (targeting grupal)
  // ---------------------------------------------------------------------

  async createGroup(
    userId: string,
    cohortId: string,
    dto: CreateDoctoralStudentGroupDto,
  ) {
    const professor = await resolveDoctoralProfessorProfile(
      this.prisma,
      userId,
    );
    await assertProfessorOwnsCohort(this.prisma, professor.id, cohortId);

    const uniqueIds = await this.assertStudentsInCohort(
      cohortId,
      dto.studentIds,
    );

    const group = await this.prisma.$transaction(async (tx) => {
      const created = await tx.doctoralStudentGroup.create({
        data: { cohortId, name: dto.name },
      });
      if (uniqueIds.length > 0) {
        await tx.doctoralStudentGroupMember.createMany({
          data: uniqueIds.map((doctoralStudentProfileId) => ({
            groupId: created.id,
            doctoralStudentProfileId,
          })),
        });
      }
      return created;
    });

    return this.serializeGroup(group, uniqueIds);
  }

  async listGroups(userId: string, cohortId: string) {
    const professor = await resolveDoctoralProfessorProfile(
      this.prisma,
      userId,
    );
    await assertProfessorOwnsCohort(this.prisma, professor.id, cohortId);

    const groups = await this.prisma.doctoralStudentGroup.findMany({
      where: { cohortId, deletedAt: null },
      include: { members: { select: { doctoralStudentProfileId: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return groups.map((g) =>
      this.serializeGroup(
        g,
        g.members.map((m) => m.doctoralStudentProfileId),
      ),
    );
  }

  async updateGroup(
    userId: string,
    groupId: string,
    dto: UpdateDoctoralStudentGroupDto,
  ) {
    const professor = await resolveDoctoralProfessorProfile(
      this.prisma,
      userId,
    );
    const group = await this.resolveOwnedGroup(professor.id, groupId);

    const uniqueIds =
      dto.studentIds !== undefined
        ? await this.assertStudentsInCohort(group.cohortId, dto.studentIds)
        : undefined;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.doctoralStudentGroup.update({
        where: { id: group.id },
        data: { name: dto.name },
      });
      if (uniqueIds !== undefined) {
        await tx.doctoralStudentGroupMember.deleteMany({
          where: { groupId: group.id },
        });
        if (uniqueIds.length > 0) {
          await tx.doctoralStudentGroupMember.createMany({
            data: uniqueIds.map((doctoralStudentProfileId) => ({
              groupId: group.id,
              doctoralStudentProfileId,
            })),
          });
        }
      }
      return result;
    });

    const memberIds =
      uniqueIds ??
      (
        await this.prisma.doctoralStudentGroupMember.findMany({
          where: { groupId: group.id },
          select: { doctoralStudentProfileId: true },
        })
      ).map((m) => m.doctoralStudentProfileId);

    return this.serializeGroup(updated, memberIds);
  }

  async deleteGroup(userId: string, groupId: string) {
    const professor = await resolveDoctoralProfessorProfile(
      this.prisma,
      userId,
    );
    const group = await this.resolveOwnedGroup(professor.id, groupId);
    await this.prisma.doctoralStudentGroup.update({
      where: { id: group.id },
      data: { deletedAt: new Date() },
    });
    return { groupId: group.id, deleted: true };
  }

  // ---------------------------------------------------------------------
  // Estudiante
  // ---------------------------------------------------------------------

  async listForStudent(userId: string) {
    const student = await resolveDoctoralStudentProfile(this.prisma, userId);

    const assignments = await this.prisma.doctoralAssignment.findMany({
      where: {
        deletedAt: null,
        status: { not: 'draft' },
        cohort: {
          students: { some: { doctoralStudentProfileId: student.id } },
        },
        OR: this.visibilityOrClause(student.id),
      },
      include: {
        cohort: { select: { name: true } },
        module: { select: { title: true } },
        submissions: {
          where: { doctoralStudentProfileId: student.id },
          select: { status: true, totalScore: true },
        },
        _count: { select: { questions: true } },
      },
      orderBy: { dueAt: 'asc' },
    });

    return assignments.map((a) => ({
      assignmentId: a.id,
      title: a.title,
      cohortId: a.cohortId,
      cohortName: a.cohort.name,
      moduleId: a.moduleId,
      moduleTitle: a.module?.title ?? null,
      dueAt: a.dueAt,
      status: a.status,
      questionCount: a._count.questions,
      submissionStatus: a.submissions[0]?.status ?? 'not_started',
      totalScore: a.submissions[0]?.totalScore ?? null,
    }));
  }

  async getForStudent(userId: string, assignmentId: string) {
    const student = await resolveDoctoralStudentProfile(this.prisma, userId);
    const assignment = await this.findVisibleAssignmentForStudent(
      assignmentId,
      student.id,
    );
    if (!assignment) {
      throw new NotFoundException('Tarea no encontrada');
    }

    const [questions, submission] = await Promise.all([
      this.prisma.doctoralAssignmentQuestion.findMany({
        where: { assignmentId },
        orderBy: { order: 'asc' },
      }),
      this.prisma.doctoralAssignmentSubmission.findUnique({
        where: {
          assignmentId_doctoralStudentProfileId: {
            assignmentId,
            doctoralStudentProfileId: student.id,
          },
        },
        include: { answers: true },
      }),
    ]);
    const answerByQuestionId = new Map(
      (submission?.answers ?? []).map((a) => [a.assignmentQuestionId, a]),
    );
    const graded = submission?.status === 'graded';

    return {
      assignmentId: assignment.id,
      title: assignment.title,
      instructions: assignment.instructions,
      templateFileId: assignment.templateFileId,
      dueAt: assignment.dueAt,
      status: assignment.status,
      submissionStatus: submission?.status ?? 'not_started',
      submissionFileId: submission?.fileId ?? null,
      totalScore: submission?.totalScore ?? null,
      feedback: graded ? (submission?.feedback ?? null) : null,
      questions: questions.map((q) => {
        const answer = answerByQuestionId.get(q.id);
        return {
          questionId: q.id,
          order: q.order,
          type: q.type,
          prompt: q.prompt,
          options: (q.options as QuestionOption[] | null) ?? undefined,
          maxScore: q.maxScore,
          responseText: answer?.responseText ?? undefined,
          selectedOptionKey: answer?.selectedOptionKey ?? undefined,
          score: graded ? (answer?.score ?? undefined) : undefined,
          feedback: graded ? (answer?.feedback ?? undefined) : undefined,
        };
      }),
    };
  }

  async submitAssignment(
    userId: string,
    assignmentId: string,
    dto: SubmitDoctoralAssignmentDto,
  ) {
    const student = await resolveDoctoralStudentProfile(this.prisma, userId);
    const assignment = await this.findVisibleAssignmentForStudent(
      assignmentId,
      student.id,
    );
    if (!assignment) {
      throw new NotFoundException('Tarea no encontrada');
    }
    if (assignment.status === 'closed') {
      throw new ConflictException(
        'Esta tarea está cerrada — ya no se puede entregar',
      );
    }

    const questions = await this.prisma.doctoralAssignmentQuestion.findMany({
      where: { assignmentId },
    });
    const questionById = new Map(questions.map((q) => [q.id, q]));
    for (const answer of dto.answers) {
      if (!questionById.has(answer.questionId)) {
        throw new BadRequestException(
          'Una de las respuestas no pertenece a esta tarea',
        );
      }
    }
    if (dto.fileId) {
      // Confirma que el archivo exista (getFile lanza NotFoundException si
      // no) — no se restringe más porque el propio flujo de subida
      // (DoctoralFilesService.saveFile) ya lo asocia a este userId.
      await this.files.getFile(dto.fileId);
    }

    await this.prisma.$transaction(async (tx) => {
      const submission = await tx.doctoralAssignmentSubmission.upsert({
        where: {
          assignmentId_doctoralStudentProfileId: {
            assignmentId,
            doctoralStudentProfileId: student.id,
          },
        },
        // fileId: undefined = no se toca (Prisma ignora props undefined en
        // update) — un reenvío sin adjuntar archivo de nuevo no debe borrar
        // el que ya se había subido antes.
        update: { fileId: dto.fileId },
        create: {
          assignmentId,
          doctoralStudentProfileId: student.id,
          fileId: dto.fileId,
        },
      });

      for (const answer of dto.answers) {
        const question = questionById.get(answer.questionId);
        if (!question) continue;
        // mc se autocalifica en cada envío (determinístico e idempotente);
        // el resto queda sin calificar (score=null) hasta que el docente la
        // califique manualmente — incluso si ya estaba calificada antes, un
        // reenvío significa que la respuesta cambió, así que su calificación
        // anterior queda obsoleta.
        const isMc = question.type === 'mc';
        const score = isMc
          ? answer.selectedOptionKey === question.correctOptionKey
            ? question.maxScore
            : 0
          : null;

        await tx.doctoralAssignmentAnswer.upsert({
          where: {
            assignmentSubmissionId_assignmentQuestionId: {
              assignmentSubmissionId: submission.id,
              assignmentQuestionId: answer.questionId,
            },
          },
          update: {
            responseText: answer.responseText,
            selectedOptionKey: answer.selectedOptionKey,
            score,
            ...(isMc
              ? {}
              : { feedback: null, gradedByUserId: null, gradedAt: null }),
          },
          create: {
            assignmentSubmissionId: submission.id,
            assignmentQuestionId: answer.questionId,
            responseText: answer.responseText,
            selectedOptionKey: answer.selectedOptionKey,
            score,
          },
        });
      }

      const finalAnswers = await tx.doctoralAssignmentAnswer.findMany({
        where: { assignmentSubmissionId: submission.id },
      });
      const allGraded =
        questions.length > 0 &&
        finalAnswers.length === questions.length &&
        finalAnswers.every((a) => a.score !== null);
      const totalScore = allGraded
        ? finalAnswers.reduce((sum, a) => sum + (a.score ?? 0), 0)
        : null;

      await tx.doctoralAssignmentSubmission.update({
        where: { id: submission.id },
        data: {
          status: allGraded ? 'graded' : 'submitted',
          submittedAt: new Date(),
          gradedAt: allGraded ? new Date() : null,
          totalScore,
        },
      });
    });

    return this.getForStudent(userId, assignmentId);
  }

  // ---------------------------------------------------------------------
  // Archivos — descarga compartida (docente y alumno, con chequeo de
  // pertenencia distinto para cada uno)
  // ---------------------------------------------------------------------

  /** Un mismo userId puede tener a lo sumo un perfil de cada tipo (userId es
   * @unique en ambos modelos) — se prueban ambos caminos porque este
   * endpoint es compartido entre ambos roles. */
  async downloadFile(userId: string, fileId: string) {
    const file = await this.files.getFile(fileId);

    const professorProfile =
      await this.prisma.doctoralProfessorProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
    if (professorProfile) {
      const ownsAsTemplate = await this.prisma.doctoralAssignment.findFirst({
        where: {
          templateFileId: fileId,
          cohort: {
            professors: {
              some: { doctoralProfessorProfileId: professorProfile.id },
            },
          },
        },
        select: { id: true },
      });
      if (ownsAsTemplate) return file;

      const ownsAsSubmission =
        await this.prisma.doctoralAssignmentSubmission.findFirst({
          where: {
            fileId,
            assignment: {
              cohort: {
                professors: {
                  some: { doctoralProfessorProfileId: professorProfile.id },
                },
              },
            },
          },
          select: { id: true },
        });
      if (ownsAsSubmission) return file;
    }

    const studentProfile = await this.prisma.doctoralStudentProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (studentProfile) {
      const ownSubmission =
        await this.prisma.doctoralAssignmentSubmission.findFirst({
          where: { fileId, doctoralStudentProfileId: studentProfile.id },
          select: { id: true },
        });
      if (ownSubmission) return file;

      // También puede descargar la plantilla de cualquier tarea que le sea
      // visible — es justamente el archivo que necesita para completar la
      // entrega, no solo para revisarla después de entregada.
      const visibleTemplate = await this.findVisibleAssignmentForStudent(
        undefined,
        studentProfile.id,
        fileId,
      );
      if (visibleTemplate) return file;
    }

    throw new NotFoundException('Archivo no encontrado');
  }

  // ---------------------------------------------------------------------
  // Helpers privados
  // ---------------------------------------------------------------------

  /** Cadena de visibilidad (ver enunciado): sin targets ni targetGroups =
   * toda la cohorte; o el alumno está targeteado individualmente; o
   * pertenece a un grupo targeteado. */
  private visibilityOrClause(
    studentProfileId: string,
  ): NonNullable<Prisma.DoctoralAssignmentWhereInput['OR']> {
    return [
      { targets: { none: {} }, targetGroups: { none: {} } },
      { targets: { some: { doctoralStudentProfileId: studentProfileId } } },
      {
        targetGroups: {
          some: {
            group: {
              members: { some: { doctoralStudentProfileId: studentProfileId } },
            },
          },
        },
      },
    ];
  }

  /** Resuelve una tarea visible para el alumno (inscrito en la cohorte,
   * status != draft, y elegible según visibilityOrClause). Si se pasa
   * templateFileId en vez de assignmentId, busca por ese archivo de
   * plantilla en cualquier tarea visible (usado por downloadFile). */
  private async findVisibleAssignmentForStudent(
    assignmentId: string | undefined,
    studentProfileId: string,
    templateFileId?: string,
  ) {
    return this.prisma.doctoralAssignment.findFirst({
      where: {
        id: assignmentId,
        templateFileId,
        status: { not: 'draft' },
        deletedAt: null,
        cohort: {
          students: { some: { doctoralStudentProfileId: studentProfileId } },
        },
        OR: this.visibilityOrClause(studentProfileId),
      },
    });
  }

  /** Verifica que el docente (a través de CUALQUIER docente asignado a la
   * cohorte, no solo quien la creó) pueda gestionar esta tarea. */
  private async resolveOwnedAssignment(
    doctoralProfessorProfileId: string,
    assignmentId: string,
  ) {
    const assignment = await this.prisma.doctoralAssignment.findFirst({
      where: {
        id: assignmentId,
        deletedAt: null,
        cohort: {
          professors: { some: { doctoralProfessorProfileId } },
        },
      },
    });
    if (!assignment) {
      throw new NotFoundException('Tarea no encontrada');
    }
    return assignment;
  }

  private async resolveOwnedGroup(
    doctoralProfessorProfileId: string,
    groupId: string,
  ) {
    const group = await this.prisma.doctoralStudentGroup.findFirst({
      where: {
        id: groupId,
        deletedAt: null,
        cohort: { professors: { some: { doctoralProfessorProfileId } } },
      },
    });
    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }
    return group;
  }

  private async assertModuleBelongsToCohortProgram(
    moduleId: string,
    cohortId: string,
  ): Promise<void> {
    const [module, cohort] = await Promise.all([
      this.prisma.programModule.findFirst({
        where: { id: moduleId, deletedAt: null },
        select: { programId: true },
      }),
      this.prisma.doctoralCohort.findUnique({
        where: { id: cohortId },
        select: { programId: true },
      }),
    ]);
    if (!module) {
      throw new BadRequestException('El módulo indicado no existe');
    }
    if (!cohort || cohort.programId !== module.programId) {
      throw new BadRequestException(
        'El módulo no pertenece al programa de esta cohorte',
      );
    }
  }

  private async validateTargetStudents(
    cohortId: string,
    studentIds: string[] | undefined,
  ): Promise<string[]> {
    if (!studentIds || studentIds.length === 0) return [];
    return this.assertStudentsInCohort(cohortId, studentIds);
  }

  private async assertStudentsInCohort(
    cohortId: string,
    studentIds: string[],
  ): Promise<string[]> {
    const uniqueIds = Array.from(new Set(studentIds));
    if (uniqueIds.length === 0) return [];
    const enrolled = await this.prisma.doctoralCohortStudent.findMany({
      where: { cohortId, doctoralStudentProfileId: { in: uniqueIds } },
      select: { doctoralStudentProfileId: true },
    });
    if (enrolled.length !== uniqueIds.length) {
      throw new BadRequestException(
        'Uno o más estudiantes seleccionados no pertenecen a esta cohorte',
      );
    }
    return uniqueIds;
  }

  private async validateTargetGroups(
    cohortId: string,
    groupIds: string[] | undefined,
  ): Promise<string[]> {
    if (!groupIds || groupIds.length === 0) return [];
    const uniqueIds = Array.from(new Set(groupIds));
    const groups = await this.prisma.doctoralStudentGroup.findMany({
      where: { id: { in: uniqueIds }, cohortId, deletedAt: null },
      select: { id: true },
    });
    if (groups.length !== uniqueIds.length) {
      throw new BadRequestException(
        'Uno o más grupos seleccionados no pertenecen a esta cohorte',
      );
    }
    return uniqueIds;
  }

  /** Valida órdenes únicos y la coherencia mc (>=2 alternativas +
   * correctOptionKey dentro de ellas) antes de crear las preguntas. */
  private validateQuestions(
    questions: CreateDoctoralAssignmentDto['questions'],
  ): CreateDoctoralAssignmentDto['questions'] {
    const sorted = [...questions].sort((a, b) => a.order - b.order);
    const orders = sorted.map((q) => q.order);
    if (new Set(orders).size !== orders.length) {
      throw new BadRequestException(
        'Los números de orden de las preguntas están repetidos',
      );
    }
    for (const q of sorted) {
      if (q.type === 'mc') {
        if (!q.options || q.options.length < 2) {
          throw new BadRequestException(
            `La pregunta de orden ${q.order} es de selección múltiple y requiere al menos 2 alternativas`,
          );
        }
        if (
          !q.correctOptionKey ||
          !q.options.some((o) => o.key === q.correctOptionKey)
        ) {
          throw new BadRequestException(
            `La pregunta de orden ${q.order} no tiene un correctOptionKey válido`,
          );
        }
      }
    }
    return sorted;
  }

  private serializeGroup(
    group: { id: string; cohortId: string; name: string; createdAt: Date },
    memberIds: string[],
  ) {
    return {
      groupId: group.id,
      cohortId: group.cohortId,
      name: group.name,
      createdAt: group.createdAt,
      studentIds: memberIds,
    };
  }

  private serializeAssignmentSummary(assignment: {
    id: string;
    cohortId: string;
    moduleId: string | null;
    title: string;
    instructions: string | null;
    templateFileId: string | null;
    dueAt: Date | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      assignmentId: assignment.id,
      cohortId: assignment.cohortId,
      moduleId: assignment.moduleId,
      title: assignment.title,
      instructions: assignment.instructions,
      templateFileId: assignment.templateFileId,
      dueAt: assignment.dueAt,
      status: assignment.status,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
    };
  }

  private serializeQuestionForProfessor(question: {
    id: string;
    order: number;
    type: string;
    prompt: string;
    options: unknown;
    correctOptionKey: string | null;
    maxScore: number;
  }) {
    return {
      questionId: question.id,
      order: question.order,
      type: question.type,
      prompt: question.prompt,
      options: (question.options as QuestionOption[] | null) ?? undefined,
      correctOptionKey: question.correctOptionKey,
      maxScore: question.maxScore,
    };
  }
}
