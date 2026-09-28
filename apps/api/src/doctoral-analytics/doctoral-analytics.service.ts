import { Injectable } from '@nestjs/common';
import type { DoctoralModuleEnrollmentStatus } from '@doctorado/db';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  assertProfessorOwnsCohort,
  assertProfessorOwnsCohortStudent,
  resolveDoctoralProfessorProfile,
} from '../doctoral-common/doctoral-common.helpers.js';

/**
 * Reportería docente del Dominio Doctorado (mapa de calor de competencias +
 * KPIs por cohorte) — mismo patrón que ClassroomsService del lado K-12:
 * cada método resuelve el propio perfil de docente desde el userId de
 * sesión y revalida pertenencia sobre la cohorte/alumno antes de leer nada.
 * Nunca reimplementa el cálculo de competencias: solo lee el rollup
 * materializado por CompetencyRollupService (DoctoralStudentCompetencyScore)
 * — una competencia sin fila todavía es "sin datos", nunca un 0.
 *
 * Siguiendo la convención ya usada en PracticeService (ver comentario en
 * getTopicProgress): a este volumen por cohorte/alumno, los joins de
 * agregación se resuelven en JS sobre consultas simples en vez de
 * `groupBy` de Prisma a través de relaciones.
 */
@Injectable()
export class DoctoralAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Cohortes propias del docente — punto de entrada para el resto de los
   * endpoints (heatmap/kpis/tareas), que ya reciben un cohortId. Sin esto
   * el frontend no tendría forma de descubrir qué cohortId usar. */
  async getMyCohorts(userId: string) {
    const professor = await resolveDoctoralProfessorProfile(
      this.prisma,
      userId,
    );
    const memberships = await this.prisma.doctoralCohortProfessor.findMany({
      where: { doctoralProfessorProfileId: professor.id },
      select: {
        cohort: {
          select: {
            id: true,
            name: true,
            startYear: true,
            program: { select: { id: true, key: true, name: true } },
            students: { select: { doctoralStudentProfileId: true } },
          },
        },
      },
      orderBy: { cohort: { startYear: 'desc' } },
    });
    return memberships.map((m) => ({
      cohortId: m.cohort.id,
      name: m.cohort.name,
      startYear: m.cohort.startYear,
      program: m.cohort.program,
      studentCount: m.cohort.students.length,
    }));
  }

  /**
   * Matriz alumno×competencia de toda la cohorte — mapa de calor docente.
   * Solo incluye competencias del programa de la cohorte, y solo las celdas
   * que efectivamente existen en el rollup (sin sintetizar ceros).
   */
  async getCohortHeatmap(userId: string, cohortId: string) {
    const professor = await resolveDoctoralProfessorProfile(
      this.prisma,
      userId,
    );
    await assertProfessorOwnsCohort(this.prisma, professor.id, cohortId);

    const cohort = await this.prisma.doctoralCohort.findUniqueOrThrow({
      where: { id: cohortId },
      select: { programId: true },
    });

    const [competencies, cohortStudents] = await Promise.all([
      this.prisma.competencyArea.findMany({
        where: { programId: cohort.programId },
        select: { id: true, key: true, label: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.doctoralCohortStudent.findMany({
        where: { cohortId },
        select: {
          student: { select: { id: true, displayName: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const studentIds = cohortStudents.map((cs) => cs.student.id);
    const competencyIds = competencies.map((c) => c.id);

    const scores =
      studentIds.length && competencyIds.length
        ? await this.prisma.doctoralStudentCompetencyScore.findMany({
            where: {
              doctoralStudentProfileId: { in: studentIds },
              competencyAreaId: { in: competencyIds },
            },
            select: {
              doctoralStudentProfileId: true,
              competencyAreaId: true,
              score: true,
              sampleCount: true,
            },
          })
        : [];

    const scoresByStudent = new Map<
      string,
      { competencyAreaId: string; score: number; sampleCount: number }[]
    >();
    for (const s of scores) {
      const list = scoresByStudent.get(s.doctoralStudentProfileId) ?? [];
      list.push({
        competencyAreaId: s.competencyAreaId,
        score: s.score,
        sampleCount: s.sampleCount,
      });
      scoresByStudent.set(s.doctoralStudentProfileId, list);
    }

    return {
      competencies: competencies.map((c) => ({
        id: c.id,
        key: c.key,
        label: c.label,
      })),
      students: cohortStudents.map((cs) => ({
        doctoralStudentProfileId: cs.student.id,
        displayName: cs.student.displayName,
        scores: scoresByStudent.get(cs.student.id) ?? [],
      })),
    };
  }

  /**
   * Mapa de calor de UN alumno, con todas las competencias de los programas
   * en los que tiene cohorte (mismo universo de competencias que recalcula
   * CompetencyRollupService.recomputeForStudent), score/sampleCount en null
   * cuando todavía no hay evidencia para esa competencia.
   */
  async getStudentHeatmap(userId: string, studentId: string) {
    const professor = await resolveDoctoralProfessorProfile(
      this.prisma,
      userId,
    );
    await assertProfessorOwnsCohortStudent(
      this.prisma,
      professor.id,
      studentId,
    );

    const student = await this.prisma.doctoralStudentProfile.findUniqueOrThrow({
      where: { id: studentId },
      select: { displayName: true },
    });

    const programIds = await this.programIdsForStudent(studentId);
    const competencies = programIds.length
      ? await this.prisma.competencyArea.findMany({
          where: { programId: { in: programIds } },
          select: { id: true, key: true, label: true },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    const scores = competencies.length
      ? await this.prisma.doctoralStudentCompetencyScore.findMany({
          where: {
            doctoralStudentProfileId: studentId,
            competencyAreaId: { in: competencies.map((c) => c.id) },
          },
          select: { competencyAreaId: true, score: true, sampleCount: true },
        })
      : [];
    const scoreByCompetency = new Map(
      scores.map((s) => [s.competencyAreaId, s]),
    );

    return {
      doctoralStudentProfileId: studentId,
      displayName: student.displayName,
      competencies: competencies.map((c) => {
        const found = scoreByCompetency.get(c.id);
        return {
          id: c.id,
          key: c.key,
          label: c.label,
          score: found?.score ?? null,
          sampleCount: found?.sampleCount ?? null,
        };
      }),
    };
  }

  /**
   * Informe narrativo "debilidades y puntos de mejora" de un alumno, pedido
   * explícitamente por el encargo, más un resumen por módulo (inscripción +
   * mejor intento de examen). Solo considera competencias con evidencia real
   * (sampleCount > 0) para no reportar como "debilidad" algo que en verdad
   * es "sin datos todavía".
   */
  async getStudentReport(userId: string, studentId: string) {
    const professor = await resolveDoctoralProfessorProfile(
      this.prisma,
      userId,
    );
    await assertProfessorOwnsCohortStudent(
      this.prisma,
      professor.id,
      studentId,
    );

    const student = await this.prisma.doctoralStudentProfile.findUniqueOrThrow({
      where: { id: studentId },
      select: { displayName: true },
    });

    const scores = await this.prisma.doctoralStudentCompetencyScore.findMany({
      where: { doctoralStudentProfileId: studentId, sampleCount: { gt: 0 } },
      select: {
        score: true,
        competency: { select: { key: true, label: true } },
      },
    });

    const sortedAscending = [...scores].sort((a, b) => a.score - b.score);
    const weaknesses = sortedAscending.slice(0, 3).map((s) => ({
      key: s.competency.key,
      label: s.competency.label,
      score: s.score,
    }));
    const remaining = sortedAscending.slice(3);
    const strengths = remaining
      .slice(-3)
      .reverse()
      .map((s) => ({
        key: s.competency.key,
        label: s.competency.label,
        score: s.score,
      }));

    const enrollments = await this.prisma.doctoralModuleEnrollment.findMany({
      where: { doctoralStudentProfileId: studentId },
      select: {
        status: true,
        module: {
          select: { id: true, title: true, exam: { select: { id: true } } },
        },
      },
      orderBy: { enrolledAt: 'asc' },
    });

    const examIds = [
      ...new Set(
        enrollments
          .map((e) => e.module.exam?.id)
          .filter((id): id is string => id != null),
      ),
    ];
    const examAttempts = examIds.length
      ? await this.prisma.doctoralExamAttempt.findMany({
          where: {
            doctoralStudentProfileId: studentId,
            examId: { in: examIds },
            status: 'submitted',
          },
          select: { examId: true, score: true, passed: true },
        })
      : [];

    const modules = enrollments.map((e) => {
      const examId = e.module.exam?.id ?? null;
      const attemptsForExam = examId
        ? examAttempts.filter((a) => a.examId === examId)
        : [];
      const scored = attemptsForExam.filter(
        (a): a is { examId: string; score: number; passed: boolean | null } =>
          a.score != null,
      );
      const best = scored.length
        ? scored.reduce((max, a) => (a.score > max.score ? a : max))
        : null;

      return {
        moduleId: e.module.id,
        title: e.module.title,
        status: e.status,
        examAttempted: attemptsForExam.length > 0,
        bestExamScore: best?.score ?? null,
        examPassed: best?.passed ?? null,
      };
    });

    return {
      doctoralStudentProfileId: studentId,
      displayName: student.displayName,
      weaknesses,
      strengths,
      modules,
    };
  }

  /**
   * Vista "holística" del programa a nivel de cohorte completa — nunca
   * filas crudas por alumno, solo agregados: promedio por competencia,
   * promedio de examen y % de aprobación por módulo, y desglose de estados
   * de inscripción a módulo.
   */
  async getCohortKpis(userId: string, cohortId: string) {
    const professor = await resolveDoctoralProfessorProfile(
      this.prisma,
      userId,
    );
    await assertProfessorOwnsCohort(this.prisma, professor.id, cohortId);

    const cohort = await this.prisma.doctoralCohort.findUniqueOrThrow({
      where: { id: cohortId },
      select: { programId: true },
    });

    const [competencies, cohortStudents, modules] = await Promise.all([
      this.prisma.competencyArea.findMany({
        where: { programId: cohort.programId },
        select: { id: true, key: true, label: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.doctoralCohortStudent.findMany({
        where: { cohortId },
        select: { doctoralStudentProfileId: true },
      }),
      this.prisma.programModule.findMany({
        where: { programId: cohort.programId },
        select: { id: true, title: true, exam: { select: { id: true } } },
        orderBy: { order: 'asc' },
      }),
    ]);

    const studentIds = cohortStudents.map((cs) => cs.doctoralStudentProfileId);
    const competencyIds = competencies.map((c) => c.id);
    const moduleIds = modules.map((m) => m.id);
    const examIdToModuleId = new Map(
      modules.filter((m) => m.exam).map((m) => [m.exam!.id, m.id]),
    );
    const examIds = [...examIdToModuleId.keys()];

    const competencyScoresPromise: Promise<
      { competencyAreaId: string; score: number }[]
    > =
      studentIds.length && competencyIds.length
        ? this.prisma.doctoralStudentCompetencyScore.findMany({
            where: {
              doctoralStudentProfileId: { in: studentIds },
              competencyAreaId: { in: competencyIds },
            },
            select: { competencyAreaId: true, score: true },
          })
        : Promise.resolve([]);
    const enrollmentsPromise: Promise<
      {
        moduleId: string;
        status: DoctoralModuleEnrollmentStatus;
        doctoralStudentProfileId: string;
      }[]
    > =
      studentIds.length && moduleIds.length
        ? this.prisma.doctoralModuleEnrollment.findMany({
            where: {
              doctoralStudentProfileId: { in: studentIds },
              moduleId: { in: moduleIds },
            },
            select: {
              moduleId: true,
              status: true,
              doctoralStudentProfileId: true,
            },
          })
        : Promise.resolve([]);
    const examAttemptsPromise: Promise<
      {
        examId: string;
        score: number | null;
        passed: boolean | null;
        doctoralStudentProfileId: string;
      }[]
    > =
      studentIds.length && examIds.length
        ? this.prisma.doctoralExamAttempt.findMany({
            where: {
              doctoralStudentProfileId: { in: studentIds },
              examId: { in: examIds },
              status: 'submitted',
            },
            select: {
              examId: true,
              score: true,
              passed: true,
              doctoralStudentProfileId: true,
            },
          })
        : Promise.resolve([]);

    const [competencyScores, enrollments, examAttempts] = await Promise.all([
      competencyScoresPromise,
      enrollmentsPromise,
      examAttemptsPromise,
    ]);

    const competencyAverages = competencies.map((c) => {
      const rows = competencyScores.filter((s) => s.competencyAreaId === c.id);
      const averageScore = rows.length
        ? rows.reduce((sum, r) => sum + r.score, 0) / rows.length
        : null;
      return {
        competencyAreaId: c.id,
        key: c.key,
        label: c.label,
        averageScore,
        studentsWithData: rows.length,
      };
    });

    const enrolledCountByModule = new Map<string, number>();
    const moduleCompletion = { in_progress: 0, completed: 0, withdrawn: 0 };
    for (const e of enrollments) {
      enrolledCountByModule.set(
        e.moduleId,
        (enrolledCountByModule.get(e.moduleId) ?? 0) + 1,
      );
      moduleCompletion[e.status] += 1;
    }

    const moduleStats = modules.map((m) => {
      const examId = m.exam?.id ?? null;
      const attemptsForModule = examId
        ? examAttempts.filter((a) => a.examId === examId)
        : [];
      const scored = attemptsForModule.filter((a) => a.score != null);
      const averageExamScore = scored.length
        ? scored.reduce((sum, a) => sum + (a.score ?? 0), 0) / scored.length
        : null;
      const passedStudentIds = new Set(
        attemptsForModule
          .filter((a) => a.passed)
          .map((a) => a.doctoralStudentProfileId),
      );
      const enrolledCount = enrolledCountByModule.get(m.id) ?? 0;
      const passRatePercent =
        enrolledCount > 0
          ? (passedStudentIds.size / enrolledCount) * 100
          : null;

      return {
        moduleId: m.id,
        title: m.title,
        enrolledCount,
        submittedAttemptCount: attemptsForModule.length,
        averageExamScore,
        passedCount: passedStudentIds.size,
        passRatePercent,
      };
    });

    return { competencyAverages, moduleStats, moduleCompletion };
  }

  /**
   * Historial crudo de intentos de un alumno (ejercicios de práctica +
   * examen) para revisión manual del docente — ordenado del más reciente al
   * más antiguo.
   */
  async getStudentAttempts(userId: string, studentId: string) {
    const professor = await resolveDoctoralProfessorProfile(
      this.prisma,
      userId,
    );
    await assertProfessorOwnsCohortStudent(
      this.prisma,
      professor.id,
      studentId,
    );

    const [exerciseAttempts, examAttempts] = await Promise.all([
      this.prisma.doctoralExerciseAttempt.findMany({
        where: { doctoralStudentProfileId: studentId },
        select: {
          exerciseId: true,
          attemptNumber: true,
          isCorrect: true,
          semanticScore: true,
          feedback: true,
          createdAt: true,
          exercise: {
            select: {
              difficulty: true,
              topic: { select: { title: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.doctoralExamAttempt.findMany({
        where: { doctoralStudentProfileId: studentId },
        select: {
          examId: true,
          score: true,
          passed: true,
          status: true,
          startedAt: true,
          submittedAt: true,
          exam: { select: { module: { select: { title: true } } } },
        },
        orderBy: { startedAt: 'desc' },
      }),
    ]);

    return {
      exerciseAttempts: exerciseAttempts.map((a) => ({
        exerciseId: a.exerciseId,
        topicTitle: a.exercise.topic.title,
        difficulty: a.exercise.difficulty,
        attemptNumber: a.attemptNumber,
        isCorrect: a.isCorrect,
        semanticScore: a.semanticScore,
        feedback: a.feedback,
        createdAt: a.createdAt,
      })),
      examAttempts: examAttempts.map((a) => ({
        examId: a.examId,
        moduleTitle: a.exam.module.title,
        score: a.score,
        passed: a.passed,
        status: a.status,
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
      })),
    };
  }

  /** Programas en los que el alumno tiene alguna cohorte (mismo universo que
   * recorre CompetencyRollupService.recomputeForStudent). */
  private async programIdsForStudent(
    doctoralStudentProfileId: string,
  ): Promise<string[]> {
    const memberships = await this.prisma.doctoralCohortStudent.findMany({
      where: { doctoralStudentProfileId },
      select: { cohort: { select: { programId: true } } },
    });
    return [...new Set(memberships.map((m) => m.cohort.programId))];
  }
}
