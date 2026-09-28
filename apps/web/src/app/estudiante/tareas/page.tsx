"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { Card } from "@/components/Card";
import { Badge } from "../_components/Badge";
import { formatDate, SUBMISSION_STATUS_COLOR, SUBMISSION_STATUS_LABEL } from "../_lib/format";
import type { AssignmentListEntry } from "../types";

export default function AssignmentsListPage() {
  const [assignments, setAssignments] = useState<AssignmentListEntry[] | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    apiFetch<AssignmentListEntry[]>("/doctoral-assignments/me")
      .then((data) => {
        if (!cancelled) setAssignments(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "No se pudieron cargar tus tareas");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
      <Link href="/estudiante" className="text-azul2 font-semibold link-pill">
        ← Mis módulos
      </Link>
      <h1 className="text-2xl font-bold text-navy-txt mt-2 mb-6">Mis tareas</h1>

      {error ? (
        <p role="alert" className="text-peligro mb-4">
          {error}
        </p>
      ) : null}

      {!assignments ? (
        <p className="text-ink-suave">Cargando…</p>
      ) : assignments.length === 0 ? (
        <Card>
          <p className="text-ink-suave">Todavía no tienes tareas asignadas.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {assignments.map((a) => (
            <Link key={a.assignmentId} href={`/estudiante/tareas/${a.assignmentId}`} className="tap-target block">
              <Card className="hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <h2 className="font-bold text-navy-txt">{a.title}</h2>
                  <Badge className={SUBMISSION_STATUS_COLOR[a.submissionStatus]}>
                    {SUBMISSION_STATUS_LABEL[a.submissionStatus]}
                  </Badge>
                </div>
                <p className="text-sm text-ink-suave mt-1">
                  {a.cohortName}
                  {a.moduleTitle ? ` · ${a.moduleTitle}` : ""} · Entrega: {formatDate(a.dueAt)}
                  {a.totalScore !== null ? ` · ${a.totalScore} pts` : ""}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
