"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { Card } from "@/components/Card";
import { competencyBucket, formatScore } from "../../../_lib/competency";
import type { CohortHeatmap } from "../../../types";

/**
 * Mapa de calor alumno×competencia de la cohorte — pensado para que el
 * docente detecte de un vistazo dónde está débil cada alumno, "sin que se
 * entere" (el alumno nunca ve esta vista, solo su propio reporte). Una celda
 * gris con guion es "sin datos todavía" — nunca se pinta como si fuera un 0.
 */
export default function CohortHeatmapPage({ params }: PageProps<"/docente/cohortes/[cohortId]/heatmap">) {
  const { cohortId } = use(params);
  const [heatmap, setHeatmap] = useState<CohortHeatmap | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    apiFetch<CohortHeatmap>(`/doctoral-analytics/cohorts/${cohortId}/heatmap`)
      .then(setHeatmap)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el mapa de calor"));
  }, [cohortId]);

  return (
    <main className="flex-1 px-4 py-8 max-w-5xl mx-auto w-full">
      <Link href={`/docente/cohortes/${cohortId}`} className="text-azul2 font-semibold link-pill">
        ← Cohorte
      </Link>
      <h1 className="text-2xl font-bold text-navy-txt mt-2 mb-1">Mapa de calor de competencias</h1>
      <p className="text-sm text-ink-suave mb-6">
        Puntaje semántico (0–100) por alumno y competencia, calculado a partir de ejercicios y exámenes calificados.
      </p>

      {error ? (
        <p role="alert" className="text-peligro mb-4">
          {error}
        </p>
      ) : null}

      {!heatmap ? (
        <p className="text-ink-suave">Cargando…</p>
      ) : heatmap.students.length === 0 ? (
        <p className="text-ink-suave">Esta cohorte todavía no tiene alumnos inscritos.</p>
      ) : (
        <>
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-paper2 px-4 py-3 text-left font-semibold text-ink border-b border-borde whitespace-nowrap">
                    Alumno
                  </th>
                  {heatmap.competencies.map((c) => (
                    <th
                      key={c.id}
                      className="px-3 py-3 text-center font-semibold text-ink border-b border-borde whitespace-nowrap"
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.students.map((s) => {
                  const scoreByCompetency = new Map(s.scores.map((sc) => [sc.competencyAreaId, sc]));
                  return (
                    <tr key={s.doctoralStudentProfileId} className="border-b border-borde last:border-0">
                      <td className="sticky left-0 bg-paper px-4 py-3 font-semibold text-ink whitespace-nowrap">
                        <Link
                          href={`/docente/estudiantes/${s.doctoralStudentProfileId}?cohortId=${cohortId}`}
                          className="link-pill hover:underline"
                        >
                          {s.displayName}
                        </Link>
                      </td>
                      {heatmap.competencies.map((c) => {
                        const cell = scoreByCompetency.get(c.id);
                        const style = competencyBucket(cell?.score);
                        return (
                          <td key={c.id} className="px-3 py-3 text-center">
                            <span
                              className={`inline-flex min-w-[3rem] items-center justify-center rounded-[var(--radius-sm)] px-2 py-1 font-semibold ${style.className}`}
                              title={cell ? `${cell.sampleCount} muestra(s)` : "Sin datos todavía"}
                            >
                              {formatScore(cell?.score)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <div className="flex flex-wrap gap-4 mt-4 text-sm text-ink-suave">
            <LegendSwatch label="Sólido (≥80)" className="bg-exito/15 text-exito" />
            <LegendSwatch label="En desarrollo (60–79)" className="bg-alerta/15 text-alerta" />
            <LegendSwatch label="Débil (<60)" className="bg-peligro/15 text-peligro" />
            <LegendSwatch label="Sin datos todavía" className="bg-borde/40 text-ink-suave" />
          </div>
        </>
      )}
    </main>
  );
}

function LegendSwatch({ label, className }: { label: string; className: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`inline-block w-4 h-4 rounded-sm ${className}`} />
      {label}
    </span>
  );
}
