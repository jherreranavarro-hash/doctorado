"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { FormField } from "@/components/FormField";
import {
  assignProfessorToCohort,
  createProfessor,
  listCohorts,
  listPrograms,
  listProfessors,
  removeProfessorFromCohort,
} from "../_lib/api";
import { ErrorText } from "../_components/ErrorText";
import { StatusBadge } from "../_components/StatusBadge";
import type { DoctoralProfessorListItem } from "../types";

interface CohortOption {
  cohortId: string;
  name: string;
  programId: string;
  programName: string;
}

export default function DocentesPage() {
  const [cohortOptions, setCohortOptions] = useState<CohortOption[]>([]);
  const [professors, setProfessors] = useState<DoctoralProfessorListItem[] | null>(null);
  const [error, setError] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);

  function reload() {
    setReloadKey((n) => n + 1);
  }

  useEffect(() => {
    listPrograms().then(async (progs) => {
      const perProgram = await Promise.all(
        progs.map(async (p) => {
          const cohorts = await listCohorts(p.id).catch(() => []);
          return cohorts.map((c) => ({
            cohortId: c.id,
            name: c.name,
            programId: p.id,
            programName: p.name,
          }));
        }),
      );
      setCohortOptions(perProgram.flat());
    });
  }, [reloadKey]);

  useEffect(() => {
    listProfessors()
      .then(setProfessors)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la lista"));
  }, [reloadKey]);

  const cohortLabel = new Map<string, string>();
  for (const c of cohortOptions) cohortLabel.set(c.cohortId, `${c.programName} · ${c.name}`);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-txt">Docentes</h1>
        <p className="text-sm text-ink-suave">
          Mantenedor de docentes de toda la organización — crea cuentas y asígnales una o más
          cohortes directamente desde aquí.
        </p>
      </div>

      <ProfessorForm onCreated={reload} />

      <ErrorText message={error} />

      {!professors ? (
        <p className="text-ink-suave text-sm">Cargando…</p>
      ) : professors.length === 0 ? (
        <Card>
          <p className="text-ink-suave">Todavía no hay docentes creados.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {professors.map((p) => (
            <ProfessorCard
              key={p.professorProfileId}
              professor={p}
              cohortOptions={cohortOptions}
              cohortLabel={cohortLabel}
              onChanged={reload}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProfessorCard({
  professor,
  cohortOptions,
  cohortLabel,
  onChanged,
}: {
  professor: DoctoralProfessorListItem;
  cohortOptions: CohortOption[];
  cohortLabel: Map<string, string>;
  onChanged: () => void;
}) {
  const [pickCohortIds, setPickCohortIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(undefined);
    try {
      await action();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo completar la acción");
    } finally {
      setBusy(false);
    }
  }

  function toggleCohortId(cohortId: string) {
    setPickCohortIds((prev) => {
      const next = new Set(prev);
      if (next.has(cohortId)) next.delete(cohortId);
      else next.add(cohortId);
      return next;
    });
  }

  async function onAddSelectedCohorts() {
    const ids = Array.from(pickCohortIds);
    if (ids.length === 0) return;
    await run(async () => {
      for (const cohortId of ids) {
        await assignProfessorToCohort(cohortId, { doctoralProfessorProfileId: professor.professorProfileId });
      }
    });
    setPickCohortIds(new Set());
  }

  const assignedCohortIds = new Set(professor.cohorts.map((c) => c.cohortId));
  const addableCohorts = cohortOptions.filter((c) => !assignedCohortIds.has(c.cohortId));

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <p className="font-bold text-navy-txt">
            {professor.title ? `${professor.title} ` : ""}
            {professor.displayName}
          </p>
          <p className="text-sm text-ink-suave">{professor.email}</p>
        </div>
        <StatusBadge status={professor.status} />
      </div>

      <ErrorText message={error} />

      <div className="border-t border-borde pt-3">
        <p className="text-sm font-semibold text-ink mb-2">Cohortes asignadas</p>
        {professor.cohorts.length === 0 ? (
          <p className="text-sm text-ink-suave mb-2">Sin cohortes asignadas todavía.</p>
        ) : (
          <ul className="flex flex-col gap-1 mb-2">
            {professor.cohorts.map((c) => (
              <li key={c.cohortId} className="flex items-center gap-2 text-sm">
                <span>{cohortLabel.get(c.cohortId) ?? c.name}</span>
                <button
                  type="button"
                  disabled={busy}
                  className="text-xs text-peligro underline"
                  onClick={() => run(() => removeProfessorFromCohort(c.cohortId, professor.professorProfileId))}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
        {addableCohorts.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {addableCohorts.map((c) => (
                <label key={c.cohortId} className="flex items-center gap-1.5 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={pickCohortIds.has(c.cohortId)}
                    onChange={() => toggleCohortId(c.cohortId)}
                  />
                  {c.programName} · {c.name}
                </label>
              ))}
            </div>
            <Button
              className="!min-h-8 !py-1 text-xs w-fit"
              disabled={busy || pickCohortIds.size === 0}
              onClick={onAddSelectedCohorts}
            >
              Asignar {pickCohortIds.size > 0 ? `${pickCohortIds.size} cohorte(s)` : "cohortes seleccionadas"}
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function ProfessorForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    setSubmitting(true);
    try {
      await createProfessor({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        ...(title.trim() ? { title: title.trim() } : {}),
      });
      setEmail("");
      setPassword("");
      setDisplayName("");
      setTitle("");
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la cuenta");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-navy-txt">Crear docente</h2>
        <Button variant="secondary" className="!min-h-9 !py-1 text-sm" onClick={() => setOpen((v) => !v)}>
          {open ? "Cancelar" : "+ Nuevo docente"}
        </Button>
      </div>
      {open ? (
        <form onSubmit={onSubmit} className="flex flex-col gap-3 mt-4" noValidate>
          <FormField
            label="Nombre"
            name="displayName"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <FormField
            label="Correo"
            type="email"
            name="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <FormField
            label="Contraseña inicial"
            type="password"
            name="password"
            minLength={10}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-ink-suave -mt-2">
            Esta contraseña queda activa de inmediato — compártela por un canal seguro (no se envía
            ningún correo automático).
          </p>
          <FormField
            label="Título académico (opcional)"
            name="title"
            placeholder="ej. Dr., Dra., PhD"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <ErrorText message={error} />
          <Button type="submit" disabled={submitting || !email.trim() || !password || !displayName.trim()}>
            {submitting ? "Creando…" : "Crear cuenta"}
          </Button>
        </form>
      ) : null}
    </Card>
  );
}
