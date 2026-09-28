// Ninguno de los 3 roles es auto-registrable — los provisiona siempre un
// doctoral_admin (ver apps/api/src/doctoral-admin). Se conserva el prefijo
// "doctoral_" aunque este repo ya no convive con un producto K-12: simplifica
// la extracción (cero renombres en schema/controllers/seed/frontend) y no
// genera ambigüedad real dentro de este proyecto.
export const ROLES = ["doctoral_student", "doctoral_professor", "doctoral_admin"] as const;

export type Role = (typeof ROLES)[number];
