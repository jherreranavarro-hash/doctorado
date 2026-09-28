import type {
  AssignmentStatus,
  AssignmentSubmissionStatus,
  DoctoralDifficulty,
  DoctoralExerciseType,
  ModuleEnrollmentStatus,
  ModuleExamStatus,
} from "../types";

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "Sin fecha";
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Sin fecha límite";
  return new Date(iso).toLocaleDateString("es-CL", { dateStyle: "medium" });
}

/** mm:ss a partir de un remanente en milisegundos (nunca negativo). */
export function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export const DIFFICULTY_LABEL: Record<DoctoralDifficulty, string> = {
  introductorio: "Introductorio",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
  experto: "Experto",
};

// Progresión sobria "simple → muy complejo" pedida por el encargo, con los
// tokens de color ya definidos en globals.css (sin inventar nuevos).
export const DIFFICULTY_COLOR: Record<DoctoralDifficulty, string> = {
  introductorio: "text-exito border-exito/40 bg-exito/15",
  intermedio: "text-alerta border-alerta/40 bg-alerta/15",
  avanzado: "text-gold border-gold/40 bg-gold/15",
  experto: "text-peligro border-peligro/40 bg-peligro/15",
};

export const EXERCISE_TYPE_LABEL: Record<DoctoralExerciseType, string> = {
  mc: "Selección múltiple",
  short_answer: "Respuesta corta",
  case_analysis: "Análisis de caso",
};

export const MODULE_STATUS_LABEL: Record<ModuleEnrollmentStatus, string> = {
  in_progress: "En curso",
  completed: "Completado",
  withdrawn: "Retirado",
};

export const MODULE_STATUS_COLOR: Record<ModuleEnrollmentStatus, string> = {
  in_progress: "text-azul2 border-azul2/40 bg-azul2/15",
  completed: "text-exito border-exito/40 bg-exito/15",
  withdrawn: "text-ink-suave border-borde bg-borde/50",
};

export const EXAM_STATUS_LABEL: Record<ModuleExamStatus, string> = {
  not_started: "Sin iniciar",
  in_progress: "En curso",
  passed: "Aprobado",
  failed: "No aprobado",
};

export const EXAM_STATUS_COLOR: Record<ModuleExamStatus, string> = {
  not_started: "text-ink-suave border-borde bg-borde/50",
  in_progress: "text-alerta border-alerta/40 bg-alerta/15",
  passed: "text-exito border-exito/40 bg-exito/15",
  failed: "text-peligro border-peligro/40 bg-peligro/15",
};

export const ASSIGNMENT_STATUS_LABEL: Record<AssignmentStatus, string> = {
  draft: "Borrador",
  published: "Publicada",
  closed: "Cerrada",
};

export const SUBMISSION_STATUS_LABEL: Record<AssignmentSubmissionStatus, string> = {
  not_started: "Sin empezar",
  draft: "En progreso",
  submitted: "Entregada",
  graded: "Calificada",
};

export const SUBMISSION_STATUS_COLOR: Record<AssignmentSubmissionStatus, string> = {
  not_started: "text-ink-suave border-borde bg-borde/50",
  draft: "text-alerta border-alerta/40 bg-alerta/15",
  submitted: "text-azul2 border-azul2/40 bg-azul2/15",
  graded: "text-exito border-exito/40 bg-exito/15",
};
