"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { competencyBucket, formatScore } from "../../_lib/competency";
import { formatPercent } from "../../_lib/format";
import type { CohortHeatmap, CohortKpis, CohortSummary } from "../../types";

const COMPLETION_LABEL: Record<keyof CohortKpis["moduleCompletion"], string> = {
  in_progress: "En curso",
  completed: "Completados",
  withdrawn: "Retirados",
};

export default function CohortOverviewPage({ params }: PageProps<"/docente/cohortes/[cohortId]">) {
  const { cohortId } = use(params);
  const [cohort, setCohort] = useState<CohortSummary | null>(null);
  const [kpis, setKpis] = useState<CohortKpis | null>(null);
  const [heatmap, setHeatmap] = useState<CohortHeatmap | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    apiFetch<CohortSummary[]>("/doctoral-analytics/me/cohorts")
      .then((cohorts) => setCohort(cohorts.find((c) => c.cohortId === cohortId) ?? null))
      .catch(() => undefined);

    Promise.all([
      apiFetch<CohortKpis>(`/doctoral-analytics/cohorts/${cohortId}/kpis`),
      apiFetch<CohortHeatmap>(`/doctoral-analytics/cohorts/${cohortId}/heatmap`),
    ])
      .then(([k, h]) => {
        setKpis(k);
        setHeatmap(h);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la cohorte"));
  }, [cohortId]);

  const activeModules = kpis?.moduleStats.filter((m) => m.enrolledCount > 0) ?? [];

  return (
    <main className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full">
      <Link href="/docente" className="text-azul2 font-semibold link-pill">
        ← Mis cohortes
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 mt-2 mb-1">
        <div>
          <h1 className="text-2xl font-bold text-navy-txt">{cohort?.name ?? "Cohorte"}</h1>
          <p className="text-ink-suave">{cohort?.program.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/docente/cohortes/${cohortId}/heatmap`} className="tap-target">
            <Button variant="secondary">Mapa de calor</Button>
          </Link>
          <Link href={`/docente/cohortes/${cohortId}/grupos`} className="tap-target">
            <Button variant="secondary">Grupos</Button>
          </Link>
          <Link href={`/docente/cohortes/${cohortId}/tareas`} className="tap-target">
            <Button>Tareas</Button>
          </Link>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-peligro mt-4">
          {error}
        </p>
      ) : null}

      {!kpis || !heatmap ? (
        <p className="text-ink-suave mt-6">Cargando…</p>
      ) : (
        <>
          <section className="mt-6">
            <h2 className="text-lg font-bold text-navy-txt mb-3">Promedio de competencias</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {kpis.competencyAverages.map((c) => {
                const style = competencyBucket(c.averageScore);
                return (
                  <Card key={c.competencyAreaId} className="p-4">
                    <p className="text-xs font-semibold text-ink-suave mb-1">{c.label}</p>
                    <p className={`inline-flex items-center rounded-[var(--radius-sm)] px-2 py-1 text-lg font-bold ${style.className}`}>
                      {formatScore(c.averageScore)}
                    </p>
                    <p className="text-xs text-ink-suave mt-1">
                      {c.studentsWithData} {c.studentsWithData === 1 ? "alumno con datos" : "alumnos con datos"}
                    </p>
                  </Card>
                );
              })}
            </div>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-bold text-navy-txt mb-3">Módulos con inscripción</h2>
            {activeModules.length === 0 ? (
              <p className="text-sm text-ink-suave">Todavía no hay alumnos inscritos en ningún módulo.</p>
            ) : (
              <Card className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-suave border-b border-borde">
                      <th className="px-4 py-2 font-semibold">Módulo</th>
                      <th className="px-4 py-2 font-semibold">Inscritos</th>
                      <th className="px-4 py-2 font-semibold">Intentos</th>
                      <th className="px-4 py-2 font-semibold">Promedio examen</th>
                      <th className="px-4 py-2 font-semibold">% aprobación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeModules.map((m) => (
                      <tr key={m.moduleId} className="border-b border-borde last:border-0">
                        <td className="px-4 py-2 text-ink">{m.title}</td>
                        <td className="px-4 py-2 text-ink">{m.enrolledCount}</td>
                        <td className="px-4 py-2 text-ink">{m.submittedAttemptCount}</td>
                        <td className="px-4 py-2 text-ink">{formatScore(m.averageExamScore)}</td>
                        <td className="px-4 py-2 text-ink">{formatPercent(m.passRatePercent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-bold text-navy-txt mb-3">Estado de inscripciones a módulo</h2>
            <div className="flex flex-wrap gap-3">
              {(Object.keys(kpis.moduleCompletion) as (keyof CohortKpis["moduleCompletion"])[]).map((key) => (
                <Card key={key} className="px-4 py-3">
                  <p className="text-2xl font-bold text-navy-txt">{kpis.moduleCompletion[key]}</p>
                  <p className="text-xs text-ink-suave">{COMPLETION_LABEL[key]}</p>
                </Card>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-bold text-navy-txt mb-3">Alumnos ({heatmap.students.length})</h2>
            {heatmap.students.length === 0 ? (
              <p className="text-sm text-ink-suave">Esta cohorte todavía no tiene alumnos inscritos.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {heatmap.students.map((s) => (
                  <li key={s.doctoralStudentProfileId}>
                    <Link href={`/docente/estudiantes/${s.doctoralStudentProfileId}?cohortId=${cohortId}`} className="block tap-target">
                      <Card className="flex items-center justify-between gap-3 py-3 hover:border-gold transition-colors">
                        <span className="font-semibold text-ink">{s.displayName}</span>
                        <span className="text-xs text-ink-suave whitespace-nowrap">
                          {s.scores.length} {s.scores.length === 1 ? "competencia con datos" : "competencias con datos"}
                        </span>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
