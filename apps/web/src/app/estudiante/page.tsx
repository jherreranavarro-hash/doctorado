"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { Card } from "@/components/Card";
import { Badge } from "./_components/Badge";
import {
  EXAM_STATUS_COLOR,
  EXAM_STATUS_LABEL,
  MODULE_STATUS_COLOR,
  MODULE_STATUS_LABEL,
} from "./_lib/format";
import type { EnrolledModuleSummary, ModuleProgress } from "./types";

interface ModuleCardData {
  moduleId: string;
  title: string;
  programName: string;
  semester: number;
  credits: number;
  status: EnrolledModuleSummary["status"];
  exercisesAttempted: number;
  exercisesTotal: number;
  hasExam: boolean;
  hasSurvey: boolean;
  examStatus: ModuleProgress["examStatus"];
  bestExamScore: number | null;
  surveySubmitted: boolean;
}

export default function EstudianteDashboardPage() {
  const [modules, setModules] = useState<ModuleCardData[] | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch<EnrolledModuleSummary[]>("/doctoral-learning/modules"),
      apiFetch<ModuleProgress[]>("/doctoral-learning/me/progress"),
    ])
      .then(([summaries, progress]) => {
        if (cancelled) return;
        const progressByModuleId = new Map(progress.map((p) => [p.moduleId, p]));
        setModules(
          summaries.map((s) => {
            const p = progressByModuleId.get(s.moduleId);
            return {
              moduleId: s.moduleId,
              title: s.title,
              programName: s.programName,
              semester: s.semester,
              credits: s.credits,
              status: s.status,
              exercisesAttempted: s.exercisesAttempted,
              exercisesTotal: s.exercisesTotal,
              hasExam: s.hasExam,
              hasSurvey: s.hasSurvey,
              examStatus: p?.examStatus ?? "not_started",
              bestExamScore: p?.bestExamScore ?? null,
              surveySubmitted: p?.surveySubmitted ?? false,
            };
          }),
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "No se pudieron cargar tus módulos");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3 mb-8 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-navy-txt">Mis módulos</h1>
          {modules && modules.length > 0 ? (
            <p className="text-sm text-ink-suave mt-0.5">
              {modules.length} {modules.length === 1 ? "módulo inscrito" : "módulos inscritos"}
            </p>
          ) : null}
        </div>
        <Link
          href="/estudiante/tareas"
          className="tap-target text-azul2 font-semibold link-pill hover:underline"
        >
          Ver mis tareas →
        </Link>
      </div>

      {error ? (
        <p role="alert" className="text-peligro mb-4">
          {error}
        </p>
      ) : null}

      {!modules ? (
        <p className="text-ink-suave">Cargando…</p>
      ) : modules.length === 0 ? (
        <Card>
          <p className="text-ink-suave">Todavía no estás inscrito en ningún módulo.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {modules.map((m) => {
            const progressPercent =
              m.exercisesTotal > 0 ? Math.round((m.exercisesAttempted / m.exercisesTotal) * 100) : 0;
            return (
              <Link key={m.moduleId} href={`/estudiante/modulos/${m.moduleId}`} className="tap-target block">
                <Card className="hover:shadow-[var(--shadow-hover)] hover:border-borde-fuerte hover:-translate-y-0.5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h2 className="text-lg font-bold text-navy-txt">{m.title}</h2>
                      <p className="text-sm text-ink-suave mt-0.5">
                        {m.programName} · Semestre {m.semester} · {m.credits} créditos
                      </p>
                    </div>
                    <Badge className={MODULE_STATUS_COLOR[m.status]}>{MODULE_STATUS_LABEL[m.status]}</Badge>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs font-semibold text-ink-suave mb-1.5">
                      <span>Ejercicios</span>
                      <span>
                        {m.exercisesAttempted}/{m.exercisesTotal}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-borde/60 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-azul2 transition-[width] duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-borde flex flex-wrap gap-2">
                    {m.hasExam ? (
                      <Badge className={EXAM_STATUS_COLOR[m.examStatus]}>
                        Examen: {EXAM_STATUS_LABEL[m.examStatus]}
                        {m.bestExamScore !== null ? ` (${m.bestExamScore}/70)` : ""}
                      </Badge>
                    ) : null}
                    {m.hasSurvey ? (
                      <Badge
                        className={
                          m.surveySubmitted
                            ? "text-exito border-exito/40 bg-exito/15"
                            : "text-ink-suave border-borde bg-borde/50"
                        }
                      >
                        {m.surveySubmitted ? "Encuesta enviada" : "Encuesta pendiente"}
                      </Badge>
                    ) : null}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
