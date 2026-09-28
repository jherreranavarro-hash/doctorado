import type { DoctoralModuleEnrollmentStatus, DoctoralModuleType } from "@doctorado/shared";
import type { AccountStatus } from "../types";

export const MODULE_TYPE_LABELS: Record<DoctoralModuleType, string> = {
  course: "Curso",
  workshop: "Taller",
  seminar: "Seminario",
  tutoring: "Tutoría",
  elective: "Electivo",
  thesis_project: "Proyecto de tesis",
  thesis: "Tesis",
  qualifying_exam: "Examen de calificación",
};

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  active: "Activo",
  suspended: "Suspendido",
  pending: "Pendiente",
};

export const MODULE_ENROLLMENT_STATUS_LABELS: Record<DoctoralModuleEnrollmentStatus, string> = {
  in_progress: "En curso",
  completed: "Completado",
  withdrawn: "Retirado",
};
