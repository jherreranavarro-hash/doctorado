"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { Card } from "@/components/Card";
import { CollectionHero } from "@/components/CollectionHero";
import { IndexCard } from "@/components/IndexCard";
import { FolderIcon } from "@/components/icons";
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
  const [search, setSearch] = useState("");

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

  const filteredModules = useMemo(() => {
    if (!modules) return null;
    const q = search.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter(
      (m) => m.title.toLowerCase().includes(q) || m.programName.toLowerCase().includes(q),
    );
  }, [modules, search]);

  return (
    <main className="flex-1 px-4 pb-8 max-w-3xl mx-auto w-full">
      <CollectionHero
        variant="estudiante"
        title="Mis módulos"
        subtitle={
          modules && modules.length > 0
            ? `${modules.length} ${modules.length === 1 ? "módulo inscrito" : "módulos inscritos"}`
            : "Aquí verás los módulos en los que estás inscrito."
        }
        searchValue={search}
        onSearchChange={modules && modules.length > 0 ? setSearch : undefined}
        searchPlaceholder="Buscar módulo o programa…"
        action={
          <Link
            href="/estudiante/tareas"
            className="tap-target text-paper2 font-semibold text-sm bg-paper2/15 hover:bg-paper2/25 transition-colors rounded-full px-4"
          >
            Ver mis tareas →
          </Link>
        }
      />

      <div>
        {error ? (
          <p role="alert" className="text-peligro mb-4">
            {error}
          </p>
        ) : null}

        {!filteredModules ? (
          <p className="text-ink-suave">Cargando…</p>
        ) : filteredModules.length === 0 ? (
          <Card>
            <p className="text-ink-suave">
              {modules && modules.length > 0
                ? "Ningún módulo coincide con tu búsqueda."
                : "Todavía no estás inscrito en ningún módulo."}
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredModules.map((m) => {
              const progressPercent =
                m.exercisesTotal > 0 ? Math.round((m.exercisesAttempted / m.exercisesTotal) * 100) : 0;
              return (
                <Link key={m.moduleId} href={`/estudiante/modulos/${m.moduleId}`} className="tap-target block">
                  <IndexCard
                    variant="estudiante"
                    icon={<FolderIcon className="h-full w-full" />}
                    title={m.title}
                    meta={`${m.programName} · Semestre ${m.semester} · ${m.credits} créditos`}
                    trailing={
                      <Badge className={MODULE_STATUS_COLOR[m.status]}>{MODULE_STATUS_LABEL[m.status]}</Badge>
                    }
                  >
                    <div className="mt-3">
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

                    {m.hasExam || m.hasSurvey ? (
                      <div className="mt-3 pt-3 border-t border-borde flex flex-wrap gap-2">
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
                    ) : null}
                  </IndexCard>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
