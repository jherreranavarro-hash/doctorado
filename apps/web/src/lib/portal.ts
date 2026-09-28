import type { Role } from "./types";

/** Portal de destino tras iniciar sesión, según el primer rol activo. Las
 * 3 cuentas del Dominio Doctorado no son auto-registrables (las provisiona
 * un doctoral_admin), así que no hay página de registro público aquí. */
export function portalForRole(roleKey: Role | undefined): string {
  switch (roleKey) {
    case "doctoral_professor":
      return "/docente";
    case "doctoral_admin":
      return "/administrador";
    case "doctoral_student":
      return "/estudiante";
    default:
      return "/login";
  }
}
