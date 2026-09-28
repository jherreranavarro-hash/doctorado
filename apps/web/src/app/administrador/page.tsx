"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { getOverview } from "./_lib/api";
import { ErrorText } from "./_components/ErrorText";
import type { DoctoralOverview } from "./types";

export default function AdministradorDashboardPage() {
  const [overview, setOverview] = useState<DoctoralOverview | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    getOverview()
      .then(setOverview)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "No se pudo cargar el resumen"),
      );
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-txt">Programas de doctorado</h1>
          <p className="text-sm text-ink-suave">
            Organización con {overview?.programCount ?? "…"} programa
            {overview?.programCount === 1 ? "" : "s"} registrado
            {overview?.programCount === 1 ? "" : "s"}.
          </p>
        </div>
        <Link href="/administrador/programas/nuevo" className="tap-target">
          <Button>+ Crear programa</Button>
        </Link>
      </div>

      <ErrorText message={error} />

      {!overview && !error ? <p className="text-ink-suave text-sm">Cargando…</p> : null}

      {overview && overview.programs.length === 0 ? (
        <Card>
          <p className="text-ink-suave">
            Todavía no hay programas creados. Usa &ldquo;Crear programa&rdquo; para empezar.
          </p>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {overview?.programs.map((program) => (
          <Link key={program.programId} href={`/administrador/programas/${program.programId}`} className="tap-target">
            <Card className="h-full flex flex-col gap-3 hover:border-garnet transition-colors">
              <div>
                <h2 className="text-lg font-bold text-navy-txt">{program.name}</h2>
                <p className="text-xs text-ink-suave font-mono">{program.key}</p>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm mt-auto">
                <Stat label="Módulos" value={program.moduleCount} />
                <Stat label="Cohortes" value={program.cohortCount} />
                <Stat label="Estudiantes" value={program.studentCount} />
                <Stat label="Docentes" value={program.professorCount} />
              </dl>
            </Card>
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
