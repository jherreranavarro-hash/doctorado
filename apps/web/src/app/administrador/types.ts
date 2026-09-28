import type {
  DoctoralModuleEnrollmentStatus,
  DoctoralModuleType,
} from "@doctorado/shared";

export type { DoctoralModuleType, DoctoralModuleEnrollmentStatus };

// Estado de la cuenta (User.status en apps/api) — los estudiantes/docentes
// que crea este mantenedor nacen "active"; "pending" existe en el enum
// compartido pero no lo usa este flujo (se deja por completitud del tipo).
export type AccountStatus = "active" | "suspended" | "pending";

// --- Resumen (GET /doctoral-admin/overview) ---

export interface DoctoralProgramOverview {
  programId: string;
  key: string;
  name: string;
  moduleCount: number;
  cohortCount: number;
  studentCount: number;
  professorCount: number;
}

export interface DoctoralOverview {
  programCount: number;
  programs: DoctoralProgramOverview[];
}

// --- Programas ---

export interface DoctoralProgram {
  id: string;
  organizationId: string;
  key: string;
  name: string;
  institution: string | null;
  totalSemesters: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateProgramInput {
  key: string;
  name: string;
  institution?: string;
  totalSemesters?: number;
}

export interface UpdateProgramInput {
  name?: string;
  institution?: string;
  totalSemesters?: number;
}

// --- Módulos ---

export interface ProgramModule {
  id: string;
  programId: string;
  code: string | null;
  title: string;
  semester: number;
  credits: number;
  type: DoctoralModuleType;
  order: number;
  hasRealContent: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateModuleInput {
  code?: string;
  title: string;
  semester: number;
  credits: number;
  type: DoctoralModuleType;
  order: number;
}

export type UpdateModuleInput = Partial<CreateModuleInput>;

// --- Cohortes ---

export interface DoctoralCohort {
  id: string;
  programId: string;
  name: string;
  startYear: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateCohortInput {
  name: string;
  startYear: number;
}

// --- Estudiantes ---

export interface StudentCohortMembership {
  cohortId: string;
  name: string;
  programId: string;
}

export interface StudentModuleEnrollment {
  moduleId: string;
  title: string;
  status: DoctoralModuleEnrollmentStatus;
}

export interface DoctoralStudentListItem {
  studentProfileId: string;
  userId: string;
  email: string;
  displayName: string;
  status: AccountStatus;
  cohorts: StudentCohortMembership[];
  moduleEnrollments: StudentModuleEnrollment[];
}

export interface CreateStudentInput {
  email: string;
  password: string;
  displayName: string;
  cohortId?: string;
}

export interface CreateStudentResult {
  studentProfileId: string;
  userId: string;
}

// --- Docentes ---

export interface CreateProfessorInput {
  email: string;
  password: string;
  displayName: string;
  title?: string;
}

export interface CreateProfessorResult {
  professorProfileId: string;
  userId: string;
}

export interface AssignProfessorToCohortInput {
  doctoralProfessorProfileId?: string;
  email?: string;
}
