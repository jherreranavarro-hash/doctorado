"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import { Card } from "@/components/Card";
import { CollectionHero } from "@/components/CollectionHero";
import { IndexCard } from "@/components/IndexCard";
import { AcademicCapIcon } from "@/components/icons";
import { getOverview } from "./_lib/api";
import { ErrorText } from "./_components/ErrorText";
import type { DoctoralOverview } from "./types";

export default function AdministradorDashboardPage() {
  const [overview, setOverview] = useState<DoctoralOverview | null>(null);
  const [error, setError] = useState<string>();
  const [search, setSearch] = useState("");

  useEffect(() => {
    getOverview()
      .then(setOverview)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "No se pudo cargar el resumen"),
      );
  }, []);

  const filteredPrograms = useMemo(() => {
    if (!overview) return null;
    const q = search.trim().toLowerCase();
    if (!q) return overview.programs;
    return overview.programs.filter(
      (p) => p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q),
    );
  }, [overview, search]);

  return (
    <div className="flex flex-col gap-6 -mt-6">
      <CollectionHero
        variant="administrador"
        title="Programas de doctorado"
        subtitle={
          overview
            ? `Organización con ${overview.programCount} programa${overview.programCount === 1 ? "" : "s"} registrado${overview.programCount === 1 ? "" : "s"}.`
            : undefined
        }
        searchValue={search}
        onSearchChange={overview && overview.programs.length > 0 ? setSearch : undefined}
        searchPlaceholder="Buscar programa o sigla…"
        action={
          <Link
            href="/administrador/programas/nuevo"
            className="tap-target text-garnet font-semibold text-sm bg-paper2 hover:bg-paper2/90 transition-colors rounded-full px-4"
          >
            + Crear programa
          </Link>
        }
      />

      <ErrorText message={error} />

      {!overview && !error ? <p className="text-ink-suave text-sm">Cargando…</p> : null}

      {filteredPrograms && filteredPrograms.length === 0 ? (
        <Card>
          <p className="text-ink-suave">
            {overview && overview.programs.length > 0
              ? "Ningún programa coincide con tu búsqueda."
              : 'Todavía no hay programas creados. Usa "Crear programa" para empezar.'}
          </p>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3">
        {filteredPrograms?.map((program) => (
          <Link key={program.programId} href={`/administrador/programas/${program.programId}`} className="tap-target block">
            <IndexCard
              variant="administrador"
              icon={<AcademicCapIcon className="h-full w-full" />}
              title={program.name}
              meta={program.key}
            >
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm mt-3">
                <Stat label="Módulos" value={program.moduleCount} />
                <Stat label="Cohortes" value={program.cohortCount} />
                <Stat label="Estudiantes" value={program.studentCount} />
                <Stat label="Docentes" value={program.professorCount} />
              </dl>
            </IndexCard>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-ink-suave">{label}</dt>
      <dd className="text-xl font-bold text-navy-txt">{value}</dd>
    </div>
  );
}
