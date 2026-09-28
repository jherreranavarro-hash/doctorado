"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { formatDate } from "../../../_lib/format";
import type { AssignmentListItem, AssignmentStatus } from "../../../types";

const STATUS_LABEL: Record<AssignmentStatus, string> = {
  draft: "Borrador",
  published: "Publicada",
  closed: "Cerrada",
};

const STATUS_CLASSNAME: Record<AssignmentStatus, string> = {
  draft: "bg-borde/40 text-ink-suave",
  published: "bg-exito/15 text-exito",
  closed: "bg-peligro/15 text-peligro",
};

export default function CohortAssignmentsPage({ params }: PageProps<"/docente/cohortes/[cohortId]/tareas">) {
  const { cohortId } = use(params);
  const [assignments, setAssignments] = useState<AssignmentListItem[] | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    apiFetch<AssignmentListItem[]>(`/doctoral-assignments/cohorts/${cohortId}`)
      .then(setAssignments)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la lista de tareas"));
  }, [cohortId]);

  return (
    <main className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
      <Link href={`/docente/cohortes/${cohortId}`} className="text-azul2 font-semibold link-pill">
        ← Cohorte
      </Link>
      <div className="flex items-center justify-between gap-3 mt-2 mb-6">
        <h1 className="text-2xl font-bold text-navy-txt">Tareas</h1>
        <Link href={`/docente/cohortes/${cohortId}/tareas/nueva`} className="tap-target">
          <Button>Nueva tarea</Button>
        </Link>
      </div>

      {error ? (
        <p role="alert" className="text-peligro mb-4">
          {error}
        </p>
      ) : null}

      {!assignments ? (
        <p className="text-ink-suave">Cargando…</p>
      ) : assignments.length === 0 ? (
        <p className="text-ink-suave">Todavía no hay tareas en esta cohorte.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {assignments.map((a) => (
            <li key={a.assignmentId}>
              <Link href={`/docente/cohortes/${cohortId}/tareas/${a.assignmentId}`} className="block tap-target">
                <Card className="hover:border-gold transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold text-ink">{a.title}</h3>
                    <span
                      className={`text-xs font-bold whitespace-nowrap rounded-[var(--radius-sm)] px-2 py-1 ${STATUS_CLASSNAME[a.status]}`}
                    >
                      {STATUS_LABEL[a.status]}
                    </span>
                  </div>
                  <p className="text-sm text-ink-suave mt-1">
                    Vence: {formatDate(a.dueAt)} · {a.questionCount} {a.questionCount === 1 ? "pregunta" : "preguntas"}
                  </p>
                  <p className="text-sm text-ink-suave mt-1">
                    {a.submissionTotal} {a.submissionTotal === 1 ? "entrega" : "entregas"} · {a.submissionGraded} calificada(s)
                    {a.targetStudentCount || a.targetGroupCount
                      ? ` · dirigida a ${a.targetStudentCount} alumno(s) y ${a.targetGroupCount} grupo(s)`
                      : " · toda la cohorte"}
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
