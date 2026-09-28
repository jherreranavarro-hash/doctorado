"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Badge } from "../../../../_components/Badge";
import { DIFFICULTY_COLOR, DIFFICULTY_LABEL, EXERCISE_TYPE_LABEL } from "../../../../_lib/format";
import type {
  ExerciseAttemptResult,
  ExerciseHint,
  ExerciseHintsResponse,
  ModuleDetail,
  ModuleExercise,
} from "../../../../types";

export default function ExercisePage(
  props: PageProps<"/estudiante/modulos/[moduleId]/ejercicios/[exerciseId]">,
) {
  const { moduleId, exerciseId } = use(props.params);

  const [exercise, setExercise] = useState<ModuleExercise | null>(null);
  const [topicTitle, setTopicTitle] = useState<string>("");
  const [loadError, setLoadError] = useState<string>();

  const [selectedOptionKey, setSelectedOptionKey] = useState<string>("");
  const [responseText, setResponseText] = useState("");

  const [hints, setHints] = useState<ExerciseHint[] | null>(null);
  const [revealedCount, setRevealedCount] = useState(0);
  const [loadingHints, setLoadingHints] = useState(false);

  const [result, setResult] = useState<ExerciseAttemptResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    // No hay un GET de un solo ejercicio — se busca dentro del detalle del
    // módulo (mismo dato que ya vio el alumno en la pantalla anterior).
    apiFetch<ModuleDetail>(`/doctoral-learning/modules/${moduleId}`)
      .then((data) => {
        if (cancelled) return;
        for (const topic of data.topics) {
          const found = topic.exercises.find((ex) => ex.id === exerciseId);
          if (found) {
            setExercise(found);
            setTopicTitle(topic.title);
            return;
          }
        }
        setLoadError("Ejercicio no encontrado en este módulo");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : "No se pudo cargar el ejercicio");
      });
    return () => {
      cancelled = true;
    };
  }, [moduleId, exerciseId]);

  async function handleRequestHint() {
    if (hints === null) {
      setLoadingHints(true);
      try {
        const data = await apiFetch<ExerciseHintsResponse>(`/doctoral-learning/exercises/${exerciseId}/hints`);
        setHints(data.hints);
        setRevealedCount(data.hints.length > 0 ? 1 : 0);
      } catch (err) {
        setSubmitError(err instanceof ApiError ? err.message : "No se pudieron cargar las pistas");
      } finally {
        setLoadingHints(false);
      }
      return;
    }
    setRevealedCount((n) => Math.min(n + 1, hints.length));
  }

  async function handleSubmit() {
    if (!exercise) return;
    setSubmitError(undefined);
    setSubmitting(true);
    try {
      const outcome = await apiFetch<ExerciseAttemptResult>(
        `/doctoral-learning/exercises/${exerciseId}/attempts`,
        {
          method: "POST",
          body: JSON.stringify(
            exercise.type === "mc"
              ? { selectedOptionKey, hintsUsed: revealedCount }
              : { responseText, hintsUsed: revealedCount },
          ),
        },
      );
      setResult(outcome);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "No se pudo enviar tu respuesta");
    } finally {
      setSubmitting(false);
    }
  }

  function handleRetry() {
    setResult(null);
    setSelectedOptionKey("");
    setResponseText("");
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

  if (!exercise) {
    return (
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <p className="text-ink-suave">Cargando…</p>
      </main>
    );
  }

  const canSubmit = exercise.type === "mc" ? selectedOptionKey !== "" : responseText.trim() !== "";
  const hintsExhausted = hints !== null && revealedCount >= hints.length;

  return (
    <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
      <Link href={`/estudiante/modulos/${moduleId}`} className="text-azul2 font-semibold link-pill">
        ← {topicTitle || "Volver al módulo"}
      </Link>

      <div className="flex items-start justify-between gap-3 flex-wrap mt-2 mb-4">
        <h1 className="text-xl font-bold text-navy-txt">Ejercicio de práctica</h1>
        <Badge className={DIFFICULTY_COLOR[exercise.difficulty]}>{DIFFICULTY_LABEL[exercise.difficulty]}</Badge>
      </div>

      <Card className="mb-4">
        <p className="text-xs font-semibold text-ink-suave mb-2">{EXERCISE_TYPE_LABEL[exercise.type]}</p>
        {exercise.scenario ? <p className="text-ink-suave text-sm mb-3 italic">{exercise.scenario}</p> : null}
        <p className="text-ink font-medium mb-4">{exercise.statement}</p>

        {exercise.type === "mc" && exercise.options ? (
          <div className="flex flex-col gap-2">
            {exercise.options.map((opt) => {
              const isCorrectReveal = result && result.correctOptionKey === opt.optionKey;
              return (
                <label
                  key={opt.optionKey}
                  className={`flex items-center gap-2 text-sm rounded-[var(--radius-sm)] border px-3 py-2 ${
                    isCorrectReveal ? "border-exito bg-exito/10" : "border-borde"
                  }`}
                >
                  <input
                    type="radio"
                    name="option"
                    value={opt.optionKey}
                    disabled={result !== null}
                    checked={selectedOptionKey === opt.optionKey}
                    onChange={() => setSelectedOptionKey(opt.optionKey)}
                  />
                  <span className="text-ink">
                    {opt.optionKey}) {opt.text}
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <textarea
            value={responseText}
            disabled={result !== null}
            onChange={(e) => setResponseText(e.target.value)}
            rows={6}
            placeholder="Escribe tu respuesta…"
            className="w-full rounded-[var(--radius-sm)] border border-borde bg-paper px-3 py-2 text-ink placeholder:text-ink-suave"
          />
        )}
      </Card>

      <Card className="mb-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-sm font-semibold text-ink">Pistas</p>
          <Button
            type="button"
            variant="secondary"
            onClick={handleRequestHint}
            disabled={loadingHints || hintsExhausted}
          >
            {loadingHints ? "Cargando…" : hintsExhausted ? "No hay más pistas" : "Ver siguiente pista"}
          </Button>
        </div>
        {hints && revealedCount > 0 ? (
          <ol className="list-decimal pl-5 flex flex-col gap-1">
            {hints.slice(0, revealedCount).map((h) => (
              <li key={h.order} className="text-sm text-ink">
                {h.text}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-ink-suave">Pide una pista si necesitas ayuda para resolver el ejercicio.</p>
        )}
      </Card>

      {submitError ? (
        <p role="alert" className="text-peligro mb-4">
          {submitError}
        </p>
      ) : null}

      {result ? (
        <Card className={`mb-4 ${result.isCorrect ? "border-exito" : "border-peligro"}`}>
          <p className={`font-bold mb-1 ${result.isCorrect ? "text-exito" : "text-peligro"}`}>
            {result.isCorrect ? "Respuesta correcta" : "Respuesta incorrecta"}
          </p>
          {result.semanticScore !== null ? (
            <p className="text-sm text-ink mb-1">Puntaje semántico: {result.semanticScore}/100</p>
          ) : null}
          <p className="text-sm text-ink">{result.feedback}</p>
        </Card>
      ) : null}

      <div className="flex gap-3">
        {result ? (
          <Button type="button" variant="secondary" onClick={handleRetry}>
            Intentar de nuevo
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? "Enviando…" : "Enviar respuesta"}
          </Button>
        )}
      </div>
    </main>
  );
}
