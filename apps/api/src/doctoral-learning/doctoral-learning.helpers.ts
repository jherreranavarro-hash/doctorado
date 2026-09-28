import type { Prisma } from '@doctorado/db';
import type { PrismaService } from '../prisma/prisma.service.js';

/**
 * Include reutilizado por startExamAttempt/getExamAttempt/submitExam — nunca
 * trae DoctoralExamQuestion.modelAnswer ni DoctoralExamQuestionOption.isCorrect
 * salvo que el propio código de armado de la respuesta decida revelarlos
 * (solo cuando el intento ya está cerrado, ver buildExamAttemptView).
 */
export const EXAM_ATTEMPT_INCLUDE = {
  exam: {
    include: {
      questions: {
        orderBy: { order: 'asc' as const },
        include: {
          options: { orderBy: { order: 'asc' as const } },
        },
      },
    },
  },
  answers: true,
} satisfies Prisma.DoctoralExamAttemptInclude;

export type DoctoralExamAttemptWithDetails =
  Prisma.DoctoralExamAttemptGetPayload<{
    include: typeof EXAM_ATTEMPT_INCLUDE;
  }>;

interface ExamAnswerModelAnswer {
  keyPoints?: string[];
}

/**
 * Vista de un intento de examen para el propio alumno — "sin ayuda" mientras
 * está en curso (nunca isCorrect/correctOptionKey/modelAnswer), y con el
 * desglose completo una vez cerrado (submitted/expired). Mismo criterio que
 * TopicMasteryService.getAttempt (finished ? valor : null) — usado tanto por
 * GET exam-attempts/:id como por el resultado final de POST .../submit.
 */
export function buildExamAttemptView(attempt: DoctoralExamAttemptWithDetails) {
  const finished = attempt.status !== 'in_progress';
  const answersByQuestionId = new Map(
    attempt.answers.map((a) => [a.questionId, a]),
  );

  return {
    attemptId: attempt.id,
    examId: attempt.examId,
    moduleId: attempt.exam.moduleId,
    status: attempt.status,
    startedAt: attempt.startedAt,
    expiresAt: attempt.expiresAt,
    submittedAt: attempt.submittedAt,
    score: finished ? attempt.score : null,
    passed: finished ? attempt.passed : null,
    questionCount: attempt.exam.questions.length,
    questions: attempt.exam.questions.map((q) => {
      const answer = answersByQuestionId.get(q.id);
      const rubric = q.modelAnswer as ExamAnswerModelAnswer | null;
      return {
        questionId: q.id,
        order: q.order,
        type: q.type,
        statement: q.statement,
        scenario: q.scenario,
        options:
          q.type === 'mc'
            ? q.options.map((o) => ({ optionKey: o.optionKey, text: o.text }))
            : undefined,
        answered: Boolean(answer),
        yourAnswer: answer
          ? {
              selectedOptionKey: answer.selectedOptionKey,
              responseText: answer.responseText,
            }
          : null,
        // "prueba sin ayuda": nunca se revela corrección mientras está en curso.
        isCorrect: finished ? (answer?.isCorrect ?? null) : null,
        semanticScore: finished ? (answer?.semanticScore ?? null) : null,
        correctOptionKey:
          finished && q.type === 'mc'
            ? q.options.find((o) => o.isCorrect)?.optionKey
            : undefined,
        modelAnswer:
          finished && q.type !== 'mc'
            ? { keyPoints: rubric?.keyPoints ?? [] }
            : undefined,
      };
    }),
  };
}

/**
 * Cierra un intento de examen (entrega manual o vencimiento) y calcula su
 * nota final 10-70 con lo que alcanzó a responder — mismo patrón que
 * finalizeTopicMasteryAttempt: función pura reutilizada tanto por el barrido
 * de vencidos como por la entrega manual, para que el cálculo sea EXACTAMENTE
 * el mismo sin importar quién lo dispare. overallRatio promedia TODAS las
 * preguntas del examen (no solo las respondidas) — una pregunta sin
 * respuesta cuenta como 0, tal como pide el encargo.
 */
export async function finalizeDoctoralExamAttempt(
  tx: Prisma.TransactionClient,
  attemptId: string,
  status: 'submitted' | 'expired',
): Promise<void> {
  const attempt = await tx.doctoralExamAttempt.findUniqueOrThrow({
    where: { id: attemptId },
  });
  const exam = await tx.doctoralExam.findUniqueOrThrow({
    where: { id: attempt.examId },
  });
  const questions = await tx.doctoralExamQuestion.findMany({
    where: { examId: exam.id },
    select: { id: true, type: true },
  });
  const answers = await tx.doctoralExamAnswer.findMany({
    where: { attemptId },
    select: { questionId: true, isCorrect: true, semanticScore: true },
  });
  const answersByQuestionId = new Map(answers.map((a) => [a.questionId, a]));

  let ratioSum = 0;
  for (const question of questions) {
    const answer = answersByQuestionId.get(question.id);
    if (!answer) continue; // sin respuesta = 0, no se salta del promedio
    ratioSum +=
      question.type === 'mc'
        ? answer.isCorrect
          ? 1
          : 0
        : (answer.semanticScore ?? 0) / 100;
  }
  const overallRatio = questions.length > 0 ? ratioSum / questions.length : 0;
  const rawScore =
    exam.minScore + Math.round(overallRatio * (exam.maxScore - exam.minScore));
  const score = Math.max(exam.minScore, Math.min(exam.maxScore, rawScore));
  const passed = score >= exam.passScore;

  await tx.doctoralExamAttempt.update({
    where: { id: attemptId },
    data: { status, submittedAt: new Date(), score, passed },
  });
}

/**
 * Barrido perezoso — sin cron, mismo criterio que
 * finalizeExpiredTopicMasteryAttemptsIn: cierra cualquier intento de examen
 * vencido dentro del alcance dado ANTES de que una lectura pueda devolverlo
 * todavía "in_progress". Debe llamarse desde cualquier camino de lectura
 * (start/get/progress) para que un intento vencido nunca quede colgado solo
 * porque nadie volvió a abrir la pantalla.
 */
export async function finalizeExpiredDoctoralExamAttemptsIn(
  prisma: PrismaService,
  scope: Prisma.DoctoralExamAttemptWhereInput,
): Promise<void> {
  const expired = await prisma.doctoralExamAttempt.findMany({
    where: { ...scope, status: 'in_progress', expiresAt: { lte: new Date() } },
    select: { id: true },
  });
  for (const { id } of expired) {
    await prisma.$transaction((tx) =>
      finalizeDoctoralExamAttempt(tx, id, 'expired'),
    );
  }
}
