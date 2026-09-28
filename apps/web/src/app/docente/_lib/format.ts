// Formateo de fecha/hora compartido por el portal docente. Todas las fechas
// llegan de la API como strings ISO (serialización JSON de Date de Nest),
// nunca como objetos Date.

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPercent(value: number | null | undefined): string {
  return value == null ? "—" : `${Math.round(value)}%`;
}
