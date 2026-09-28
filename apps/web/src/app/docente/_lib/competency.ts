// Escala de color compartida por el mapa de calor, el resumen de KPIs de
// cohorte y el informe por alumno. Invariante clave (ver doc de
// CompetencyRollupService): una competencia sin fila en el rollup es "sin
// datos todavía", nunca un 0 — por eso score siempre se recibe como
// `number | null` y "sin datos" se distingue visualmente (gris/guion) de un
// score bajo real (rojo).

export type CompetencyBucket = "sin-datos" | "debil" | "en-desarrollo" | "solido";

export interface CompetencyBucketStyle {
  bucket: CompetencyBucket;
  label: string;
  /** Clases de Tailwind para una celda/badge — fondo suave + texto fuerte,
   * usando los tokens de globals.css (exito/alerta/peligro). */
  className: string;
}

export function competencyBucket(score: number | null | undefined): CompetencyBucketStyle {
  if (score == null) {
    return {
      bucket: "sin-datos",
      label: "Sin datos todavía",
      className: "bg-borde/40 text-ink-suave",
    };
  }
  if (score >= 80) {
    return {
      bucket: "solido",
      label: "Sólido",
      className: "bg-exito/15 text-exito",
    };
  }
  if (score >= 60) {
    return {
      bucket: "en-desarrollo",
      label: "En desarrollo",
      className: "bg-alerta/15 text-alerta",
    };
  }
  return {
    bucket: "debil",
    label: "Débil",
    className: "bg-peligro/15 text-peligro",
  };
}

export function formatScore(score: number | null | undefined): string {
  return score == null ? "—" : `${Math.round(score)}`;
}
