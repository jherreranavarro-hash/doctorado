"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { competencyBucket, formatScore } from "../../_lib/competency";
import { formatDateTime } from "../../_lib/format";
import type {
  DoctoralModuleEnrollmentStatus,
  StudentAttempts,
  StudentHeatmap,
  StudentReport,
} from "../../types";

const MODULE_STATUS_LABEL: Record<DoctoralModuleEnrollmentStatus, string> = {
  in_progress: "En curso",
  completed: "Completado",
  withdrawn: "Retirado",
};

export default function StudentReportPage({ params }: PageProps<"/docente/estudiantes/[studentId]">) {
  const { studentId } = use(params);
  const searchParams = useSearchParams();
  const cohortId = searchParams.get("cohortId");

  const [report, setReport] = useState<StudentReport | null>(null);
  const [heatmap, setHeatmap] = useState<StudentHeatmap | null>(null);
  const [error, setError] = useState<string>();

  const [attempts, setAttempts] = useState<StudentAttempts | null>(null);
  const [attemptsError, setAttemptsError] = useState<string>();
  const [showAttempts, setShowAttempts] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<StudentReport>(`/doctoral-analytics/students/${studentId}/report`),
      apiFetch<StudentHeatmap>(`/doctoral-analytics/students/${studentId}/heatmap`),
    ])
      .then(([r, h]) => {
        setReport(r);
        setHeatmap(h);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el reporte del alumno"));
  }, [studentId]);

  function loadAttempts() {
    setShowAttempts(true);
    if (attempts) return;
    apiFetch<StudentAttempts>(`/doctoral-analytics/students/${studentId}/attempts`)
      .then(setAttempts)
      .catch((err) => setAttemptsError(err instanceof ApiError ? err.message : "No se pudo cargar el historial de intentos"));
  }

  return (
    <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
      <Link
        href={cohortId ? `/docente/cohortes/${cohortId}` : "/docente"}
        className="text-azul2 font-semibold link-pill"
      >
        ← {cohortId ? "Cohorte" : "Mis cohortes"}
      </Link>
      <h1 className="text-2xl font-bold text-navy-txt mt-2 mb-1">Reporte de seguimiento</h1>
      {report ? <p className="text-ink-suave mb-6">{report.displayName}</p> : <div className="mb-6" />}

      {error ? (
        <p role="alert" className="text-peligro mb-4">
          {error}
        </p>
      ) : null}

      {!report || !heatmap ? (
        <p className="text-ink-suave">Cargando…</p>
      ) : (
        <>
          <section className="grid sm:grid-cols-2 gap-4 mb-6">
            <Card className="border-2 border-peligro/40">
              <p className="text-sm font-semibold text-peligro mb-2">Puntos de mejora</p>
              {report.weaknesses.length === 0 ? (
                <p className="text-sm text-ink-suave">Todavía no hay suficiente evidencia para identificar debilidades.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {report.weaknesses.map((w) => (
                    <li key={w.key} className="text-sm text-ink">
                      <strong>{w.label}</strong> — {formatScore(w.score)}/100
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="border-2 border-exito/40">
              <p className="text-sm font-semibold text-exito mb-2">Fortalezas</p>
              {report.strengths.length === 0 ? (
                <p className="text-sm text-ink-suave">
                  Todavía no hay suficientes competencias evaluadas como para distinguir fortalezas claras.
                </p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {report.strengths.map((s) => (
                    <li key={s.key} className="text-sm text-ink">
                      <strong>{s.label}</strong> — {formatScore(s.score)}/100
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <Card className="mb-6">
            <h2 className="font-bold text-navy-txt mb-3">Mapa de competencias</h2>
            <ul className="flex flex-col gap-2">
              {heatmap.competencies.map((c) => {
                const style = competencyBucket(c.score);
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-ink">{c.label}</span>
                    <span className={`inline-flex items-center rounded-[var(--radius-sm)] px-2 py-1 font-semibold ${style.className}`}>
                      {formatScore(c.score)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="mb-6">
            <h2 className="font-bold text-navy-txt mb-3">Progreso por módulo</h2>
            {report.modules.length === 0 ? (
              <p className="text-sm text-ink-suave">Este alumno todavía no está inscrito en ningún módulo.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-suave border-b border-borde">
                      <th className="py-2 pr-3 font-semibold">Módulo</th>
                      <th className="py-2 pr-3 font-semibold">Estado</th>
                      <th className="py-2 pr-3 font-semibold">Examen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.modules.map((m) => (
                      <tr key={m.moduleId} className="border-b border-borde last:border-0">
                        <td className="py-2 pr-3 text-ink">{m.title}</td>
                        <td className="py-2 pr-3 text-ink">{MODULE_STATUS_LABEL[m.status]}</td>
                        <td className="py-2 pr-3 text-ink">
                          {!m.examAttempted
                            ? "Sin intentos"
                            : `${formatScore(m.bestExamScore)}/100 · ${m.examPassed ? "Aprobado" : "No aprobado"}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3 mb-2">
              <h2 className="font-bold text-navy-txt">Historial de intentos</h2>
              {!showAttempts ? (
                <Button variant="secondary" onClick={loadAttempts}>
                  Mostrar
                </Button>
              ) : null}
            </div>
            {showAttempts ? (
              attemptsError ? (
                <p className="text-peligro text-sm">{attemptsError}</p>
              ) : !attempts ? (
                <p className="text-ink-suave text-sm">Cargando…</p>
              ) : (
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-sm font-semibold text-ink mb-1">Ejercicios de práctica ({attempts.exerciseAttempts.length})</p>
                    {attempts.exerciseAttempts.length === 0 ? (
                      <p className="text-sm text-ink-suave">Sin intentos registrados.</p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {attempts.exerciseAttempts.map((a, i) => (
                          <li key={`${a.exerciseId}-${i}`} className="text-sm text-ink-suave">
                            {formatDateTime(a.createdAt)} · {a.topicTitle} ({a.difficulty}) —{" "}
                            {a.isCorrect === null ? "sin evaluar" : a.isCorrect ? "correcto" : "incorrecto"}
                            {a.semanticScore != null ? ` · ${a.semanticScore}/100` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink mb-1">Exámenes ({attempts.examAttempts.length})</p>
                    {attempts.examAttempts.length === 0 ? (
                      <p className="text-sm text-ink-suave">Sin intentos registrados.</p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {attempts.examAttempts.map((a, i) => (
                          <li key={`${a.examId}-${i}`} className="text-sm text-ink-suave">
                            {formatDateTime(a.startedAt)} · {a.moduleTitle} — {a.status}
                            {a.score != null ? ` · ${a.score}/100 · ${a.passed ? "Aprobado" : "No aprobado"}` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )
            ) : (
              <p className="text-sm text-ink-suave">Ejercicios y exámenes calificados, del más reciente al más antiguo.</p>
            )}
          </Card>
        </>
      )}
    </main>
  );
}
