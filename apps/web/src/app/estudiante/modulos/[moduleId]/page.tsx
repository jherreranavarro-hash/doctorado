"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError, API_BASE_URL } from "@/lib/api";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Badge } from "../../_components/Badge";
import { DIFFICULTY_COLOR, DIFFICULTY_LABEL, EXERCISE_TYPE_LABEL } from "../../_lib/format";
import type { ModuleDetail, ModuleSyllabus } from "../../types";

export default function ModuleDetailPage(props: PageProps<"/estudiante/modulos/[moduleId]">) {
  const { moduleId } = use(props.params);
  const [moduleData, setModuleData] = useState<ModuleDetail | null>(null);
  const [syllabus, setSyllabus] = useState<ModuleSyllabus | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    apiFetch<ModuleDetail>(`/doctoral-learning/modules/${moduleId}`)
      .then((data) => {
        if (!cancelled) setModuleData(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "No se pudo cargar el módulo");
      });
    apiFetch<ModuleSyllabus | null>(`/program-modules/${moduleId}/syllabus/meta`)
      .then((data) => {
        if (!cancelled) setSyllabus(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [moduleId]);

  if (error) {
    return (
      <main className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
        <p role="alert" className="text-peligro">
          {error}
        </p>
      </main>
    );
  }

  if (!moduleData) {
    return (
      <main className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
        <p className="text-ink-suave">Cargando…</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
      <Link href="/estudiante" className="text-azul2 font-semibold link-pill">
        ← Mis módulos
      </Link>
      <h1 className="text-2xl font-bold text-navy-txt mt-2 mb-1">{moduleData.title}</h1>
      {syllabus ? (
        <a
          href={`${API_BASE_URL}/program-modules/${moduleData.moduleId}/syllabus`}
          target="_blank"
          rel="noopener"
          className="text-azul2 underline text-sm inline-block mb-6"
        >
          Descargar syllabus ({syllabus.fileName})
        </a>
      ) : (
        <p className="mb-6" />
      )}

      <div className="flex flex-col gap-8">
        {moduleData.topics.map((topic) => (
          <section key={topic.topicId}>
            <h2 className="text-xl font-bold text-navy-txt mb-3">{topic.title}</h2>

            {topic.conceptContent ? (
              <Card className="mb-4">
                <p className="font-semibold text-ink text-lg mb-3">{topic.conceptContent.summary}</p>
                <p className="text-ink whitespace-pre-wrap leading-relaxed mb-4">{topic.conceptContent.body}</p>
                {topic.conceptContent.keyIdeas.length > 0 ? (
                  <>
                    <p className="text-sm font-semibold text-ink-suave mb-1">Ideas clave</p>
                    <ul className="list-disc pl-5 flex flex-col gap-1">
                      {topic.conceptContent.keyIdeas.map((idea, i) => (
                        <li key={i} className="text-ink text-sm">
                          {idea}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </Card>
            ) : (
              <Card className="mb-4">
                <p className="text-ink-suave text-sm">
                  El contenido conceptual de este tema todavía no está disponible.
                </p>
              </Card>
            )}

            <div className="flex flex-col gap-3">
              {topic.exercises.map((exercise) => (
                <Link
                  key={exercise.id}
                  href={`/estudiante/modulos/${moduleData.moduleId}/ejercicios/${exercise.id}`}
                  className="tap-target block"
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <p className="text-ink font-medium flex-1">{exercise.statement}</p>
                      <Badge className={DIFFICULTY_COLOR[exercise.difficulty]}>
                        {DIFFICULTY_LABEL[exercise.difficulty]}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-ink-suave">{EXERCISE_TYPE_LABEL[exercise.type]}</span>
                      {exercise.attempted ? (
                        exercise.type === "mc" ? (
                          <Badge
                            className={
                              exercise.lastIsCorrect
                                ? "text-exito border-exito/40 bg-exito/10"
                                : "text-peligro border-peligro/40 bg-peligro/10"
                            }
                          >
                            {exercise.lastIsCorrect ? "Tu último intento: correcto" : "Tu último intento: incorrecto"}
                          </Badge>
                        ) : (
                          <Badge className="text-azul2 border-azul2/40 bg-azul2/10">
                            Tu último puntaje: {exercise.lastSemanticScore ?? 0}/100
                          </Badge>
                        )
                      ) : (
                        <Badge className="text-ink-suave border-borde bg-paper">Sin intentar</Badge>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        {moduleData.examAvailable ? (
          <Link href={`/estudiante/modulos/${moduleData.moduleId}/examen`} className="tap-target">
            <Button className="w-full sm:w-auto">Rendir examen final</Button>
          </Link>
        ) : null}
        {moduleData.surveyAvailable ? (
          moduleData.surveySubmitted ? (
            <span className="tap-target text-exito text-sm font-semibold">
              Ya respondiste la encuesta de cierre de este módulo.
            </span>
          ) : (
            <Link href={`/estudiante/modulos/${moduleData.moduleId}/encuesta`} className="tap-target">
              <Button variant="secondary" className="w-full sm:w-auto">
                Encuesta de cierre
              </Button>
            </Link>
          )
        ) : null}
      </div>
    </main>
  );
}
