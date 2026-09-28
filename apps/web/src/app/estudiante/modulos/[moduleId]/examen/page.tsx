"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { formatCountdown } from "../../../_lib/format";
import type { ExamAttemptView, SubmitExamAnswerResult } from "../../../types";

interface AnswerDraft {
  selectedOptionKey: string;
  responseText: string;
}

function draftsFromAttempt(attempt: ExamAttemptView): Record<string, AnswerDraft> {
  const drafts: Record<string, AnswerDraft> = {};
  for (const q of attempt.questions) {
    drafts[q.questionId] = {
      selectedOptionKey: q.yourAnswer?.selectedOptionKey ?? "",
      responseText: q.yourAnswer?.responseText ?? "",
    };
  }
  return drafts;
}

export default function ExamPage(props: PageProps<"/estudiante/modulos/[moduleId]/examen">) {
  const { moduleId } = use(props.params);

  const [attempt, setAttempt] = useState<ExamAttemptView | null>(null);
  const [drafts, setDrafts] = useState<Record<string, AnswerDraft>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadError, setLoadError] = useState<string>();

  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const [savedQuestionId, setSavedQuestionId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string>();

  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  const [now, setNow] = useState(() => Date.now());
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<ExamAttemptView>(`/doctoral-learning/modules/${moduleId}/exam/start`, { method: "POST" })
      .then((data) => {
        if (cancelled) return;
        setAttempt(data);
        setDrafts(draftsFromAttempt(data));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : "No se pudo iniciar el examen");
      });
    return () => {
      cancelled = true;
    };
  }, [moduleId]);

  useEffect(() => {
    if (!attempt || attempt.status !== "in_progress") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [attempt]);

  const remainingMs = attempt ? new Date(attempt.expiresAt).getTime() - now : 0;

  async function handleSubmit() {
    if (!attempt) return;
    setSubmitError(undefined);
    setSubmitting(true);
    try {
      const finished = await apiFetch<ExamAttemptView>(
        `/doctoral-learning/exam-attempts/${attempt.attemptId}/submit`,
        { method: "POST" },
      );
      setAttempt(finished);
      setConfirmingSubmit(false);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "No se pudo entregar el examen");
    } finally {
      setSubmitting(false);
    }
  }

  // Entrega automática al agotarse el tiempo — el backend ya cierra
  // intentos vencidos de forma perezosa, pero conviene reflejarlo en la UI
  // sin que el alumno tenga que recargar la página.
  useEffect(() => {
    if (!attempt || attempt.status !== "in_progress") return;
    if (remainingMs > 0) return;
    if (autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs, attempt]);

  async function handleSaveAnswer(questionId: string) {
    if (!attempt) return;
    const question = attempt.questions.find((q) => q.questionId === questionId);
    if (!question) return;
    setSaveError(undefined);
    setSavedQuestionId(null);
    setSavingQuestionId(questionId);
    try {
      const draft = drafts[questionId];
      const result = await apiFetch<SubmitExamAnswerResult>(
        `/doctoral-learning/exam-attempts/${attempt.attemptId}/answers`,
        {
          method: "POST",
          body: JSON.stringify(
            question.type === "mc"
              ? { questionId, selectedOptionKey: draft?.selectedOptionKey || undefined }
              : { questionId, responseText: draft?.responseText || undefined },
          ),
        },
      );
      setAttempt((prev) =>
        prev
          ? {
              ...prev,
              questions: prev.questions.map((q) => (q.questionId === questionId ? { ...q, answered: true } : q)),
            }
          : prev,
      );
      setSavedQuestionId(result.questionId);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "No se pudo guardar tu respuesta");
    } finally {
      setSavingQuestionId(null);
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

  if (!attempt) {
    return (
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <p className="text-ink-suave">Preparando tu examen…</p>
      </main>
    );
  }

  const finished = attempt.status !== "in_progress";

  if (finished) {
    return (
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <Link href={`/estudiante/modulos/${moduleId}`} className="text-azul2 font-semibold link-pill">
          ← Volver al módulo
        </Link>
        <h1 className="text-2xl font-bold text-navy-txt mt-2 mb-4">Resultado del examen</h1>

        <Card className={`mb-6 ${attempt.passed ? "border-exito" : "border-peligro"}`}>
          <p className="text-sm text-ink-suave mb-1">
            {attempt.status === "expired" ? "Se agotó el tiempo disponible." : "Examen entregado."}
          </p>
          <p className="text-3xl font-bold text-navy-txt">Nota: {attempt.score}/70</p>
          <p className={`font-semibold mt-1 ${attempt.passed ? "text-exito" : "text-peligro"}`}>
            {attempt.passed ? "Aprobado" : "No aprobado"}
          </p>
        </Card>

        <div className="flex flex-col gap-4">
          {attempt.questions.map((q, i) => (
            <Card key={q.questionId}>
              <p className="text-xs font-semibold text-ink-suave mb-1">Pregunta {i + 1}</p>
              {q.scenario ? <p className="text-sm italic text-ink-suave mb-2">{q.scenario}</p> : null}
              <p className="text-ink font-medium mb-3">{q.statement}</p>

              {q.type === "mc" && q.options ? (
                <div className="flex flex-col gap-1 mb-2">
                  {q.options.map((opt) => {
                    const isYours = q.yourAnswer?.selectedOptionKey === opt.optionKey;
                    const isCorrect = q.correctOptionKey === opt.optionKey;
                    return (
                      <p
                        key={opt.optionKey}
                        className={`text-sm rounded-[var(--radius-sm)] border px-2 py-1 ${
                          isCorrect
                            ? "border-exito bg-exito/10 text-ink"
                            : isYours
                              ? "border-peligro bg-peligro/10 text-ink"
                              : "border-borde text-ink-suave"
                        }`}
                      >
                        {opt.optionKey}) {opt.text}
                        {isCorrect ? " — correcta" : isYours ? " — tu respuesta" : ""}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <div className="mb-2">
                  <p className="text-xs font-semibold text-ink-suave">Tu respuesta</p>
                  <p className="text-sm text-ink whitespace-pre-wrap">
                    {q.yourAnswer?.responseText || "(sin respuesta)"}
                  </p>
                  {q.semanticScore !== null ? (
                    <p className="text-sm text-ink mt-1">Puntaje semántico: {q.semanticScore}/100</p>
                  ) : null}
                  {q.modelAnswer && q.modelAnswer.keyPoints.length > 0 ? (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-ink-suave">Puntos clave esperados</p>
                      <ul className="list-disc pl-5">
                        {q.modelAnswer.keyPoints.map((kp, idx) => (
                          <li key={idx} className="text-sm text-ink">
                            {kp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}

              <p className={`text-sm font-semibold ${q.isCorrect ? "text-exito" : "text-peligro"}`}>
                {q.isCorrect ? "Correcta" : "Incorrecta"}
              </p>
            </Card>
          ))}
        </div>
      </main>
    );
  }

  const question = attempt.questions[currentIndex];
  const draft = drafts[question.questionId] ?? { selectedOptionKey: "", responseText: "" };
  const answeredCount = attempt.questions.filter((q) => q.answered).length;

  return (
    <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <h1 className="text-xl font-bold text-navy-txt">Prueba final — sin ayuda</h1>
        <span className={`font-bold tabular-nums ${remainingMs < 5 * 60_000 ? "text-peligro" : "text-navy-txt"}`}>
          {formatCountdown(remainingMs)}
        </span>
      </div>
      <p className="text-sm text-ink-suave mb-4">
        Este examen no tiene pistas. Respondidas: {answeredCount}/{attempt.questionCount}.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {attempt.questions.map((q, i) => (
          <button
            key={q.questionId}
            type="button"
            onClick={() => setCurrentIndex(i)}
            className={`tap-target min-w-[44px] justify-center rounded-[var(--radius-sm)] border px-2 text-sm font-semibold ${
              i === currentIndex
                ? "border-navy bg-navy text-paper"
                : q.answered
                  ? "border-exito bg-exito/10 text-exito"
                  : "border-borde text-ink-suave"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <Card className="mb-4">
        <p className="text-xs font-semibold text-ink-suave mb-2">Pregunta {currentIndex + 1}</p>
        {question.scenario ? <p className="text-sm italic text-ink-suave mb-2">{question.scenario}</p> : null}
        <p className="text-ink font-medium mb-4">{question.statement}</p>

        {question.type === "mc" && question.options ? (
          <div className="flex flex-col gap-2">
            {question.options.map((opt) => (
              <label
                key={opt.optionKey}
                className="flex items-center gap-2 text-sm rounded-[var(--radius-sm)] border border-borde px-3 py-2"
              >
                <input
                  type="radio"
                  name={`q-${question.questionId}`}
                  value={opt.optionKey}
                  checked={draft.selectedOptionKey === opt.optionKey}
                  onChange={() =>
                    setDrafts((prev) => ({
                      ...prev,
                      [question.questionId]: { ...draft, selectedOptionKey: opt.optionKey },
                    }))
                  }
                />
                <span className="text-ink">
                  {opt.optionKey}) {opt.text}
                </span>
              </label>
            ))}
          </div>
        ) : (
          <textarea
            value={draft.responseText}
            onChange={(e) =>
              setDrafts((prev) => ({ ...prev, [question.questionId]: { ...draft, responseText: e.target.value } }))
            }
            rows={6}
            placeholder="Escribe tu respuesta…"
            className="w-full rounded-[var(--radius-sm)] border border-borde bg-paper px-3 py-2 text-ink placeholder:text-ink-suave"
          />
        )}

        {saveError ? (
          <p role="alert" className="text-peligro text-sm mt-2">
            {saveError}
          </p>
        ) : null}
        {savedQuestionId === question.questionId ? (
          <p className="text-exito text-sm mt-2">Respuesta guardada.</p>
        ) : null}

        <div className="flex justify-end mt-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleSaveAnswer(question.questionId)}
            disabled={savingQuestionId === question.questionId}
          >
            {savingQuestionId === question.questionId ? "Guardando…" : "Guardar respuesta"}
          </Button>
        </div>
      </Card>

      <div className="flex justify-between gap-3 mb-8">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          ← Anterior
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setCurrentIndex((i) => Math.min(attempt.questions.length - 1, i + 1))}
          disabled={currentIndex === attempt.questions.length - 1}
        >
          Siguiente →
        </Button>
      </div>

      {submitError ? (
        <p role="alert" className="text-peligro mb-4">
          {submitError}
        </p>
      ) : null}

      {confirmingSubmit ? (
        <Card className="border-peligro">
          <p className="text-ink font-semibold mb-2">¿Entregar el examen ahora?</p>
          <p className="text-sm text-ink-suave mb-4">
            Esta es la prueba final sin ayuda: una vez entregada no podrás cambiar tus respuestas, y las preguntas
            sin responder cuentan como incorrectas.
          </p>
          <div className="flex gap-3">
            <Button type="button" variant="danger" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Entregando…" : "Sí, entregar examen"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setConfirmingSubmit(false)}>
              Cancelar
            </Button>
          </div>
        </Card>
      ) : (
        <Button type="button" variant="danger" className="w-full" onClick={() => setConfirmingSubmit(true)}>
          Entregar examen
        </Button>
      )}
    </main>
  );
}
