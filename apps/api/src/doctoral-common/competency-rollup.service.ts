import { Injectable } from '@nestjs/common';
import type { Prisma } from '@doctorado/db';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Rollup materializado del mapa de calor (DoctoralStudentCompetencyScore) —
 * patrón CourseProgress/PointsService.recomputeCourseProgress del lado K-12:
 * se recalcula desde cero (no incrementalmente) tras cada intento/respuesta
 * calificada, dentro de la MISMA transacción que produjo esa calificación.
 * A esta escala (decenas de intentos por alumno) un recálculo completo es
 * más simple y más correcto que mantener un acumulador incremental.
 */
@Injectable()
export class CompetencyRollupService {
  constructor(private readonly prisma: PrismaService) {}

  /** Guarda el resultado por competencia de UN intento de ejercicio de
   * práctica (mc: 100/0 determinístico; short_answer/case_analysis: score
   * semántico 0-100) y dispara el recálculo del rollup del alumno. Llamar
   * dentro de la transacción que creó el DoctoralExerciseAttempt. */
  async recordExerciseAttemptCompetencyResults(
    tx: Prisma.TransactionClient,
    params: {
      attemptId: string;
      exerciseId: string;
      doctoralStudentProfileId: string;
      scoreForThisAttempt: number;
    },
  ): Promise<void> {
    const weights = await tx.exerciseCompetencyWeight.findMany({
      where: { exerciseId: params.exerciseId },
      select: { competencyAreaId: true },
    });
    for (const w of weights) {
      await tx.doctoralAttemptCompetencyResult.upsert({
        where: {
          attemptId_competencyAreaId: {
            attemptId: params.attemptId,
            competencyAreaId: w.competencyAreaId,
          },
        },
        update: { score: params.scoreForThisAttempt },
        create: {
          attemptId: params.attemptId,
          competencyAreaId: w.competencyAreaId,
          score: params.scoreForThisAttempt,
        },
      });
    }
    if (weights.length > 0) {
      await this.recomputeForStudent(tx, params.doctoralStudentProfileId);
    }
  }

  /** Llamar dentro de la transacción que calificó una DoctoralExamAnswer —
   * el examen no tiene su propia tabla de resultados por competencia (a
   * diferencia de los ejercicios de práctica): el rollup lee directamente
   * DoctoralExamAnswer + DoctoralExamQuestionCompetencyWeight en
   * recomputeForStudent, así que aquí solo hace falta disparar el
   * recálculo. */
  async onExamAnswerGraded(
    tx: Prisma.TransactionClient,
    doctoralStudentProfileId: string,
  ): Promise<void> {
    await this.recomputeForStudent(tx, doctoralStudentProfileId);
  }

  /** Recalcula DoctoralStudentCompetencyScore para TODAS las competencias de
   * los programas en los que el alumno tiene cohorte, a partir de:
   * (a) DoctoralAttemptCompetencyResult (ejercicios de práctica), y
   * (b) DoctoralExamAnswer vía DoctoralExamQuestionCompetencyWeight (examen
   * final). Una competencia sin ninguna evidencia todavía no se toca (no se
   * crea una fila en 0), para no ensuciar el mapa de calor con "debilidades"
   * que en realidad son "todavía sin datos". */
  async recomputeForStudent(
    tx: Prisma.TransactionClient,
    doctoralStudentProfileId: string,
  ): Promise<void> {
    const cohortMemberships = await tx.doctoralCohortStudent.findMany({
      where: { doctoralStudentProfileId },
      select: { cohort: { select: { programId: true } } },
    });
    const programIds = [
      ...new Set(cohortMemberships.map((c) => c.cohort.programId)),
    ];
    if (programIds.length === 0) return;

    const competencies = await tx.competencyArea.findMany({
      where: { programId: { in: programIds } },
      select: { id: true },
    });

    for (const competency of competencies) {
      const exerciseResults = await tx.doctoralAttemptCompetencyResult.findMany(
        {
          where: {
            competencyAreaId: competency.id,
            attempt: { doctoralStudentProfileId },
          },
          select: { score: true },
        },
      );

      const examWeights =
        await tx.doctoralExamQuestionCompetencyWeight.findMany({
          where: { competencyAreaId: competency.id },
          select: { questionId: true },
        });
      const questionIds = examWeights.map((w) => w.questionId);
      const examAnswers = questionIds.length
        ? await tx.doctoralExamAnswer.findMany({
            where: {
              questionId: { in: questionIds },
              attempt: { doctoralStudentProfileId },
            },
            select: { isCorrect: true, semanticScore: true },
          })
        : [];
      const examScores = examAnswers.map(
        (a) => a.semanticScore ?? (a.isCorrect ? 100 : 0),
      );

      const allScores = [...exerciseResults.map((r) => r.score), ...examScores];
      if (allScores.length === 0) continue;

      const average =
        allScores.reduce((sum, s) => sum + s, 0) / allScores.length;
      await tx.doctoralStudentCompetencyScore.upsert({
        where: {
          doctoralStudentProfileId_competencyAreaId: {
            doctoralStudentProfileId,
            competencyAreaId: competency.id,
          },
        },
        update: { score: average, sampleCount: allScores.length },
        create: {
          doctoralStudentProfileId,
          competencyAreaId: competency.id,
          score: average,
          sampleCount: allScores.length,
        },
      });
    }
  }
}
