"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { FormField } from "@/components/FormField";
import { CheckboxList } from "../../../../_components/CheckboxList";
import {
  ASSIGNMENT_QUESTION_TYPES,
  type AssignmentQuestionInput,
  type AssignmentQuestionType,
  type CohortHeatmap,
  type CohortKpis,
  type CreateAssignmentBody,
  type CreatedAssignment,
  type StudentGroup,
  type UploadedFile,
} from "../../../../types";

const TYPE_LABEL: Record<AssignmentQuestionType, string> = {
  mc: "Selección múltiple",
  short_answer: "Respuesta breve",
  essay: "Desarrollo / ensayo",
  file_upload: "Carga de archivo",
};

type Target = "cohort" | "students" | "groups";

interface DraftOption {
  key: string;
  text: string;
}

interface DraftQuestion {
  tempId: string;
  type: AssignmentQuestionType;
  prompt: string;
  maxScore: string;
  options: DraftOption[];
  correctOptionKey: string;
}

let nextTempId = 1;

function blankQuestion(): DraftQuestion {
  return {
    tempId: `q${nextTempId++}`,
    type: "essay",
    prompt: "",
    maxScore: "100",
    options: [
      { key: "a", text: "" },
      { key: "b", text: "" },
    ],
    correctOptionKey: "a",
  };
}

export default function NewAssignmentPage({ params }: PageProps<"/docente/cohortes/[cohortId]/tareas/nueva">) {
  const { cohortId } = use(params);
  const router = useRouter();

  const [roster, setRoster] = useState<CohortHeatmap["students"]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [modules, setModules] = useState<CohortKpis["moduleStats"]>([]);

  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([blankQuestion()]);

  const [target, setTarget] = useState<Target>("cohort");
  const [targetStudentIds, setTargetStudentIds] = useState<string[]>([]);
  const [targetGroupIds, setTargetGroupIds] = useState<string[]>([]);

  const [templateFile, setTemplateFile] = useState<UploadedFile>();
  const [uploadingFile, setUploadingFile] = useState(false);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();
  const [created, setCreated] = useState<CreatedAssignment>();
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    apiFetch<CohortHeatmap>(`/doctoral-analytics/cohorts/${cohortId}/heatmap`)
      .then((h) => setRoster(h.students))
      .catch(() => undefined);
    apiFetch<StudentGroup[]>(`/doctoral-assignments/cohorts/${cohortId}/groups`)
      .then(setGroups)
      .catch(() => undefined);
    apiFetch<CohortKpis>(`/doctoral-analytics/cohorts/${cohortId}/kpis`)
      .then((k) => setModules(k.moduleStats))
      .catch(() => undefined);
  }, [cohortId]);

  function updateQuestion(tempId: string, patch: Partial<DraftQuestion>) {
    setQuestions((qs) => qs.map((q) => (q.tempId === tempId ? { ...q, ...patch } : q)));
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, blankQuestion()]);
  }

  function removeQuestion(tempId: string) {
    setQuestions((qs) => (qs.length > 1 ? qs.filter((q) => q.tempId !== tempId) : qs));
  }

  function addOption(tempId: string) {
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.tempId !== tempId) return q;
        const nextKey = String.fromCharCode(97 + q.options.length);
        return { ...q, options: [...q.options, { key: nextKey, text: "" }] };
      }),
    );
  }

  function removeOption(tempId: string, key: string) {
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.tempId !== tempId || q.options.length <= 2) return q;
        const options = q.options.filter((o) => o.key !== key);
        return { ...q, options, correctOptionKey: q.correctOptionKey === key ? options[0].key : q.correctOptionKey };
      }),
    );
  }

  async function onFileSelected(file: File) {
    setError(undefined);
    setUploadingFile(true);
    try {
      const base64Data = await readFileAsBase64(file);
      const uploaded = await apiFetch<UploadedFile>("/doctoral-assignments/files", {
        method: "POST",
        body: JSON.stringify({ fileName: file.name, mimeType: file.type || "application/octet-stream", base64Data }),
      });
      setTemplateFile(uploaded);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo subir el archivo de plantilla");
    } finally {
      setUploadingFile(false);
    }
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(undefined);

    if (target === "students" && targetStudentIds.length === 0) {
      setError('Selecciona al menos un estudiante, o elige "Toda la cohorte"');
      return;
    }
    if (target === "groups" && targetGroupIds.length === 0) {
      setError('Selecciona al menos un grupo, o elige "Toda la cohorte"');
      return;
    }

    const preparedQuestions: AssignmentQuestionInput[] = questions
      .filter((q) => q.prompt.trim().length > 0)
      .map((q, index) => ({
        order: index + 1,
        type: q.type,
        prompt: q.prompt.trim(),
        maxScore: q.maxScore ? Number(q.maxScore) : undefined,
        ...(q.type === "mc"
          ? {
              options: q.options.filter((o) => o.text.trim().length > 0).map((o) => ({ key: o.key, text: o.text.trim() })),
              correctOptionKey: q.correctOptionKey,
            }
          : {}),
      }));

    const body: CreateAssignmentBody = {
      cohortId,
      title,
      instructions: instructions.trim() || undefined,
      moduleId: moduleId || undefined,
      templateFileId: templateFile?.id,
      dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      questions: preparedQuestions,
      targetStudentIds: target === "students" ? targetStudentIds : undefined,
      targetGroupIds: target === "groups" ? targetGroupIds : undefined,
    };

    setCreating(true);
    try {
      const result = await apiFetch<CreatedAssignment>("/doctoral-assignments", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setCreated(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la tarea");
    } finally {
      setCreating(false);
    }
  }

  async function onPublishNow() {
    if (!created) return;
    setPublishing(true);
    setError(undefined);
    try {
      await apiFetch(`/doctoral-assignments/${created.assignmentId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "published" }),
      });
      router.push(`/docente/cohortes/${cohortId}/tareas/${created.assignmentId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo publicar la tarea");
      setPublishing(false);
    }
  }

  const rosterItems = roster.map((s) => ({ id: s.doctoralStudentProfileId, label: s.displayName }));
  const groupItems = groups.map((g) => ({ id: g.groupId, label: g.name, hint: `${g.studentIds.length} miembro(s)` }));

  if (created) {
    return (
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-navy-txt mb-1">Tarea creada como borrador</h1>
        <p className="text-sm text-ink-suave mb-6">
          Revisa el resumen abajo. Puedes publicarla ahora o dejarla en borrador y publicarla más adelante desde su
          página de detalle.
        </p>

        {error ? (
          <p role="alert" className="text-peligro mb-4">
            {error}
          </p>
        ) : null}

        <Card className="mb-4">
          <h2 className="font-bold text-ink mb-2">{created.title}</h2>
          {created.instructions ? <p className="text-sm text-ink-suave mb-2">{created.instructions}</p> : null}
          <ul className="flex flex-col gap-2 mt-2">
            {created.questions.map((q) => (
              <li key={q.questionId} className="border-t border-borde pt-2 text-sm">
                <span className="font-semibold text-ink">
                  {q.order}. [{TYPE_LABEL[q.type]}]{" "}
                </span>
                {q.prompt}
                {q.options ? (
                  <ul className="text-ink-suave mt-1 ml-4 list-disc">
                    {q.options.map((o) => (
                      <li key={o.key} className={o.key === q.correctOptionKey ? "text-exito font-semibold" : ""}>
                        {o.key}) {o.text}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button onClick={onPublishNow} disabled={publishing}>
            {publishing ? "Publicando…" : "Publicar ahora"}
          </Button>
          <Link href={`/docente/cohortes/${cohortId}/tareas/${created.assignmentId}`} className="tap-target">
            <Button variant="secondary">Ver tarea</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
      <Link href={`/docente/cohortes/${cohortId}/tareas`} className="text-azul2 font-semibold link-pill">
        ← Tareas
      </Link>
      <h1 className="text-2xl font-bold text-navy-txt mt-2 mb-6">Nueva tarea</h1>

      {error ? (
        <p role="alert" className="text-peligro mb-4">
          {error}
        </p>
      ) : null}

      <form onSubmit={onCreate} className="flex flex-col gap-6" noValidate>
        <Card className="flex flex-col gap-3">
          <FormField label="Título" name="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-ink">Instrucciones (opcional)</span>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              className="rounded-[var(--radius-sm)] border border-borde bg-paper px-3 py-2 text-ink placeholder:text-ink-suave"
            />
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            <FormField
              label="Fecha de entrega (opcional)"
              name="dueAt"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-ink">Módulo asociado (opcional)</span>
              <select
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                className="rounded-[var(--radius-sm)] border border-borde bg-paper px-3 py-2 text-ink"
              >
                <option value="">— Sin módulo —</option>
                {modules.map((m) => (
                  <option key={m.moduleId} value={m.moduleId}>
                    {m.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink mb-1">Plantilla descargable (opcional)</p>
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileSelected(file);
              }}
              disabled={uploadingFile}
              className="text-sm text-ink-suave"
            />
            {uploadingFile ? <p className="text-sm text-ink-suave mt-1">Subiendo…</p> : null}
            {templateFile ? (
              <p className="text-sm text-exito mt-1">
                Archivo cargado: {templateFile.fileName}{" "}
                <button type="button" className="text-peligro underline" onClick={() => setTemplateFile(undefined)}>
                  quitar
                </button>
              </p>
            ) : null}
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-navy-txt">Preguntas</h2>
            <Button type="button" variant="secondary" onClick={addQuestion}>
              + Agregar pregunta
            </Button>
          </div>
          {questions.map((q, index) => (
            <div key={q.tempId} className="border border-borde rounded-[var(--radius-sm)] p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-ink">Pregunta {index + 1}</span>
                {questions.length > 1 ? (
                  <button type="button" className="text-sm text-peligro underline" onClick={() => removeQuestion(q.tempId)}>
                    quitar
                  </button>
                ) : null}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-semibold text-ink">Tipo</span>
                  <select
                    value={q.type}
                    onChange={(e) => updateQuestion(q.tempId, { type: e.target.value as AssignmentQuestionType })}
                    className="rounded-[var(--radius-sm)] border border-borde bg-paper px-3 py-2 text-ink"
                  >
                    {ASSIGNMENT_QUESTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-semibold text-ink">Puntaje máximo</span>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={q.maxScore}
                    onChange={(e) => updateQuestion(q.tempId, { maxScore: e.target.value })}
                    className="rounded-[var(--radius-sm)] border border-borde bg-paper px-3 py-2 text-ink"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-ink">Enunciado</span>
                <textarea
                  value={q.prompt}
                  onChange={(e) => updateQuestion(q.tempId, { prompt: e.target.value })}
                  rows={2}
                  className="rounded-[var(--radius-sm)] border border-borde bg-paper px-3 py-2 text-ink"
                />
              </label>

              {q.type === "mc" ? (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-ink">Alternativas (marca la correcta)</span>
                  {q.options.map((o) => (
                    <div key={o.key} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${q.tempId}`}
                        checked={q.correctOptionKey === o.key}
                        onChange={() => updateQuestion(q.tempId, { correctOptionKey: o.key })}
                      />
                      <span className="text-sm text-ink-suave w-4">{o.key})</span>
                      <input
                        type="text"
                        value={o.text}
                        onChange={(e) =>
                          updateQuestion(q.tempId, {
                            options: q.options.map((opt) => (opt.key === o.key ? { ...opt, text: e.target.value } : opt)),
                          })
                        }
                        className="flex-1 rounded-[var(--radius-sm)] border border-borde bg-paper px-2 py-1 text-sm text-ink"
                      />
                      {q.options.length > 2 ? (
                        <button type="button" className="text-xs text-peligro underline" onClick={() => removeOption(q.tempId, o.key)}>
                          quitar
                        </button>
                      ) : null}
                    </div>
                  ))}
                  {q.options.length < 10 ? (
                    <button type="button" className="text-sm text-azul2 underline self-start" onClick={() => addOption(q.tempId)}>
                      + Agregar alternativa
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-navy-txt">Destinatarios</h2>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="radio" checked={target === "cohort"} onChange={() => setTarget("cohort")} /> Toda la cohorte
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="radio" checked={target === "students"} onChange={() => setTarget("students")} /> Estudiantes
              específicos
            </label>
            {target === "students" ? (
              <CheckboxList
                items={rosterItems}
                selected={targetStudentIds}
                onChange={setTargetStudentIds}
                emptyMessage="Esta cohorte todavía no tiene alumnos inscritos."
              />
            ) : null}
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="radio" checked={target === "groups"} onChange={() => setTarget("groups")} /> Grupos guardados
            </label>
            {target === "groups" ? (
              <CheckboxList
                items={groupItems}
                selected={targetGroupIds}
                onChange={setTargetGroupIds}
                emptyMessage="Esta cohorte todavía no tiene grupos — crea uno primero en la sección Grupos."
              />
            ) : null}
          </div>
        </Card>

        <Button type="submit" disabled={creating || !title.trim() || uploadingFile} className="self-start">
          {creating ? "Creando…" : "Crear tarea (borrador)"}
        </Button>
      </form>
    </main>
  );
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
