import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma } from '@doctorado/db';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  assertStudentEnrolledInModule,
  resolveDoctoralStudentProfile,
} from '../doctoral-common/doctoral-common.helpers.js';
import {
  SemanticGradingService,
  type SemanticRubric,
} from '../doctoral-common/semantic-grading.service.js';
import { CompetencyRollupService } from '../doctoral-common/competency-rollup.service.js';
import { SubmitExerciseAttemptDto } from './dto/submit-exercise-attempt.dto.js';
import { SubmitExamAnswerDto } from './dto/submit-exam-answer.dto.js';
import { SubmitSurveyResponsesDto } from './dto/submit-survey-responses.dto.js';
import {
  EXAM_ATTEMPT_INCLUDE,
  buildExamAttemptView,
  finalizeDoctoralExamAttempt,
  finalizeExpiredDoctoralExamAttemptsIn,
} from './doctoral-learning.helpers.js';

const PRISMA_UNIQUE_VIOLATION = 'P2002';

/**
 * Superficie del propio estudiante de doctorado — "estudiar": explorar los
 * módulos en los que está inscrito, leer el modelo conceptual, practicar
 * ejercicios con pistas progresivas (reintentos ilimitados), rendir la
 * prueba final sin ayuda, responder la encuesta de cierre y ver su propio
 * progreso. Nunca recibe un doctoralStudentProfileId del cliente — se
 * resuelve internamente en cada método vía resolveDoctoralStudentProfile
 * (mismo criterio que PracticeService/TopicMasteryService del lado K-12).
 */
@Injectable()
export class DoctoralLearningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly semanticGrading: SemanticGradingService,
    private readonly competencyRollup: CompetencyRollupService,
  ) {}

  // --- 1. Mapa de curso: módulos en los que el alumno está inscrito ---

  async listEnrolledModules(userId: string) {
    const student = await resolveDoctoralStudentProfile(this.prisma, userId);

    const enrollments = await this.prisma.doctoralModuleEnrollment.findMany({
      where: { doctoralStudentProfileId: student.id },
      orderBy: { module: { order: 'asc' } },
      include: {
        module: {
          include: {
            program: { select: { name: true } },
            topics: {
              select: {
                exercises: {
                  where: { status: 'published' },
                  select: { id: true },
                },
              },
            },
            exam: { select: { id: true } },
            survey: { select: { id: true } },
          },
        },
      },
    });

    const allExerciseIds = enrollments.flatMap((e) =>
      e.module.topics.flatMap((t) => t.exercises.map((ex) => ex.id)),
    );
    const attemptedSet = await this.attemptedExerciseIdSet(
      student.id,
      allExerciseIds,
    );

    return enrollments.map((e) => {
      const exerciseIds = e.module.topics.flatMap((t) =>
        t.exercises.map((ex) => ex.id),
      );
      return {
        moduleId: e.module.id,
        title: e.module.title,
        programName: e.module.program.name,
        semester: e.module.semester,
        credits: e.module.credits,
        status: e.status,
        hasExam: e.module.exam !== null,
        hasSurvey: e.module.survey !== null,
        topicsCount: e.module.topics.length,
        exercisesTotal: exerciseIds.length,
        exercisesAttempted: exerciseIds.filter((id) => attemptedSet.has(id))
          .length,
      };
    });
  }

  // --- 2. Contenido de un módulo: temas + material conceptual + ejercicios ---

  async getModuleDetail(userId: string, moduleId: string) {
    const student = await resolveDoctoralStudentProfile(this.prisma, userId);
    await assertStudentEnrolledInModule(this.prisma, student.id, moduleId);

    const module = await this.prisma.programModule.findUnique({
      where: { id: moduleId },
      include: {
        topics: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
          include: {
            conceptContent: true,
            exercises: {
              where: { status: 'published' },
              orderBy: { order: 'asc' },
              include: { options: { orderBy: { order: 'asc' } } },
            },
          },
        },
        exam: { select: { id: true } },
        survey: { select: { id: true } },
      },
    });
    if (!module) {
      throw new NotFoundException('Módulo no encontrado');
    }

    const exerciseIds = module.topics.flatMap((t) =>
      t.exercises.map((ex) => ex.id),
    );
    const lastAttemptByExercise = await this.lastAttemptOutcomeByExercise(
      student.id,
      exerciseIds,
    );

    let surveySubmitted = false;
    if (module.survey) {
      const response =
        await this.prisma.doctoralModuleSurveyResponse.findUnique({
          where: {
            surveyId_doctoralStudentProfileId: {
              surveyId: module.survey.id,
              doctoralStudentProfileId: student.id,
            },
          },
          select: { id: true },
        });
      surveySubmitted = response !== null;
    }

    return {
      moduleId: module.id,
      title: module.title,
      topics: module.topics.map((t) => ({
        topicId: t.id,
        key: t.key,
        title: t.title,
        order: t.order,
        conceptContent:
          t.conceptContent && t.conceptContent.status === 'published'
            ? {
                summary: t.conceptContent.summary,
                body: t.conceptContent.body,
                keyIdeas: t.conceptContent.keyIdeas as string[],
              }
            : null,
        exercises: t.exercises.map((ex) => {
          const last = lastAttemptByExercise.get(ex.id) ?? null;
          return {
            id: ex.id,
            key: ex.key,
            type: ex.type,
            difficulty: ex.difficulty,
            order: ex.order,
            scenario: ex.scenario,
            statement: ex.statement,
            options:
              ex.type === 'mc'
                ? ex.options.map((o) => ({
                    optionKey: o.optionKey,
                    text: o.text,
                  }))
                : undefined,
            attempted: last !== null,
            lastIsCorrect: last ? last.isCorrect : null,
            lastSemanticScore: last ? last.semanticScore : null,
          };
        }),
      })),
      examAvailable: module.exam !== null,
      surveyAvailable: module.survey !== null,
      surveySubmitted,
    };
  }

  // --- 3. Pistas de un ejercicio (progresivas, no son un límite de seguridad) ---

  async getExerciseHints(userId: string, exerciseId: string) {
    const student = await resolveDoctoralStudentProfile(this.prisma, userId);

    const exercise = await this.prisma.doctoralExercise.findUnique({
      where: { id: exerciseId },
      include: {
        topic: { select: { moduleId: true } },
        hints: { orderBy: { order: 'asc' } },
      },
    });
    if (!exercise) {
      throw new NotFoundException('Ejercicio no encontrado');
    }
    await assertStudentEnrolledInModule(
      this.prisma,
      student.id,
      exercise.topic.moduleId,
    );

    return {
      exerciseId: exercise.id,
      hints: exercise.hints.map((h) => ({ order: h.order, text: h.text })),
    };
  }

  // --- 4. Intento de práctica sobre un ejercicio (reintentos ilimitados) ---

  async submitExerciseAttempt(
    userId: string,
    exerciseId: string,
    dto: SubmitExerciseAttemptDto,
  ) {
    const student = await resolveDoctoralStudentProfile(this.prisma, userId);

    const exercise = await this.prisma.doctoralExercise.findUnique({
      where: { id: exerciseId },
      include: {
        topic: { select: { moduleId: true } },
        options: true,
      },
    });
    if (!exercise) {
      throw new NotFoundException('Ejercicio no encontrado');
    }
    await assertStudentEnrolledInModule(
      this.prisma,
      student.id,
      exercise.topic.moduleId,
    );

    return this.prisma.$transaction(async (tx) => {
      let isCorrect: boolean;
      let semanticScore: number | null = null;
      let feedback: string;
      let correctOptionKey: string | undefined;

      if (exercise.type === 'mc') {
        // Nunca se confía en un flag "correcto" del cliente — se compara
        // server-side contra DoctoralExerciseOption.isCorrect.
        isCorrect = exercise.options.some(
          (o) => o.optionKey === dto.selectedOptionKey && o.isCorrect,
        );
        correctOptionKey = exercise.options.find((o) => o.isCorrect)?.optionKey;
        feedback = isCorrect
          ? 'Respuesta correcta.'
          : 'Respuesta incorrecta. Revisa el modelo conceptual del tema e inténtalo de nuevo.';
      } else {
        const rubric = exercise.modelAnswer as SemanticRubric | null;
        const graded = this.semanticGrading.gradeFreeText(
          dto.responseText,
          rubric,
        );
        isCorrect = graded.passed;
        semanticScore = graded.score;
        feedback = graded.feedback;
      }

      const priorAttemptCount = await tx.doctoralExerciseAttempt.count({
        where: {
          doctoralStudentProfileId: student.id,
          exerciseId: exercise.id,
        },
      });

      const attempt = await tx.doctoralExerciseAttempt.create({
        data: {
          doctoralStudentProfileId: student.id,
          exerciseId: exercise.id,
          attemptNumber: priorAttemptCount + 1,
          hintsUsed: dto.hintsUsed ?? 0,
          responseText: dto.responseText ?? null,
          selectedOptionKey: dto.selectedOptionKey ?? null,
          isCorrect,
          semanticScore,
          feedback,
        },
      });

      await this.competencyRollup.recordExerciseAttemptCompetencyResults(tx, {
        attemptId: attempt.id,
        exerciseId: exercise.id,
        doctoralStudentProfileId: student.id,
        scoreForThisAttempt:
          exercise.type === 'mc' ? (isCorrect ? 100 : 0) : (semanticScore ?? 0),
      });

      return {
        isCorrect,
        semanticScore,
        feedback,
        // Reintentos ilimitados en práctica = revelar la alternativa correcta
        // no es una fuga de seguridad, es lo que hace que sea un apoyo de
        // aprendizaje real (a diferencia del examen, ver endpoint 7-8).
        correctOptionKey: exercise.type === 'mc' ? correctOptionKey : undefined,
      };
    });
  }

  // --- 5. Iniciar (o retomar) el intento del examen final del módulo ---

  async startExamAttempt(userId: string, moduleId: string) {
    const student = await resolveDoctoralStudentProfile(this.prisma, userId);
    await assertStudentEnrolledInModule(this.prisma, student.id, moduleId);

    const exam = await this.prisma.doctoralExam.findUnique({
      where: { moduleId },
    });
    if (!exam) {
      throw new NotFoundException(
        'Este módulo todavía no tiene examen final configurado',
      );
    }

    await finalizeExpiredDoctoralExamAttemptsIn(this.prisma, {
      doctoralStudentProfileId: student.id,
      examId: exam.id,
    });

    // Intento vigente sin cerrar se retoma en vez de crear uno nuevo — así
    // cerrar la pestaña y volver no resetea el cronómetro (mismo criterio
    // que TopicMasteryService.startAttempt).
    const existing = await this.prisma.doctoralExamAttempt.findFirst({
      where: {
        doctoralStudentProfileId: student.id,
        examId: exam.id,
        status: 'in_progress',
      },
    });
    if (existing) {
      return this.getExamAttempt(userId, existing.id);
    }

    const seed = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + exam.timeLimitMinutes * 60_000);
    const created = await this.prisma.doctoralExamAttempt.create({
      data: {
        doctoralStudentProfileId: student.id,
        examId: exam.id,
        seed,
        expiresAt,
        status: 'in_progress',
      },
    });

    return this.getExamAttempt(userId, created.id);
  }

  // --- 6. Estado actual de un intento de examen (para reanudar) ---

  async getExamAttempt(userId: string, attemptId: string) {
    const student = await resolveDoctoralStudentProfile(this.prisma, userId);
    await finalizeExpiredDoctoralExamAttemptsIn(this.prisma, { id: attemptId });

    const attempt = await this.prisma.doctoralExamAttempt.findFirst({
      where: { id: attemptId, doctoralStudentProfileId: student.id },
      include: EXAM_ATTEMPT_INCLUDE,
    });
    if (!attempt) {
      throw new NotFoundException('Intento de examen no encontrado');
    }

    return buildExamAttemptView(attempt);
  }

  // --- 7. Responder UNA pregunta del examen (sin revelar corrección) ---

  async submitExamAnswer(
    userId: string,
    attemptId: string,
    dto: SubmitExamAnswerDto,
  ) {
    const student = await resolveDoctoralStudentProfile(this.prisma, userId);

    return this.prisma.$transaction(async (tx) => {
      const attempt = await tx.doctoralExamAttempt.findFirst({
        where: { id: attemptId, doctoralStudentProfileId: student.id },
      });
      if (!attempt) {
        throw new NotFoundException('Intento de examen no encontrado');
      }
      if (attempt.status === 'expired') {
        throw new ConflictException('El tiempo de este examen ya terminó');
      }
      if (attempt.status === 'submitted') {
        throw new ConflictException('Este examen ya fue entregado');
      }
      if (new Date() >= attempt.expiresAt) {
        await finalizeDoctoralExamAttempt(tx, attempt.id, 'expired');
        throw new ConflictException('El tiempo de este examen ya terminó');
      }

      const question = await tx.doctoralExamQuestion.findFirst({
        where: { id: dto.questionId, examId: attempt.examId },
        include: { options: true },
      });
      if (!question) {
        throw new NotFoundException(
          'Esta pregunta no pertenece al examen de este intento',
        );
      }

      let isCorrect: boolean | null = null;
      let semanticScore: number | null = null;
      if (question.type === 'mc') {
        // Corrección determinística server-side — nunca se confía en un
        // flag del cliente.
        isCorrect = question.options.some(
          (o) => o.optionKey === dto.selectedOptionKey && o.isCorrect,
        );
      } else {
        const rubric = question.modelAnswer as SemanticRubric | null;
        const graded = this.semanticGrading.gradeFreeText(
          dto.responseText,
          rubric,
        );
        isCorrect = graded.passed;
        semanticScore = graded.score;
      }

      await tx.doctoralExamAnswer.upsert({
        where: {
          attemptId_questionId: {
            attemptId: attempt.id,
            questionId: question.id,
          },
        },
        update: {
          selectedOptionKey: dto.selectedOptionKey ?? null,
          responseText: dto.responseText ?? null,
          isCorrect,
          semanticScore,
        },
        create: {
          attemptId: attempt.id,
          questionId: question.id,
          selectedOptionKey: dto.selectedOptionKey ?? null,
          responseText: dto.responseText ?? null,
          isCorrect,
          semanticScore,
        },
      });

      await this.competencyRollup.onExamAnswerGraded(tx, student.id);

      const [answeredCount, totalCount] = await Promise.all([
        tx.doctoralExamAnswer.count({ where: { attemptId: attempt.id } }),
        tx.doctoralExamQuestion.count({ where: { examId: attempt.examId } }),
      ]);

      // "Prueba sin ayuda": nunca se revela isCorrect/semanticScore acá —
      // recién se muestra al entregar el examen completo (ver submitExam).
      return {
        answered: true,
        questionId: question.id,
        answeredCount,
        totalCount,
      };
    });
  }

  // --- 8. Entregar el examen y calcular la nota final (10-70) ---

  async submitExam(userId: string, attemptId: string) {
    const student = await resolveDoctoralStudentProfile(this.prisma, userId);

    await this.prisma.$transaction(async (tx) => {
      const attempt = await tx.doctoralExamAttempt.findFirst({
        where: { id: attemptId, doctoralStudentProfileId: student.id },
      });
      if (!attempt) {
        throw new NotFoundException('Intento de examen no encontrado');
      }
      if (attempt.status !== 'in_progress') return; // ya cerrado — idempotente
      await finalizeDoctoralExamAttempt(tx, attempt.id, 'submitted');
    });

    return this.getExamAttempt(userId, attemptId);
  }

  // --- 9. Encuesta de cierre de módulo ---

  async getModuleSurvey(userId: string, moduleId: string) {
    const student = await resolveDoctoralStudentProfile(this.prisma, userId);
    await assertStudentEnrolledInModule(this.prisma, student.id, moduleId);

    const survey = await this.prisma.doctoralModuleSurvey.findUnique({
      where: { moduleId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!survey) {
      throw new NotFoundException(
        'Este módulo no tiene encuesta de cierre configurada',
      );
    }

    const existingResponse =
      await this.prisma.doctoralModuleSurveyResponse.findUnique({
        where: {
          surveyId_doctoralStudentProfileId: {
            surveyId: survey.id,
            doctoralStudentProfileId: student.id,
          },
        },
        select: { id: true, submittedAt: true },
      });

    return {
      surveyId: survey.id,
      moduleId,
      title: survey.title,
      // Ya respondida = estado amigable en vez de error, para que el
      // frontend pueda mostrar "ya completaste esta encuesta" en vez de un 4xx.
      alreadySubmitted: existingResponse !== null,
      submittedAt: existingResponse?.submittedAt ?? null,
      questions: survey.questions.map((q) => ({
        questionId: q.id,
        order: q.order,
        type: q.type,
        prompt: q.prompt,
      })),
    };
  }

  async submitModuleSurvey(
    userId: string,
    moduleId: string,
    dto: SubmitSurveyResponsesDto,
  ) {
    const student = await resolveDoctoralStudentProfile(this.prisma, userId);
    await assertStudentEnrolledInModule(this.prisma, student.id, moduleId);

    const survey = await this.prisma.doctoralModuleSurvey.findUnique({
      where: { moduleId },
      include: { questions: { select: { id: true } } },
    });
    if (!survey) {
      throw new NotFoundException(
        'Este módulo no tiene encuesta de cierre configurada',
      );
    }

    const existing = await this.prisma.doctoralModuleSurveyResponse.findUnique({
      where: {
        surveyId_doctoralStudentProfileId: {
          surveyId: survey.id,
          doctoralStudentProfileId: student.id,
        },
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Ya respondiste la encuesta de este módulo');
    }

    const validQuestionIds = new Set(survey.questions.map((q) => q.id));
    const validAnswers = dto.answers.filter((a) =>
      validQuestionIds.has(a.questionId),
    );
    if (validAnswers.length === 0) {
      throw new BadRequestException(
        'Debes responder al menos una pregunta de la encuesta',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const response = await tx.doctoralModuleSurveyResponse.create({
          data: { surveyId: survey.id, doctoralStudentProfileId: student.id },
        });
        await tx.doctoralSurveyAnswer.createMany({
          data: validAnswers.map((a) => ({
            responseId: response.id,
            questionId: a.questionId,
            likertValue: a.likertValue ?? null,
            textValue: a.textValue ?? null,
          })),
        });
        return {
          submitted: true,
          responseId: response.id,
          answeredCount: validAnswers.length,
        };
      });
    } catch (err) {
      // Backstop de defensa en profundidad: el índice único
      // [surveyId, doctoralStudentProfileId] ya existe en la base de datos
      // (ver schema) — esto solo cubre la carrera entre el findUnique de
      // arriba y este create, no reemplaza esa restricción.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === PRISMA_UNIQUE_VIOLATION
      ) {
        throw new ConflictException(
          'Ya respondiste la encuesta de este módulo',
        );
      }
      throw err;
    }
  }

  // --- 11. Panel de control del propio alumno (métricas de avance) ---

  async getMyProgress(userId: string) {
    const student = await resolveDoctoralStudentProfile(this.prisma, userId);

    const enrollments = await this.prisma.doctoralModuleEnrollment.findMany({
      where: { doctoralStudentProfileId: student.id },
      orderBy: { module: { order: 'asc' } },
      include: {
        module: {
          include: {
            topics: {
              select: {
                exercises: {
                  where: { status: 'published' },
                  select: { id: true },
                },
              },
            },
            exam: { select: { id: true } },
            survey: { select: { id: true } },
          },
        },
      },
    });

    const examIds = enrollments
      .map((e) => e.module.exam?.id)
      .filter((id): id is string => Boolean(id));
    if (examIds.length > 0) {
      await finalizeExpiredDoctoralExamAttemptsIn(this.prisma, {
        doctoralStudentProfileId: student.id,
        examId: { in: examIds },
      });
    }

    const allExerciseIds = enrollments.flatMap((e) =>
      e.module.topics.flatMap((t) => t.exercises.map((ex) => ex.id)),
    );
    const attemptedSet = await this.attemptedExerciseIdSet(
      student.id,
      allExerciseIds,
    );

    const examAttemptsByExamId = new Map<
      string,
      Array<{ status: string; score: number | null; passed: boolean | null }>
    >();
    if (examIds.length > 0) {
      const attempts = await this.prisma.doctoralExamAttempt.findMany({
        where: {
          doctoralStudentProfileId: student.id,
          examId: { in: examIds },
        },
        select: { examId: true, status: true, score: true, passed: true },
      });
      for (const a of attempts) {
        const list = examAttemptsByExamId.get(a.examId) ?? [];
        list.push(a);
        examAttemptsByExamId.set(a.examId, list);
      }
    }

    const surveyIds = enrollments
      .map((e) => e.module.survey?.id)
      .filter((id): id is string => Boolean(id));
    const submittedSurveySet = new Set<string>();
    if (surveyIds.length > 0) {
      const responses = await this.prisma.doctoralModuleSurveyResponse.findMany(
        {
          where: {
            doctoralStudentProfileId: student.id,
            surveyId: { in: surveyIds },
          },
          select: { surveyId: true },
        },
      );
      for (const r of responses) submittedSurveySet.add(r.surveyId);
    }

    return enrollments.map((e) => {
      const exerciseIds = e.module.topics.flatMap((t) =>
        t.exercises.map((ex) => ex.id),
      );
      const exercisesAttempted = exerciseIds.filter((id) =>
        attemptedSet.has(id),
      ).length;

      let examStatus: 'not_started' | 'in_progress' | 'passed' | 'failed' =
        'not_started';
      let bestExamScore: number | null = null;
      if (e.module.exam) {
        const attempts = examAttemptsByExamId.get(e.module.exam.id) ?? [];
        const finished = attempts.filter(
          (a) => a.status !== 'in_progress' && a.score !== null,
        );
        if (finished.length > 0) {
          bestExamScore = Math.max(...finished.map((a) => a.score as number));
        }
        const anyPassed = finished.some((a) => a.passed === true);
        const hasInProgress = attempts.some((a) => a.status === 'in_progress');
        // Una vez aprobado, ese sigue siendo el estado del módulo aunque el
        // alumno haya abierto un nuevo intento después (no tiene sentido
        // volver a mostrar "en curso" para un requisito ya cumplido).
        if (anyPassed) examStatus = 'passed';
        else if (hasInProgress) examStatus = 'in_progress';
        else if (finished.length > 0) examStatus = 'failed';
      }

      return {
        moduleId: e.module.id,
        title: e.module.title,
        exercisesAttempted,
        exercisesTotal: exerciseIds.length,
        examStatus,
        bestExamScore,
        surveySubmitted: e.module.survey
          ? submittedSurveySet.has(e.module.survey.id)
          : false,
      };
    });
  }

  // --- Helpers privados compartidos entre endpoints ---

  private async attemptedExerciseIdSet(
    doctoralStudentProfileId: string,
    exerciseIds: string[],
  ): Promise<Set<string>> {
    if (exerciseIds.length === 0) return new Set();
    const rows = await this.prisma.doctoralExerciseAttempt.findMany({
      where: { doctoralStudentProfileId, exerciseId: { in: exerciseIds } },
      select: { exerciseId: true },
      distinct: ['exerciseId'],
    });
    return new Set(rows.map((r) => r.exerciseId));
  }

  /** Último intento (por fecha) de cada ejercicio — seguro de revelar: es la
   * propia evolución del alumno en un ejercicio de reintentos ilimitados. */
  private async lastAttemptOutcomeByExercise(
    doctoralStudentProfileId: string,
    exerciseIds: string[],
  ): Promise<
    Map<string, { isCorrect: boolean | null; semanticScore: number | null }>
  > {
    const result = new Map<
      string,
      { isCorrect: boolean | null; semanticScore: number | null }
    >();
    if (exerciseIds.length === 0) return result;
    const attempts = await this.prisma.doctoralExerciseAttempt.findMany({
      where: { doctoralStudentProfileId, exerciseId: { in: exerciseIds } },
      orderBy: { createdAt: 'asc' },
      select: { exerciseId: true, isCorrect: true, semanticScore: true },
    });
    // Orden ascendente + sobrescritura: la última escritura por
    // exerciseId queda siendo el intento más reciente.
    for (const a of attempts) {
      result.set(a.exerciseId, {
        isCorrect: a.isCorrect,
        semanticScore: a.semanticScore,
      });
    }
    return result;
  }
}
