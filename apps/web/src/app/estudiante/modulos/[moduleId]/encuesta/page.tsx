"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { formatDateTime } from "../../../_lib/format";
import type { ModuleSurvey, SurveySubmitResult } from "../../../types";

interface AnswerDraft {
  likertValue?: number;
  textValue?: string;
}

const LIKERT_VALUES = [1, 2, 3, 4, 5];

export default function SurveyPage(props: PageProps<"/estudiante/modulos/[moduleId]/encuesta">) {
  const { moduleId } = use(props.params);

  const [survey, setSurvey] = useState<ModuleSurvey | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerDraft>>({});
  const [loadError, setLoadError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<ModuleSurvey>(`/doctoral-learning/modules/${moduleId}/survey`)
      .then((data) => {
        if (!cancelled) setSurvey(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : "No se pudo cargar la encuesta");
      });
    return () => {
      cancelled = true;
    };
  }, [moduleId]);

  async function handleSubmit() {
    if (!survey) return;
    setSubmitError(undefined);
    setSubmitting(true);
    try {
      await apiFetch<SurveySubmitResult>(`/doctoral-learning/modules/${moduleId}/survey/responses`, {
        method: "POST",
        body: JSON.stringify({
          answers: survey.questions
            .map((q) => ({ questionId: q.questionId, ...answers[q.questionId] }))
            .filter((a) => a.likertValue !== undefined || (a.textValue ?? "").trim() !== ""),
        }),
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "No se pudo enviar la encuesta");
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

  if (!survey) {
    return (
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <p className="text-ink-suave">Cargando…</p>
      </main>
    );
  }

  if (survey.alreadySubmitted || submitted) {
    return (
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <Link href={`/estudiante/modulos/${moduleId}`} className="text-azul2 font-semibold link-pill">
          ← Volver al módulo
        </Link>
        <Card className="mt-4">
          <p className="text-ink font-semibold mb-1">Ya completaste esta encuesta.</p>
          <p className="text-sm text-ink-suave">
            Gracias por tu retroalimentación{survey.submittedAt ? ` (enviada el ${formatDateTime(survey.submittedAt)})` : ""}.
          </p>
        </Card>
      </main>
    );
  }

  const hasAnyAnswer = survey.questions.some((q) => {
    const a = answers[q.questionId];
    return a?.likertValue !== undefined || (a?.textValue ?? "").trim() !== "";
  });

  return (
    <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
      <Link href={`/estudiante/modulos/${moduleId}`} className="text-azul2 font-semibold link-pill">
        ← Volver al módulo
      </Link>
      <h1 className="text-2xl font-bold text-navy-txt mt-2 mb-1">{survey.title}</h1>
      <p className="text-sm text-ink-suave mb-6">Tu opinión es anónima para efectos de análisis agregado del programa.</p>

      <div className="flex flex-col gap-4">
        {survey.questions.map((q) => (
          <Card key={q.questionId}>
            <p className="text-ink font-medium mb-3">{q.prompt}</p>
            {q.type === "likert_1_5" ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-ink-suave">Nada</span>
                {LIKERT_VALUES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => ({ ...prev, [q.questionId]: { likertValue: value } }))
                    }
                    className={`tap-target min-w-[44px] justify-center rounded-[var(--radius-sm)] border font-semibold ${
                      answers[q.questionId]?.likertValue === value
                        ? "border-navy bg-navy text-paper"
                        : "border-borde text-ink"
                    }`}
                  >
                    {value}
                  </button>
                ))}
                <span className="text-xs text-ink-suave">Mucho</span>
              </div>
            ) : (
              <textarea
                value={answers[q.questionId]?.textValue ?? ""}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [q.questionId]: { textValue: e.target.value } }))
                }
                rows={3}
                placeholder="Tu respuesta…"
                className="w-full rounded-[var(--radius-sm)] border border-borde bg-paper px-3 py-2 text-ink placeholder:text-ink-suave"
              />
            )}
          </Card>
        ))}
      </div>

      {submitError ? (
        <p role="alert" className="text-peligro mt-4">
          {submitError}
        </p>
      ) : null}

      <Button type="button" className="w-full mt-6" onClick={handleSubmit} disabled={!hasAnyAnswer || submitting}>
        {submitting ? "Enviando…" : "Enviar encuesta"}
      </Button>
    </main>
  );
}
