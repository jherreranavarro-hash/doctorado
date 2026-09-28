import { apiFetch } from "@/lib/api";
import type {
  AssignProfessorToCohortInput,
  CreateCohortInput,
  CreateModuleInput,
  CreateProfessorInput,
  CreateProfessorResult,
  CreateProgramInput,
  CreateStudentInput,
  CreateStudentResult,
  DoctoralCohort,
  DoctoralOverview,
  DoctoralProgram,
  DoctoralStudentListItem,
  ProgramModule,
  UpdateModuleInput,
  UpdateProgramInput,
} from "../types";

/**
 * Envoltorios tipados sobre apiFetch para /doctoral-admin/** — un lugar
 * único con las rutas reales (ver apps/api/src/doctoral-admin/*.controller.ts)
 * para que cada página no repita strings de endpoint.
 */

export function getOverview() {
  return apiFetch<DoctoralOverview>("/doctoral-admin/overview");
}

export function listPrograms() {
  return apiFetch<DoctoralProgram[]>("/doctoral-admin/programs");
}

export function createProgram(input: CreateProgramInput) {
  return apiFetch<DoctoralProgram>("/doctoral-admin/programs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateProgram(programId: string, input: UpdateProgramInput) {
  return apiFetch<DoctoralProgram>(`/doctoral-admin/programs/${programId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function listModules(programId: string) {
  return apiFetch<ProgramModule[]>(`/doctoral-admin/programs/${programId}/modules`);
}

export function createModule(programId: string, input: CreateModuleInput) {
  return apiFetch<ProgramModule>(`/doctoral-admin/programs/${programId}/modules`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateModule(programId: string, moduleId: string, input: UpdateModuleInput) {
  return apiFetch<ProgramModule>(
    `/doctoral-admin/programs/${programId}/modules/${moduleId}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export function deleteModule(programId: string, moduleId: string) {
  return apiFetch<{ id: string }>(
    `/doctoral-admin/programs/${programId}/modules/${moduleId}`,
    { method: "DELETE" },
  );
}

export function listCohorts(programId: string) {
  return apiFetch<DoctoralCohort[]>(`/doctoral-admin/programs/${programId}/cohorts`);
}

export function createCohort(programId: string, input: CreateCohortInput) {
  return apiFetch<DoctoralCohort>(`/doctoral-admin/programs/${programId}/cohorts`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listStudents(filters: { query?: string; cohortId?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.query) params.set("query", filters.query);
  if (filters.cohortId) params.set("cohortId", filters.cohortId);
  const qs = params.toString();
  return apiFetch<DoctoralStudentListItem[]>(
    `/doctoral-admin/students${qs ? `?${qs}` : ""}`,
  );
}

export function createStudent(input: CreateStudentInput) {
  return apiFetch<CreateStudentResult>("/doctoral-admin/students", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateStudentName(studentProfileId: string, displayName: string) {
  return apiFetch(`/doctoral-admin/students/${studentProfileId}`, {
    method: "PATCH",
    body: JSON.stringify({ displayName }),
  });
}

export function suspendStudent(studentProfileId: string) {
  return apiFetch(`/doctoral-admin/students/${studentProfileId}/suspend`, {
    method: "POST",
  });
}

export function reactivateStudent(studentProfileId: string) {
  return apiFetch(`/doctoral-admin/students/${studentProfileId}/reactivate`, {
    method: "POST",
  });
}

export function deleteStudent(studentProfileId: string) {
  return apiFetch(`/doctoral-admin/students/${studentProfileId}`, {
    method: "DELETE",
  });
}

export function enrollStudentInCohort(studentProfileId: string, cohortId: string) {
  return apiFetch(`/doctoral-admin/students/${studentProfileId}/cohorts/${cohortId}`, {
    method: "POST",
  });
}

export function removeStudentFromCohort(studentProfileId: string, cohortId: string) {
  return apiFetch(`/doctoral-admin/students/${studentProfileId}/cohorts/${cohortId}`, {
    method: "DELETE",
  });
}

export function enrollStudentInModule(studentProfileId: string, moduleId: string) {
  return apiFetch(`/doctoral-admin/students/${studentProfileId}/modules/${moduleId}`, {
    method: "POST",
  });
}

export function removeModuleEnrollment(studentProfileId: string, moduleId: string) {
  return apiFetch(`/doctoral-admin/students/${studentProfileId}/modules/${moduleId}`, {
    method: "DELETE",
  });
}

export function createProfessor(input: CreateProfessorInput) {
  return apiFetch<CreateProfessorResult>("/doctoral-admin/professors", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function assignProfessorToCohort(
  cohortId: string,
  input: AssignProfessorToCohortInput,
) {
  return apiFetch(`/doctoral-admin/cohorts/${cohortId}/professors`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
