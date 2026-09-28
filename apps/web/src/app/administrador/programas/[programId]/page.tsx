"use client";

import { use, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { DOCTORAL_MODULE_TYPES, type DoctoralModuleType } from "@doctorado/shared";
import { ApiError, API_BASE_URL } from "@/lib/api";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { FormField } from "@/components/FormField";
import {
  createCohort,
  createModule,
  deleteModule,
  deleteSyllabus,
  listCohorts,
  listModules,
  listModulesWithSyllabus,
  listPrograms,
  updateModule,
  updateProgram,
  uploadSyllabus,
} from "../../_lib/api";
import { ErrorText } from "../../_components/ErrorText";
import { ContentBadge } from "../../_components/ContentBadge";
import { MODULE_TYPE_LABELS } from "../../_lib/labels";
import type {
  CreateModuleInput,
  DoctoralCohort,
  DoctoralProgram,
  ModuleSyllabus,
  ProgramModule,
} from "../../types";

export default function ProgramaDetailPage(props: PageProps<"/administrador/programas/[programId]">) {
  const { programId } = use(props.params);

  const [program, setProgram] = useState<DoctoralProgram | null>(null);
  const [modules, setModules] = useState<ProgramModule[] | null>(null);
  const [cohorts, setCohorts] = useState<DoctoralCohort[] | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);

  function reload() {
    setReloadKey((n) => n + 1);
  }

  useEffect(() => {
    listPrograms()
      .then((programs) => {
        const found = programs.find((p) => p.id === programId) ?? null;
        setProgram(found);
        if (!found) setLoadError("Este programa no existe o no pertenece a tu organización");
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "No se pudo cargar el programa"));
  }, [programId, reloadKey]);

  useEffect(() => {
    listModules(programId).then(setModules).catch(() => setModules([]));
  }, [programId, reloadKey]);

  useEffect(() => {
    listCohorts(programId).then(setCohorts).catch(() => setCohorts([]));
  }, [programId, reloadKey]);

  if (loadError) {
    return (
      <div className="flex flex-col gap-3">
        <ErrorText message={loadError} />
        <Link href="/administrador" className="text-azul2 text-sm underline">
          Volver al resumen
        </Link>
      </div>
    );
  }

  if (!program) {
    return <p className="text-ink-suave text-sm">Cargando…</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <Link href="/administrador" className="text-azul2 text-sm underline w-fit">
        ← Volver a programas
      </Link>

      <ProgramHeader program={program} onChanged={reload} />

      <ModulesSection programId={programId} modules={modules} onChanged={reload} />

      <CohortsSection programId={programId} cohorts={cohorts} onChanged={reload} />
    </div>
  );
}

function ProgramHeader({ program, onChanged }: { program: DoctoralProgram; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(program.name);
  const [institution, setInstitution] = useState(program.institution ?? "");
  const [totalSemesters, setTotalSemesters] = useState(String(program.totalSemesters));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    setSubmitting(true);
    try {
      await updateProgram(program.id, {
        name: name.trim(),
        institution: institution.trim() || undefined,
        totalSemesters: totalSemesters ? Number(totalSemesters) : undefined,
      });
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar el programa");
    } finally {
      setSubmitting(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-txt">{program.name}</h1>
          <p className="text-xs text-ink-suave font-mono">{program.key}</p>
          <p className="text-sm text-ink-suave mt-1">
            {program.institution ?? "Sin institución registrada"} · {program.totalSemesters} semestres
          </p>
        </div>
        <Button variant="secondary" onClick={() => setEditing(true)}>
          Editar programa
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <h2 className="text-lg font-bold text-navy-txt">Editar programa</h2>
        <FormField label="Nombre" name="name" required value={name} onChange={(e) => setName(e.target.value)} />
        <FormField
          label="Institución"
          name="institution"
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
        />
        <FormField
          label="Número de semestres"
          name="totalSemesters"
          type="number"
          min={1}
          max={20}
          value={totalSemesters}
          onChange={(e) => setTotalSemesters(e.target.value)}
        />
        <ErrorText message={error} />
        <div className="flex gap-3">
          <Button type="submit" disabled={submitting || !name.trim()}>
            {submitting ? "Guardando…" : "Guardar cambios"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}

function nextModuleOrder(modules: ProgramModule[] | null): number {
  if (!modules || modules.length === 0) return 1;
  return Math.max(...modules.map((m) => m.order)) + 1;
}

function ModulesSection({
  programId,
  modules,
  onChanged,
}: {
  programId: string;
  modules: ProgramModule[] | null;
  onChanged: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [syllabusByModule, setSyllabusByModule] = useState<Map<string, ModuleSyllabus | null>>(new Map());

  useEffect(() => {
    listModulesWithSyllabus(programId)
      .then((rows) => setSyllabusByModule(new Map(rows.map((r) => [r.moduleId, r.syllabus]))))
      .catch(() => setSyllabusByModule(new Map()));
  }, [programId, modules]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-navy-txt">Módulos {modules ? `(${modules.length})` : ""}</h2>
        <Button variant="secondary" onClick={() => setCreating((v) => !v)}>
          {creating ? "Cancelar" : "+ Nuevo módulo"}
        </Button>
      </div>

      {creating ? (
        <ModuleForm
          programId={programId}
          initialOrder={nextModuleOrder(modules)}
          onDone={() => {
            setCreating(false);
            onChanged();
          }}
          onCancel={() => setCreating(false)}
        />
      ) : null}

      {!modules ? (
        <p className="text-ink-suave text-sm">Cargando módulos…</p>
      ) : modules.length === 0 ? (
        <Card>
          <p className="text-ink-suave">Este programa todavía no tiene módulos.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {modules.map((module_) => (
            <ModuleRow
              key={module_.id}
              programId={programId}
              module_={module_}
              syllabus={syllabusByModule.get(module_.id) ?? null}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ModuleRow({
  programId,
  module_,
  syllabus,
  onChanged,
}: {
  programId: string;
  module_: ProgramModule;
  syllabus: ModuleSyllabus | null;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function onDelete() {
    if (!confirm(`¿Eliminar el módulo "${module_.title}"? Es una baja lógica.`)) return;
    setBusy(true);
    setError(undefined);
    try {
      await deleteModule(programId, module_.id);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar el módulo");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <ModuleForm
        programId={programId}
        existing={module_}
        initialOrder={module_.order}
        onDone={() => {
          setEditing(false);
          onChanged();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <p className="font-bold text-navy-txt">
            {module_.order}. {module_.title}
            {module_.code ? <span className="text-ink-suave font-mono text-xs ml-2">{module_.code}</span> : null}
          </p>
          <p className="text-sm text-ink-suave">
            Semestre {module_.semester} · {module_.credits} créditos · {MODULE_TYPE_LABELS[module_.type]}
          </p>
        </div>
        <ContentBadge hasRealContent={module_.hasRealContent} />
      </div>
      <ErrorText message={error} />
      <div className="flex gap-2">
        <Button variant="secondary" className="!min-h-9 !py-1 text-sm" disabled={busy} onClick={() => setEditing(true)}>
          Editar
        </Button>
        <Button variant="danger" className="!min-h-9 !py-1 text-sm" disabled={busy} onClick={onDelete}>
          Eliminar
        </Button>
      </div>
      <SyllabusControl moduleId={module_.id} syllabus={syllabus} onChanged={onChanged} />
    </Card>
  );
}

function SyllabusControl({
  moduleId,
  syllabus,
  onChanged,
}: {
  moduleId: string;
  syllabus: ModuleSyllabus | null;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function onUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(undefined);
    try {
      await uploadSyllabus(moduleId, file);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo subir el syllabus");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!confirm("¿Quitar el syllabus de este módulo?")) return;
    setBusy(true);
    setError(undefined);
    try {
      await deleteSyllabus(moduleId);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo quitar el syllabus");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-borde pt-2 flex items-center gap-3 flex-wrap text-sm">
      <span className="font-semibold text-ink">Syllabus:</span>
      {syllabus ? (
        <>
          <a
            href={`${API_BASE_URL}/program-modules/${moduleId}/syllabus`}
            target="_blank"
            rel="noopener"
            className="text-azul2 underline"
          >
            {syllabus.fileName}
          </a>
          <button type="button" disabled={busy} className="text-xs text-peligro underline" onClick={onDelete}>
            Quitar
          </button>
        </>
      ) : (
        <span className="text-ink-suave">Sin syllabus todavía</span>
      )}
      <label className="text-xs text-azul2 underline cursor-pointer">
        {syllabus ? "Reemplazar archivo" : "Subir archivo"}
        <input type="file" className="hidden" disabled={busy} onChange={onUpload} />
      </label>
      <ErrorText message={error} />
    </div>
  );
}

function ModuleForm({
  programId,
  existing,
  initialOrder,
  onDone,
  onCancel,
}: {
  programId: string;
  existing?: ProgramModule;
  initialOrder: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState(existing?.code ?? "");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [semester, setSemester] = useState(String(existing?.semester ?? 1));
  const [credits, setCredits] = useState(String(existing?.credits ?? 0));
  const [type, setType] = useState<DoctoralModuleType>(existing?.type ?? "course");
  const [order, setOrder] = useState(String(existing?.order ?? initialOrder));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    setSubmitting(true);
    try {
      const input: CreateModuleInput = {
        title: title.trim(),
        semester: Number(semester),
        credits: Number(credits),
        type,
        order: Number(order),
        ...(code.trim() ? { code: code.trim() } : {}),
      };
      if (existing) {
        await updateModule(programId, existing.id, input);
      } else {
        await createModule(programId, input);
      }
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el módulo");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
        <h3 className="font-bold text-navy-txt">{existing ? "Editar módulo" : "Nuevo módulo"}</h3>
        <FormField label="Título" name="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <FormField label="Código (opcional)" name="code" value={code} onChange={(e) => setCode(e.target.value)} />
          <FormField
            label="Semestre"
            name="semester"
            type="number"
            min={1}
            required
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
          />
          <FormField
            label="Créditos"
            name="credits"
            type="number"
            min={0}
            required
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
          />
          <FormField
            label="Orden"
            name="order"
            type="number"
            min={0}
            required
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          />
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-ink">Tipo</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as DoctoralModuleType)}
            className="rounded-[var(--radius-sm)] border border-borde bg-paper px-3 py-2 text-ink"
          >
            {DOCTORAL_MODULE_TYPES.map((t) => (
              <option key={t} value={t}>
                {MODULE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <ErrorText message={error} />
        <div className="flex gap-3">
          <Button type="submit" disabled={submitting || !title.trim()}>
            {submitting ? "Guardando…" : existing ? "Guardar cambios" : "Crear módulo"}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}

function CohortsSection({
  programId,
  cohorts,
  onChanged,
}: {
  programId: string;
  cohorts: DoctoralCohort[] | null;
  onChanged: () => void;
}) {
  const [creating, setCreating] = useState(false);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-navy-txt">Cohortes {cohorts ? `(${cohorts.length})` : ""}</h2>
        <Button variant="secondary" onClick={() => setCreating((v) => !v)}>
          {creating ? "Cancelar" : "+ Nueva cohorte"}
        </Button>
      </div>

      {creating ? (
        <CohortForm
          programId={programId}
          onDone={() => {
            setCreating(false);
            onChanged();
          }}
          onCancel={() => setCreating(false)}
        />
      ) : null}

      {!cohorts ? (
        <p className="text-ink-suave text-sm">Cargando cohortes…</p>
      ) : cohorts.length === 0 ? (
        <Card>
          <p className="text-ink-suave">Este programa todavía no tiene cohortes.</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {cohorts.map((cohort) => (
            <Link
              key={cohort.id}
              href={`/administrador/cohortes/${cohort.id}?programId=${programId}`}
              className="tap-target"
            >
              <Card className="h-full hover:border-garnet transition-colors">
                <p className="font-bold text-navy-txt">{cohort.name}</p>
                <p className="text-sm text-ink-suave">Ingreso {cohort.startYear}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function CohortForm({
  programId,
  onDone,
  onCancel,
}: {
  programId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [startYear, setStartYear] = useState(String(new Date().getFullYear()));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    setSubmitting(true);
    try {
      await createCohort(programId, { name: name.trim(), startYear: Number(startYear) });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la cohorte");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
        <FormField label="Nombre de la cohorte" name="name" required value={name} onChange={(e) => setName(e.target.value)} />
        <FormField
          label="Año de ingreso"
          name="startYear"
          type="number"
          min={2000}
          required
          value={startYear}
          onChange={(e) => setStartYear(e.target.value)}
        />
        <ErrorText message={error} />
        <div className="flex gap-3">
          <Button type="submit" disabled={submitting || !name.trim()}>
            {submitting ? "Creando…" : "Crear cohorte"}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
