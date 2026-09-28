"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { Card } from "@/components/Card";
import { CollectionHero } from "@/components/CollectionHero";
import { IndexCard } from "@/components/IndexCard";
import { UsersIcon } from "@/components/icons";
import type { CohortSummary } from "./types";

export default function DocenteDashboardPage() {
  const [cohorts, setCohorts] = useState<CohortSummary[] | null>(null);
  const [error, setError] = useState<string>();
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiFetch<CohortSummary[]>("/doctoral-analytics/me/cohorts")
      .then(setCohorts)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar tus cohortes"));
  }, []);

  const filteredCohorts = useMemo(() => {
    if (!cohorts) return null;
    const q = search.trim().toLowerCase();
    if (!q) return cohorts;
    return cohorts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.program.name.toLowerCase().includes(q),
    );
  }, [cohorts, search]);

  return (
    <main className="flex-1 px-4 pb-8 max-w-3xl mx-auto w-full">
      <CollectionHero
        variant="docente"
        title="Mis cohortes"
        subtitle="Selecciona una cohorte para ver su mapa de calor de competencias, KPIs, alumnos y tareas."
        searchValue={search}
        onSearchChange={cohorts && cohorts.length > 0 ? setSearch : undefined}
        searchPlaceholder="Buscar cohorte o programa…"
      />

      <div>
        {error ? (
          <p role="alert" className="text-peligro mb-4">
            {error}
          </p>
        ) : null}

        {!filteredCohorts ? (
          <p className="text-ink-suave">Cargando…</p>
        ) : filteredCohorts.length === 0 ? (
          <Card>
            <p className="text-ink-suave">
              {cohorts && cohorts.length > 0
                ? "Ninguna cohorte coincide con tu búsqueda."
                : "Todavía no tienes cohortes asignadas."}
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredCohorts.map((c) => (
              <Link key={c.cohortId} href={`/docente/cohortes/${c.cohortId}`} className="tap-target block">
                <IndexCard
                  variant="docente"
                  icon={<UsersIcon className="h-full w-full" />}
                  title={c.name}
                  meta={c.program.name}
                  trailing={
                    <span className="text-xs font-semibold text-ink-suave whitespace-nowrap">{c.startYear}</span>
                  }
                >
                  <p className="text-sm text-ink-suave mt-2">
                    {c.studentCount} {c.studentCount === 1 ? "estudiante" : "estudiantes"}
                  </p>
                </IndexCard>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
