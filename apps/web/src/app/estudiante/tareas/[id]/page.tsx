"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch, apiFetchBlob, ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Badge } from "../../_components/Badge";
import {
  ASSIGNMENT_STATUS_LABEL,
  formatDate,
  SUBMISSION_STATUS_COLOR,
  SUBMISSION_STATUS_LABEL,
} from "../../_lib/format";
import type { AssignmentDetail, UploadedFileResult } from "../../types";

const QUESTION_TYPE_LABEL: Record<string, string> = {
  mc: "Alternativas",
  short_answer: "Respuesta breve",
  essay: "Desarrollo",
  file_upload: "Archivo adjunto",
};

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

interface AnswerDraft {
  responseText?: string;
  selectedOptionKey?: string;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function downloadFile(fileId: string, suggestedName: string) {
  const blob = await apiFetchBlob(`/doctoral-assignments/files/${fileId}`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AssignmentDetailPage(props: PageProps<"/estudiante/tareas/[id]">) {
  const { id } = use(props.params);

  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerDraft>>({});
  const [fileId, setFileId] = useState<string | undefined>(undefined);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");

  const [loadError, setLoadError] = useState<string>();
  const [uploadError, setUploadError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();
  const [downloadError, setDownloadError] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function applyAssignment(data: AssignmentDetail) {
    setAssignment(data);
    const initial: Record<string, AnswerDraft> = {};
    for (const q of data.questions) {
      initial[q.questionId] = { responseText: q.responseText, selectedOptionKey: q.selectedOptionKey };
    }
    setAnswers(initial);
    setFileId(data.submissionFileId ?? undefined);
  }

  useEffect(() => {
    let cancelled = false;
    apiFetch<AssignmentDetail>(`/doctoral-assignments/me/${id}`)
      .then((data) => {
        if (!cancelled) applyAssignment(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : "No se pudo cargar la tarea");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(undefined);
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError("El archivo supera el tamaño máximo permitido (15MB)");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const base64Data = await readFileAsBase64(file);
      const uploaded = await apiFetch<UploadedFileResult>("/doctoral-assignments/me/files", {
        method: "POST",
        body: JSON.stringify({ fileName: file.name, mimeType: file.type || "application/octet-stream", base64Data }),
      });
      setFileId(uploaded.id);
      setUploadedFileName(uploaded.fileName);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "No se pudo subir el archivo");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(targetFileId: string, suggestedName: string) {
    setDownloadError(undefined);
    try {
      await downloadFile(targetFileId, suggestedName);
    } catch (err) {
      setDownloadError(err instanceof ApiError ? err.message : "No se pudo descargar el archivo");
    }
  }

  async function handleSubmit() {
    if (!assignment) return;
    setSubmitError(undefined);
    setSubmitting(true);
    try {
      const updated = await apiFetch<AssignmentDetail>(`/doctoral-assignments/me/${id}/submit`, {
        method: "POST",
        body: JSON.stringify({
          answers: assignment.questions.map((q) => ({
            questionId: q.questionId,
            responseText: answers[q.questionId]?.responseText || undefined,
            selectedOptionKey: answers[q.questionId]?.selectedOptionKey || undefined,
          })),
          fileId,
        }),
      });
      applyAssignment(updated);
      setJustSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "No se pudo entregar la tarea");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <p role="alert" className="text-peligro">
          {loadError}
        </p>
      </main>
    );
  }

  if (!assignment) {
    return (
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <p className="text-ink-suave">Cargando…</p>
      </main>
    );
  }

  const closed = assignment.status === "closed";
  const hasFileUploadQuestion = assignment.questions.some((q) => q.type === "file_upload");
  const graded = assignment.submissionStatus === "graded";
  const alreadySubmitted = assignment.submissionStatus === "submitted" || graded;

  return (
    <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
      <Link href="/estudiante/tareas" className="text-azul2 font-semibold link-pill">
        ← Mis tareas
      </Link>
      <div className="flex items-start justify-between gap-3 flex-wrap mt-2 mb-1">
        <h1 className="text-2xl font-bold text-navy-txt">{assignment.title}</h1>
        <Badge className={SUBMISSION_STATUS_COLOR[assignment.submissionStatus]}>
          {SUBMISSION_STATUS_LABEL[assignment.submissionStatus]}
        </Badge>
      </div>
      <p className="text-sm text-ink-suave mb-1">
        Entrega: {formatDate(assignment.dueAt)} · Estado de la tarea: {ASSIGNMENT_STATUS_LABEL[assignment.status]}
      </p>
      {assignment.instructions ? <p className="text-ink mt-3 whitespace-pre-wrap">{assignment.instructions}</p> : null}

      {assignment.templateFileId ? (
        <Button
          type="button"
          variant="secondary"
          className="mt-3"
          onClick={() => handleDownload(assignment.templateFileId as string, `plantilla-${assignment.title}`)}
        >
          Descargar plantilla
        </Button>
      ) : null}
      {downloadError ? <p className="text-peligro text-sm mt-2">{downloadError}</p> : null}

      {closed ? (
        <Card className="mt-4">
          <p className="text-sm text-ink">Esta tarea está cerrada — ya no se pueden entregar respuestas.</p>
        </Card>
      ) : null}

      {graded && assignment.feedback ? (
        <Card className="mt-4 border-exito">
          <p className="text-sm font-semibold text-ink mb-1">
            Comentario del docente {assignment.totalScore !== null ? `· ${assignment.totalScore} pts` : ""}
          </p>
          <p className="text-sm text-ink">{assignment.feedback}</p>
        </Card>
      ) : null}

      {alreadySubmitted && !closed ? (
        <Card className="mt-4">
          <p className="text-sm text-ink">
            {graded
              ? "Esta tarea ya fue calificada. Si vuelves a entregarla, tu profesor deberá revisar de nuevo las preguntas de desarrollo."
              : "Ya entregaste esta tarea. Puedes seguir editando y reenviarla mientras siga publicada."}
          </p>
        </Card>
      ) : null}

      <div className="flex flex-col gap-4 mt-6">
        {assignment.questions.map((q, i) => (
          <Card key={q.questionId}>
            <p className="text-xs font-semibold text-ink-suave mb-1">{QUESTION_TYPE_LABEL[q.type] ?? q.type}</p>
            <p className="font-medium text-ink mb-3">
              {i + 1}. {q.prompt}
            </p>

            {q.type === "mc" && q.options ? (
              <div className="flex flex-col gap-2">
                {q.options.map((opt) => (
                  <label key={opt.key} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={q.questionId}
                      value={opt.key}
                      disabled={closed}
                      checked={answers[q.questionId]?.selectedOptionKey === opt.key}
                      onChange={() =>
                        setAnswers((prev) => ({ ...prev, [q.questionId]: { selectedOptionKey: opt.key } }))
                      }
                    />
                    <span className="text-ink">
                      {opt.key}) {opt.text}
                    </span>
                  </label>
                ))}
              </div>
            ) : q.type === "file_upload" ? (
              <p className="text-sm text-ink-suave">
                Adjunta tu archivo en la sección &quot;Archivo adjunto&quot; más abajo.
              </p>
            ) : (
              <textarea
                value={answers[q.questionId]?.responseText ?? ""}
                disabled={closed}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [q.questionId]: { responseText: e.target.value } }))
                }
                rows={q.type === "essay" ? 8 : 3}
                placeholder="Escribe tu respuesta…"
                className="w-full rounded-[var(--radius-sm)] border border-borde bg-paper px-3 py-2 text-ink placeholder:text-ink-suave"
              />
            )}

            {graded ? (
              q.score !== undefined ? (
                <p className="text-sm text-exito mt-2">
                  Puntaje: {q.score}/{q.maxScore}
                  {q.feedback ? ` — ${q.feedback}` : ""}
                </p>
              ) : (
                <p className="text-sm text-ink-suave mt-2">Pendiente de revisión del docente.</p>
              )
            ) : alreadySubmitted ? (
              <p className="text-sm text-ink-suave mt-2">Pendiente de revisión del docente.</p>
            ) : null}
          </Card>
        ))}

        {hasFileUploadQuestion || assignment.submissionFileId ? (
          <Card>
            <p className="text-xs font-semibold text-ink-suave mb-1">Archivo adjunto</p>
            {assignment.submissionFileId ? (
              <p className="text-sm text-ink mb-2">
                Ya tienes un archivo entregado.{" "}
                <button
                  type="button"
                  className="text-azul2 font-semibold underline"
                  onClick={() => handleDownload(assignment.submissionFileId as string, "mi-entrega")}
                >
                  Descargar mi archivo entregado
                </button>
              </p>
            ) : null}
            {!closed ? (
              <>
                <input ref={fileInputRef} type="file" onChange={handleFileChange} disabled={uploading} />
                {uploading ? <p className="text-sm text-ink-suave mt-1">Subiendo…</p> : null}
                {uploadedFileName ? (
                  <p className="text-sm text-exito mt-1">Archivo listo para entregar: {uploadedFileName}</p>
                ) : null}
                {uploadError ? <p className="text-sm text-peligro mt-1">{uploadError}</p> : null}
              </>
            ) : null}
          </Card>
        ) : null}
      </div>

      {submitError ? (
        <p role="alert" className="text-peligro mt-4">
          {submitError}
        </p>
      ) : null}
      {justSubmitted ? <p className="text-exito mt-4">Tarea entregada — tu profesor la revisará pronto.</p> : null}

      {!closed ? (
        <Button type="button" className="w-full mt-6" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Entregando…" : "Entregar tarea"}
        </Button>
      ) : null}
    </main>
  );
}
