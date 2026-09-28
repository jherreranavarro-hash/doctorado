// Tipos de vista del portal estudiante — modelados 1:1 contra las formas
// reales que devuelve apps/api (ver DoctoralLearningService/helpers.ts y
// DoctoralAssignmentsService), no contra una paráfrasis. Confirmados con
// curl contra la API local antes de escribir cualquier página.

export type DoctoralDifficulty = "introductorio" | "intermedio" | "avanzado" | "experto";

// DoctoralExamQuestion reutiliza el mismo enum que DoctoralExercise (ver schema.prisma).
export type DoctoralExerciseType = "mc" | "short_answer" | "case_analysis";

export type ModuleEnrollmentStatus = "in_progress" | "completed" | "withdrawn";

export type ExamAttemptStatus = "in_progress" | "submitted" | "expired";

export type SurveyQuestionType = "likert_1_5" | "short_answer";

export type AssignmentStatus = "draft" | "published" | "closed";

export type AssignmentQuestionType = "mc" | "short_answer" | "essay" | "file_upload";

export type AssignmentSubmissionStatus = "not_started" | "draft" | "submitted" | "graded";

export type ModuleExamStatus = "not_started" | "in_progress" | "passed" | "failed";

// --- GET /doctoral-learning/modules ---
export interface EnrolledModuleSummary {
  moduleId: string;
  title: string;
  programName: string;
  semester: number;
  credits: number;
  status: ModuleEnrollmentStatus;
  hasExam: boolean;
  hasSurvey: boolean;
  topicsCount: number;
  exercisesTotal: number;
  exercisesAttempted: number;
}

// --- GET /doctoral-learning/me/progress ---
export interface ModuleProgress {
  moduleId: string;
  title: string;
  exercisesAttempted: number;
  exercisesTotal: number;
  examStatus: ModuleExamStatus;
  bestExamScore: number | null;
  surveySubmitted: boolean;
}

// --- GET /doctoral-learning/modules/:moduleId ---
export interface ExerciseOption {
  optionKey: string;
  text: string;
}

export interface ModuleExercise {
  id: string;
  key: string;
  type: DoctoralExerciseType;
  difficulty: DoctoralDifficulty;
  order: number;
  scenario: string | null;
  statement: string;
  options?: ExerciseOption[];
  attempted: boolean;
  lastIsCorrect: boolean | null;
  lastSemanticScore: number | null;
}

export interface ModuleConceptContent {
  summary: string;
  body: string;
  keyIdeas: string[];
}

export interface ModuleTopic {
  topicId: string;
  key: string;
  title: string;
  order: number;
  conceptContent: ModuleConceptContent | null;
  exercises: ModuleExercise[];
}

export interface ModuleDetail {
  moduleId: string;
  title: string;
  topics: ModuleTopic[];
  examAvailable: boolean;
  surveyAvailable: boolean;
  surveySubmitted: boolean;
}

// --- GET /doctoral-learning/exercises/:exerciseId/hints ---
export interface ExerciseHint {
  order: number;
  text: string;
}

export interface ExerciseHintsResponse {
  exerciseId: string;
  hints: ExerciseHint[];
}

// --- POST /doctoral-learning/exercises/:exerciseId/attempts ---
export interface ExerciseAttemptResult {
  isCorrect: boolean;
  semanticScore: number | null;
  feedback: string;
  correctOptionKey?: string;
}

// --- exam-attempts (start / get / answers / submit) ---
export interface ExamQuestionOption {
  optionKey: string;
  text: string;
}

export interface ExamAnswerEcho {
  selectedOptionKey: string | null;
  responseText: string | null;
}

export interface ExamModelAnswer {
  keyPoints: string[];
}

export interface ExamQuestionView {
  questionId: string;
  order: number;
  type: DoctoralExerciseType;
  statement: string;
  scenario: string | null;
  options?: ExamQuestionOption[];
  answered: boolean;
  yourAnswer: ExamAnswerEcho | null;
  isCorrect: boolean | null;
  semanticScore: number | null;
  correctOptionKey?: string;
  modelAnswer?: ExamModelAnswer;
}

// Vista compartida por start/get/submit (buildExamAttemptView en el backend).
export interface ExamAttemptView {
  attemptId: string;
  examId: string;
  moduleId: string;
  status: ExamAttemptStatus;
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
  score: number | null;
  passed: boolean | null;
  questionCount: number;
  questions: ExamQuestionView[];
}

export interface SubmitExamAnswerResult {
  answered: true;
  questionId: string;
  answeredCount: number;
  totalCount: number;
}

// --- encuesta de cierre de módulo ---
export interface SurveyQuestionView {
  questionId: string;
  order: number;
  type: SurveyQuestionType;
  prompt: string;
}

export interface ModuleSurvey {
  surveyId: string;
  moduleId: string;
  title: string;
  alreadySubmitted: boolean;
  submittedAt: string | null;
  questions: SurveyQuestionView[];
}

export interface SurveySubmitResult {
  submitted: true;
  responseId: string;
  answeredCount: number;
}

// --- GET /doctoral-assignments/me ---
export interface AssignmentListEntry {
  assignmentId: string;
  title: string;
  cohortId: string;
  cohortName: string;
  moduleId: string | null;
  moduleTitle: string | null;
  dueAt: string | null;
  status: AssignmentStatus;
  questionCount: number;
  submissionStatus: AssignmentSubmissionStatus;
  totalScore: number | null;
}

// --- GET /doctoral-assignments/me/:id ---
export interface AssignmentQuestionOption {
  key: string;
  text: string;
}

export interface AssignmentQuestionView {
  questionId: string;
  order: number;
  type: AssignmentQuestionType;
  prompt: string;
  options?: AssignmentQuestionOption[];
  maxScore: number;
  responseText?: string;
  selectedOptionKey?: string;
  score?: number;
  feedback?: string;
}

export interface AssignmentDetail {
  assignmentId: string;
  title: string;
  instructions: string | null;
  templateFileId: string | null;
  dueAt: string | null;
  status: AssignmentStatus;
  submissionStatus: AssignmentSubmissionStatus;
  submissionFileId: string | null;
  totalScore: number | null;
  feedback: string | null;
  questions: AssignmentQuestionView[];
}

// --- POST /doctoral-assignments/me/files ---
export interface UploadedFileResult {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}
