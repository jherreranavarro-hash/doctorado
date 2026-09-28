"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { Card } from "@/components/Card";
import type { CohortSummary } from "./types";

export default function DocenteDashboardPage() {
  const [cohorts, setCohorts] = useState<CohortSummary[] | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    apiFetch<CohortSummary[]>("/doctoral-analytics/me/cohorts")
      .then(setCohorts)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar tus cohortes"));
  }, []);

  return (
    <main className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-navy-txt mb-1">Mis cohortes</h1>
      <p className="text-sm text-ink-suave mb-6">
        Selecciona una cohorte para ver su mapa de calor de competencias, KPIs, alumnos y tareas.
      </p>

      {error ? (
        <p role="alert" className="text-peligro mb-4">
          {error}
        </p>
      ) : null}

      {!cohorts ? (
        <p className="text-ink-suave">Cargando…</p>
      ) : cohorts.length === 0 ? (
        <p className="text-ink-suave">Todavía no tienes cohortes asignadas.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {cohorts.map((c) => (
            <li key={c.cohortId}>
              <Link href={`/docente/cohortes/${c.cohortId}`} className="block tap-target">
                <Card className="hover:border-gold transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-bold text-navy-txt">{c.name}</h2>
                    <span className="text-xs font-semibold text-ink-suave whitespace-nowrap">
                      {c.startYear}
                    </span>
                  </div>
                  <p className="text-sm text-ink-suave mt-1">{c.program.name}</p>
                  <p className="text-sm text-ink-suave mt-1">
                    {c.studentCount} {c.studentCount === 1 ? "estudiante" : "estudiantes"}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
