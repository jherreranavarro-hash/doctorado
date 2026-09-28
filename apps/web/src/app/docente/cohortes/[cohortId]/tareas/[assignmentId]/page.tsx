"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { formatDate, formatDateTime } from "../../../../_lib/format";
import type {
  AssignmentListItem,
  AssignmentStatus,
  GradeSubmissionBody,
  SubmissionDetail,
  SubmissionSummary,
} from "../../../../types";

const STATUS_LABEL: Record<AssignmentStatus, string> = {
  draft: "Borrador",
  published: "Publicada",
  closed: "Cerrada",
};

const SUBMISSION_STATUS_LABEL: Record<string, string> = {
  submitted: "Entregada — pendiente de calificar",
  graded: "Calificada",
};

const TYPE_LABEL: Record<string, string> = {
  mc: "Selección múltiple",
  short_answer: "Respuesta breve",
  essay: "Desarrollo / ensayo",
  file_upload: "Carga de archivo",
};

export default function AssignmentDetailPage({ params }: PageProps<"/docente/cohortes/[cohortId]/tareas/[assignmentId]">) {
  const { cohortId, assignmentId } = use(params);
  const [assignment, setAssignment] = useState<AssignmentListItem | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionSummary[] | null>(null);
  const [error, setError] = useState<string>();
  const [statusBusy, setStatusBusy] = useState(false);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string>();

  function loadAssignment() {
    // No existe GET /doctoral-assignments/:id — se resuelve el resumen desde
    // el listado de la cohorte, el único lugar donde el docente puede
    // volver a leer título/estado/vencimiento de una tarea ya creada.
    apiFetch<AssignmentListItem[]>(`/doctoral-assignments/cohorts/${cohortId}`)
      .then((list) => setAssignment(list.find((a) => a.assignmentId === assignmentId) ?? null))
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la tarea"));
  }

  function loadSubmissions() {
    apiFetch<SubmissionSummary[]>(`/doctoral-assignments/${assignmentId}/submissions`)
      .then(setSubmissions)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la lista de entregas"));
  }

  useEffect(() => {
    loadAssignment();
    loadSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohortId, assignmentId]);

  async function onStatusChange(next: AssignmentStatus) {
    setError(undefined);
    setStatusBusy(true);
    try {
      await apiFetch(`/doctoral-assignments/${assignmentId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      loadAssignment();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cambiar el estado de la tarea");
    } finally {
      setStatusBusy(false);
    }
  }

  return (
    <main className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
      <Link href={`/docente/cohortes/${cohortId}/tareas`} className="text-azul2 font-semibold link-pill">
        ← Tareas
      </Link>

      {error ? (
        <p role="alert" className="text-peligro mt-4 mb-2">
          {error}
        </p>
      ) : null}

      {!assignment ? (
        <p className="text-ink-suave mt-4">Cargando…</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 mt-2 mb-1">
            <h1 className="text-2xl font-bold text-navy-txt">{assignment.title}</h1>
            <span className="text-xs font-bold text-ink-suave whitespace-nowrap">{STATUS_LABEL[assignment.status]}</span>
          </div>
          <p className="text-sm text-ink-suave mb-6">Vence: {formatDate(assignment.dueAt)}</p>

          <Card className="mb-6">
            <div className="flex flex-wrap gap-2">
              {assignment.status === "draft" ? (
                <Button disabled={statusBusy} onClick={() => onStatusChange("published")}>
                  Publicar tarea
                </Button>
              ) : null}
              {assignment.status === "published" ? (
                <Button variant="danger" disabled={statusBusy} onClick={() => onStatusChange("closed")}>
                  Cerrar tarea
                </Button>
              ) : null}
            </div>
            <p className="text-sm text-ink-suave mt-3">
              {assignment.questionCount} {assignment.questionCount === 1 ? "pregunta" : "preguntas"} ·{" "}
              {assignment.targetStudentCount || assignment.targetGroupCount
                ? `dirigida a ${assignment.targetStudentCount} alumno(s) y ${assignment.targetGroupCount} grupo(s)`
                : "dirigida a toda la cohorte"}
            </p>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-navy-txt mb-3">Entregas ({submissions?.length ?? 0})</h2>
            {!submissions ? (
              <p className="text-ink-suave text-sm">Cargando…</p>
            ) : submissions.length === 0 ? (
              <p className="text-ink-suave text-sm">Todavía no hay entregas.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {submissions.map((s) => (
                  <li key={s.submissionId} className="border-t border-borde pt-2">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-3 text-left tap-target"
                      onClick={() =>
                        setExpandedSubmissionId(expandedSubmissionId === s.submissionId ? undefined : s.submissionId)
                      }
                    >
                      <span className="font-semibold text-ink">{s.studentDisplayName}</span>
                      <span className="text-sm text-ink-suave whitespace-nowrap">
                        {SUBMISSION_STATUS_LABEL[s.status] ?? s.status}
                        {s.totalScore !== null ? ` · ${s.totalScore} pts` : ""}
                      </span>
                    </button>
                    <p className="text-xs text-ink-suave">Entregada: {formatDateTime(s.submittedAt)}</p>
                    {expandedSubmissionId === s.submissionId ? (
                      <SubmissionGrader
                        assignmentId={assignmentId}
                        submissionId={s.submissionId}
                        onGraded={loadSubmissions}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </main>
  );
}

function SubmissionGrader({
  assignmentId,
  submissionId,
  onGraded,
}: {
  assignmentId: string;
  submissionId: string;
  onGraded: () => void;
}) {
  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [error, setError] = useState<string>();
  const [scores, setScores] = useState<Record<string, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [overallFeedback, setOverallFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<SubmissionDetail>(`/doctoral-assignments/${assignmentId}/submissions/${submissionId}`)
      .then((d) => {
        setDetail(d);
        setScores(Object.fromEntries(d.answers.map((a) => [a.questionId, String(a.score ?? 0)])));
        setFeedbacks(Object.fromEntries(d.answers.map((a) => [a.questionId, a.feedback ?? ""])));
        setOverallFeedback(d.feedback ?? "");
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la entrega"));
  }, [assignmentId, submissionId]);

  async function onSave() {
    if (!detail) return;
    setError(undefined);
    setSaving(true);
    try {
      const gradableAnswers = detail.answers.filter((a) => a.type !== "mc");
      const body: GradeSubmissionBody = {
        answers: gradableAnswers.map((a) => ({
          questionId: a.questionId,
          score: Math.max(0, Math.min(a.maxScore, Math.round(Number(scores[a.questionId] ?? 0)))),
          feedback: feedbacks[a.questionId]?.trim() || undefined,
        })),
        feedback: overallFeedback.trim() || undefined,
      };
      await apiFetch(`/doctoral-assignments/${assignmentId}/submissions/${submissionId}/grade`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      onGraded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar la calificación");
    } finally {
      setSaving(false);
    }
  }

  if (error) return <p className="text-peligro text-sm mt-2">{error}</p>;
  if (!detail) return <p className="text-ink-suave text-sm mt-2">Cargando…</p>;

  return (
    <div className="mt-3 flex flex-col gap-3">
      {detail.answers.map((a) => {
        const autoGraded = a.type === "mc";
        return (
          <div key={a.questionId} className="border-l-4 border-borde pl-3">
            <p className="text-xs font-semibold text-ink-suave">{TYPE_LABEL[a.type] ?? a.type}</p>
            <p className="text-sm font-semibold text-ink">{a.prompt}</p>
            {autoGraded ? (
              <>
                <p className="text-sm text-ink-suave">
                  Respondió: {a.selectedOptionKey ?? "(sin respuesta)"} · Correcta: {a.correctOptionKey}
                </p>
                <p className="text-sm text-ink-suave mt-1">
                  Puntaje automático: {a.score ?? 0} / {a.maxScore}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-ink-suave whitespace-pre-wrap mt-1">
                  {a.responseText || (a.type === "file_upload" ? "(entregó un archivo, sin texto)" : "(sin respuesta)")}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end mt-2">
                  <label className="flex flex-col gap-1 text-sm">
                    Puntaje (máx {a.maxScore})
                    <input
                      type="number"
                      min={0}
                      max={a.maxScore}
                      value={scores[a.questionId] ?? "0"}
                      onChange={(e) => setScores((s) => ({ ...s, [a.questionId]: e.target.value }))}
                      className="min-h-9 px-2 py-1 rounded-[var(--radius-sm)] border border-borde w-24 text-ink"
                    />
                  </label>
                  <input
                    type="text"
                    placeholder="Retroalimentación (opcional)"
                    value={feedbacks[a.questionId] ?? ""}
                    onChange={(e) => setFeedbacks((f) => ({ ...f, [a.questionId]: e.target.value }))}
                    className="min-h-9 px-2 py-1 rounded-[var(--radius-sm)] border border-borde flex-1 w-full text-ink"
                  />
                </div>
              </>
            )}
          </div>
        );
      })}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-ink">Retroalimentación general de la entrega (opcional)</span>
        <textarea
          value={overallFeedback}
          onChange={(e) => setOverallFeedback(e.target.value)}
          rows={2}
          className="rounded-[var(--radius-sm)] border border-borde bg-paper px-3 py-2 text-ink"
        />
      </label>

      <Button onClick={onSave} disabled={saving} className="self-start">
        {saving ? "Guardando…" : "Guardar calificación"}
      </Button>
    </div>
  );
}
