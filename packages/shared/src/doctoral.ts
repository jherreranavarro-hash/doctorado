// Literales del Dominio Doctorado — única fuente de verdad para los enums de
// packages/db/prisma/schema.prisma, los DTOs de apps/api (@IsIn) y los tipos
// de apps/web-doctorado. Mismo patrón que difficulty.ts/roles.ts: nunca
// redeclarar estos strings en otro paquete.

export const DOCTORAL_MODULE_TYPES = [
  "course",
  "workshop",
  "seminar",
  "tutoring",
  "elective",
  "thesis_project",
  "thesis",
  "qualifying_exam",
] as const;
export type DoctoralModuleType = (typeof DOCTORAL_MODULE_TYPES)[number];

// Progresión "simple → muy complejo" pedida por el encargo. Deliberadamente
// distinta de Difficulty (facil/medio/dificil) del dominio K-12.
export const DOCTORAL_DIFFICULTIES = [
  "introductorio",
  "intermedio",
  "avanzado",
  "experto",
] as const;
export type DoctoralDifficulty = (typeof DOCTORAL_DIFFICULTIES)[number];

export const DOCTORAL_EXERCISE_TYPES = ["mc", "short_answer", "case_analysis"] as const;
export type DoctoralExerciseType = (typeof DOCTORAL_EXERCISE_TYPES)[number];

export const DOCTORAL_MODULE_ENROLLMENT_STATUSES = [
  "in_progress",
  "completed",
  "withdrawn",
] as const;
export type DoctoralModuleEnrollmentStatus = (typeof DOCTORAL_MODULE_ENROLLMENT_STATUSES)[number];

export const DOCTORAL_EXAM_ATTEMPT_STATUSES = ["in_progress", "submitted", "expired"] as const;
export type DoctoralExamAttemptStatus = (typeof DOCTORAL_EXAM_ATTEMPT_STATUSES)[number];

export const DOCTORAL_SURVEY_QUESTION_TYPES = ["likert_1_5", "short_answer"] as const;
export type DoctoralSurveyQuestionType = (typeof DOCTORAL_SURVEY_QUESTION_TYPES)[number];

export const DOCTORAL_ASSIGNMENT_STATUSES = ["draft", "published", "closed"] as const;
export type DoctoralAssignmentStatus = (typeof DOCTORAL_ASSIGNMENT_STATUSES)[number];

export const DOCTORAL_ASSIGNMENT_QUESTION_TYPES = [
  "mc",
  "short_answer",
  "essay",
  "file_upload",
] as const;
export type DoctoralAssignmentQuestionType = (typeof DOCTORAL_ASSIGNMENT_QUESTION_TYPES)[number];

export const DOCTORAL_ASSIGNMENT_SUBMISSION_STATUSES = ["draft", "submitted", "graded"] as const;
export type DoctoralAssignmentSubmissionStatus =
  (typeof DOCTORAL_ASSIGNMENT_SUBMISSION_STATUSES)[number];

// Escala de nota del examen final de módulo ("prueba sin ayuda") — 10 mínimo,
// 70 máximo, pedida explícitamente por el encargo (no es la escala 1.0-7.0
// que usa TopicMasteryAttempt del lado K-12).
export const DOCTORAL_EXAM_MIN_SCORE = 10;
export const DOCTORAL_EXAM_MAX_SCORE = 70;

export const DOCTORAL_PROGRAM_KEYS = ["psicologia", "psicologia_salud_calidad_vida"] as const;
export type DoctoralProgramKey = (typeof DOCTORAL_PROGRAM_KEYS)[number];
