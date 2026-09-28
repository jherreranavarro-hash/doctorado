// Tipos de vista propios del portal docente — contratos confirmados leyendo
// apps/api/src/doctoral-analytics/{controller,service}.ts y
// apps/api/src/doctoral-assignments/{controller,service,dto/*}.ts, y
// verificados con curl contra la API real (cuenta demo del docente). No se
// agregan a src/lib/types.ts (compartido con los otros dos portales).

export interface DoctoralProgramRef {
  id: string;
  key: string;
  name: string;
}

/** GET /doctoral-analytics/me/cohorts */
export interface CohortSummary {
  cohortId: string;
  name: string;
  startYear: number;
  program: DoctoralProgramRef;
  studentCount: number;
}

export interface CompetencyRef {
  id: string;
  key: string;
  label: string;
}

export interface CohortHeatmapScore {
  competencyAreaId: string;
  score: number;
  sampleCount: number;
}

/** Un alumno siempre aparece aquí aunque `scores` venga vacío (sin datos
 * todavía) — nunca se sintetiza un 0. */
export interface CohortHeatmapStudent {
  doctoralStudentProfileId: string;
  displayName: string;
  scores: CohortHeatmapScore[];
}

/** GET /doctoral-analytics/cohorts/:cohortId/heatmap */
export interface CohortHeatmap {
  competencies: CompetencyRef[];
  students: CohortHeatmapStudent[];
}

/** Una competencia sin evidencia todavía llega con score/sampleCount null —
 * eso es "sin datos", nunca un 0. */
export interface StudentHeatmapCompetency {
  id: string;
  key: string;
  label: string;
  score: number | null;
  sampleCount: number | null;
}

/** GET /doctoral-analytics/students/:studentId/heatmap */
export interface StudentHeatmap {
  doctoralStudentProfileId: string;
  displayName: string;
  competencies: StudentHeatmapCompetency[];
}

export interface StudentReportCompetencyItem {
  key: string;
  label: string;
  score: number;
}

export type DoctoralModuleEnrollmentStatus =
  | "in_progress"
  | "completed"
  | "withdrawn";

export interface StudentReportModule {
  moduleId: string;
  title: string;
  status: DoctoralModuleEnrollmentStatus;
  examAttempted: boolean;
  bestExamScore: number | null;
  examPassed: boolean | null;
}

/** GET /doctoral-analytics/students/:studentId/report */
export interface StudentReport {
  doctoralStudentProfileId: string;
  displayName: string;
  weaknesses: StudentReportCompetencyItem[];
  strengths: StudentReportCompetencyItem[];
  modules: StudentReportModule[];
}

export interface CohortKpiCompetencyAverage {
  competencyAreaId: string;
  key: string;
  label: string;
  averageScore: number | null;
  studentsWithData: number;
}

export interface CohortKpiModuleStat {
  moduleId: string;
  title: string;
  enrolledCount: number;
  submittedAttemptCount: number;
  averageExamScore: number | null;
  passedCount: number;
  passRatePercent: number | null;
}

export interface CohortKpiModuleCompletion {
  in_progress: number;
  completed: number;
  withdrawn: number;
}

/** GET /doctoral-analytics/cohorts/:cohortId/kpis */
export interface CohortKpis {
  competencyAverages: CohortKpiCompetencyAverage[];
  moduleStats: CohortKpiModuleStat[];
  moduleCompletion: CohortKpiModuleCompletion;
}

export interface StudentExerciseAttempt {
  exerciseId: string;
  topicTitle: string;
  difficulty: string;
  attemptNumber: number;
  isCorrect: boolean | null;
  semanticScore: number | null;
  feedback: string | null;
  createdAt: string;
}

export interface StudentExamAttempt {
  examId: string;
  moduleTitle: string;
  score: number | null;
  passed: boolean | null;
  status: string;
  startedAt: string;
  submittedAt: string | null;
}

/** GET /doctoral-analytics/students/:studentId/attempts */
export interface StudentAttempts {
  exerciseAttempts: StudentExerciseAttempt[];
  examAttempts: StudentExamAttempt[];
}

// ---------------------------------------------------------------------------
// Tareas (doctoral-assignments)
// ---------------------------------------------------------------------------

export const ASSIGNMENT_QUESTION_TYPES = [
  "mc",
  "short_answer",
  "essay",
  "file_upload",
] as const;
export type AssignmentQuestionType = (typeof ASSIGNMENT_QUESTION_TYPES)[number];

export const ASSIGNMENT_STATUSES = ["draft", "published", "closed"] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export interface QuestionOption {
  key: string;
  text: string;
}

/** Cuerpo de una pregunta al crear una tarea (POST /doctoral-assignments). */
export interface AssignmentQuestionInput {
  order: number;
  type: AssignmentQuestionType;
  prompt: string;
  options?: QuestionOption[];
  correctOptionKey?: string;
  maxScore?: number;
}

/** Cuerpo de POST /doctoral-assignments. */
export interface CreateAssignmentBody {
  cohortId: string;
  moduleId?: string;
  title: string;
  instructions?: string;
  templateFileId?: string;
  dueAt?: string;
  questions: AssignmentQuestionInput[];
  targetStudentIds?: string[];
  targetGroupIds?: string[];
}

/** Cuerpo de PATCH /doctoral-assignments/:id. */
export interface UpdateAssignmentBody {
  title?: string;
  instructions?: string;
  moduleId?: string;
  templateFileId?: string;
  dueAt?: string;
  status?: AssignmentStatus;
}

/** Pregunta ya creada, tal como la devuelve el POST de creación
 * (serializeQuestionForProfessor) — no hay endpoint para volver a pedirla
 * después, así que esta forma solo está disponible justo tras crear. */
export interface CreatedAssignmentQuestion {
  questionId: string;
  order: number;
  type: AssignmentQuestionType;
  prompt: string;
  options?: QuestionOption[];
  correctOptionKey: string | null;
  maxScore: number;
}

/** Respuesta de POST /doctoral-assignments (creación) — incluye preguntas y
 * destinatarios, a diferencia del resumen de PATCH/listForCohort. */
export interface CreatedAssignment {
  assignmentId: string;
  cohortId: string;
  moduleId: string | null;
  title: string;
  instructions: string | null;
  templateFileId: string | null;
  dueAt: string | null;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt: string;
  targetStudentIds: string[];
  targetGroupIds: string[];
  questions: CreatedAssignmentQuestion[];
}

/** Respuesta de PATCH /doctoral-assignments/:id — solo el resumen (sin
 * preguntas/destinatarios). */
export interface AssignmentSummaryDetail {
  assignmentId: string;
  cohortId: string;
  moduleId: string | null;
  title: string;
  instructions: string | null;
  templateFileId: string | null;
  dueAt: string | null;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt: string;
}

/** Un ítem de GET /doctoral-assignments/cohorts/:cohortId — único lugar
 * donde el docente puede volver a leer título/estado/vencimiento de una
 * tarea ya creada (no hay GET /doctoral-assignments/:id). */
export interface AssignmentListItem {
  assignmentId: string;
  title: string;
  moduleId: string | null;
  dueAt: string | null;
  status: AssignmentStatus;
  createdAt: string;
  questionCount: number;
  targetStudentCount: number;
  targetGroupCount: number;
  submissionTotal: number;
  submissionGraded: number;
}

export type SubmissionStatus = "submitted" | "graded";

/** GET /doctoral-assignments/:id/submissions */
export interface SubmissionSummary {
  submissionId: string;
  studentProfileId: string;
  studentDisplayName: string;
  status: SubmissionStatus;
  fileId: string | null;
  submittedAt: string;
  gradedAt: string | null;
  totalScore: number | null;
}

export interface SubmissionAnswerDetail {
  questionId: string;
  order: number;
  type: AssignmentQuestionType;
  prompt: string;
  maxScore: number;
  correctOptionKey: string | null;
  responseText: string | null;
  selectedOptionKey: string | null;
  score: number | null;
  feedback: string | null;
}

/** GET /doctoral-assignments/:id/submissions/:submissionId */
export interface SubmissionDetail {
  submissionId: string;
  studentProfileId: string;
  studentDisplayName: string;
  status: SubmissionStatus;
  fileId: string | null;
  submittedAt: string;
  gradedAt: string | null;
  totalScore: number | null;
  feedback: string | null;
  answers: SubmissionAnswerDetail[];
}

/** Cuerpo de POST /doctoral-assignments/:id/submissions/:submissionId/grade. */
export interface GradeSubmissionBody {
  answers: { questionId: string; score: number; feedback?: string }[];
  feedback?: string;
}

/** GET/POST/PATCH de grupos de estudiantes (targeting grupal). */
export interface StudentGroup {
  groupId: string;
  cohortId: string;
  name: string;
  createdAt: string;
  studentIds: string[];
}

/** POST /doctoral-assignments/files → usado como templateFileId. */
export interface UploadedFile {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

// --- Syllabus (GET/POST/DELETE /program-modules) ---

export interface ModuleSyllabus {
  fileId: string;
  fileName: string;
  sizeBytes: number;
}

export interface ProgramModuleWithSyllabus {
  moduleId: string;
  title: string;
  order: number;
  semester: number;
  syllabus: ModuleSyllabus | null;
}
