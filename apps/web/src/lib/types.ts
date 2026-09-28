import type { Role } from "@doctorado/shared";

export type { Role };

export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: { roleKey: Role; organizationId: string; schoolId: string | null }[];
}

export interface MeResponse extends AuthenticatedUser {
  csrfToken: string;
}

// Los tipos de vista específicos de cada pantalla (módulos, ejercicios,
// examen, heatmap, tareas, mantenedores de admin) se agregan junto con cada
// página del portal correspondiente, una vez confirmados los contratos
// reales que exponen apps/api/src/doctoral-admin, doctoral-learning,
// doctoral-analytics y doctoral-assignments.
