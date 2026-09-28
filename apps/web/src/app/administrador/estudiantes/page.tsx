"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { FormField } from "@/components/FormField";
import {
  createStudent,
  deleteStudent,
  listCohorts,
  listPrograms,
  listStudents,
  reactivateStudent,
  suspendStudent,
  updateStudentName,
} from "../_lib/api";
import { ErrorText } from "../_components/ErrorText";
import { StatusBadge } from "../_components/StatusBadge";
import type { DoctoralProgram, DoctoralStudentListItem } from "../types";

interface CohortOption {
  cohortId: string;
  name: string;
  programId: string;
  programName: string;
}

export default function EstudiantesPage() {
  const [programs, setPrograms] = useState<DoctoralProgram[]>([]);
  const [cohortOptions, setCohortOptions] = useState<CohortOption[]>([]);
  const [query, setQuery] = useState("");
  const [cohortFilter, setCohortFilter] = useState("");
  const [students, setStudents] = useState<DoctoralStudentListItem[] | null>(null);
  const [error, setError] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);

  function reload() {
    setReloadKey((n) => n + 1);
  }

  // Cohortes de todos los programas — no hay un único endpoint para esto,
  // así que se combinan las listas por programa (organización con pocos
  // programas, es una carga liviana).
  useEffect(() => {
    listPrograms().then(async (progs) => {
      setPrograms(progs);
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
    const handle = setTimeout(() => {
      listStudents({ query: query.trim() || undefined, cohortId: cohortFilter || undefined })
        .then(setStudents)
        .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la lista"));
    }, 250);
    return () => clearTimeout(handle);
  }, [query, cohortFilter, reloadKey]);

  const cohortLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of cohortOptions) map.set(c.cohortId, `${c.programName} · ${c.name}`);
    return map;
  }, [cohortOptions]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-txt">Estudiantes</h1>
        <p className="text-sm text-ink-suave">
          Mantenedor de estudiantes de toda la organización — crea cuentas, edítalas, suspéndelas
          o dalas de baja.
        </p>
      </div>

      <CreateStudentSection programs={programs} cohortOptions={cohortOptions} onCreated={reload} />

      <div className="flex gap-3 flex-wrap items-end">
        <FormField
          label="Buscar por nombre o correo"
          name="query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-[16rem]"
        />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-ink">Cohorte</span>
          <select
            value={cohortFilter}
            onChange={(e) => setCohortFilter(e.target.value)}
            className="rounded-[var(--radius-sm)] border border-borde bg-paper px-3 py-2 text-ink min-w-[14rem]"
          >
            <option value="">Todas las cohortes</option>
            {cohortOptions.map((c) => (
              <option key={c.cohortId} value={c.cohortId}>
                {c.programName} · {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ErrorText message={error} />

      {!students ? (
        <p className="text-ink-suave text-sm">Cargando…</p>
      ) : students.length === 0 ? (
        <Card>
          <p className="text-ink-suave">No se encontraron estudiantes con estos filtros.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-borde text-ink-suave">
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">Correo</th>
                <th className="py-2 pr-4">Estado</th>
                <th className="py-2 pr-4">Cohortes</th>
                <th className="py-2 pr-4">Módulos</th>
                <th className="py-2 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <StudentRow key={s.studentProfileId} student={s} cohortLabel={cohortLabel} onChanged={reload} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StudentRow({
  student,
  cohortLabel,
  onChanged,
}: {
  student: DoctoralStudentListItem;
  cohortLabel: Map<string, string>;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(student.displayName);
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

  async function onSaveName(event: FormEvent) {
    event.preventDefault();
    await run(() => updateStudentName(student.studentProfileId, displayName.trim()));
    setEditing(false);
  }

  return (
    <tr className="border-b border-borde align-top">
      <td className="py-2 pr-4">
        {editing ? (
          <form onSubmit={onSaveName} className="flex items-center gap-2">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="rounded-[var(--radius-sm)] border border-borde bg-paper px-2 py-1"
              autoFocus
            />
            <Button type="submit" className="!min-h-8 !py-1 text-xs" disabled={busy || !displayName.trim()}>
              Guardar
            </Button>
            <button
              type="button"
              className="text-xs text-ink-suave underline"
              onClick={() => {
                setEditing(false);
                setDisplayName(student.displayName);
              }}
            >
              cancelar
            </button>
          </form>
        ) : (
          <span className="font-semibold text-ink">{student.displayName}</span>
        )}
      </td>
      <td className="py-2 pr-4">{student.email}</td>
      <td className="py-2 pr-4">
        <StatusBadge status={student.status} />
      </td>
      <td className="py-2 pr-4">
        {student.cohorts.length === 0
          ? "—"
          : student.cohorts.map((c) => cohortLabel.get(c.cohortId) ?? c.name).join(", ")}
      </td>
      <td className="py-2 pr-4">
        {student.moduleEnrollments.length === 0 ? "—" : student.moduleEnrollments.length}
      </td>
      <td className="py-2 pr-4">
        <div className="flex flex-col gap-1">
          <ErrorText message={error} />
          <div className="flex gap-2 flex-wrap">
            {!editing ? (
              <button type="button" className="text-xs text-azul2 underline" onClick={() => setEditing(true)}>
                Editar
              </button>
            ) : null}
            {student.status === "suspended" ? (
              <button
                type="button"
                disabled={busy}
                className="text-xs text-exito underline"
                onClick={() => run(() => reactivateStudent(student.studentProfileId))}
              >
                Reactivar
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                className="text-xs text-alerta underline"
                onClick={() => run(() => suspendStudent(student.studentProfileId))}
              >
                Suspender
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              className="text-xs text-peligro underline"
              onClick={() => {
                if (confirm(`¿Eliminar a ${student.displayName}? Es una baja lógica.`)) {
                  run(() => deleteStudent(student.studentProfileId));
                }
              }}
            >
              Eliminar
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

function CreateStudentSection({
  programs,
  cohortOptions,
  onCreated,
}: {
  programs: DoctoralProgram[];
  cohortOptions: CohortOption[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [programId, setProgramId] = useState("");
  const [cohortId, setCohortId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const cohortsForProgram = cohortOptions.filter((c) => c.programId === programId);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    setSubmitting(true);
    try {
      await createStudent({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        ...(cohortId ? { cohortId } : {}),
      });
      setEmail("");
      setPassword("");
      setDisplayName("");
      setProgramId("");
      setCohortId("");
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
        <h2 className="text-lg font-bold text-navy-txt">Crear estudiante</h2>
        <Button variant="secondary" className="!min-h-9 !py-1 text-sm" onClick={() => setOpen((v) => !v)}>
          {open ? "Cancelar" : "+ Nuevo estudiante"}
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
            Esta contraseña queda activa de inmediato — compártela por un canal seguro (no se
            envía ningún correo automático).
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-ink">Programa (opcional)</span>
              <select
                value={programId}
                onChange={(e) => {
                  setProgramId(e.target.value);
                  setCohortId("");
                }}
                className="rounded-[var(--radius-sm)] border border-borde bg-paper px-3 py-2 text-ink"
              >
                <option value="">Sin inscribir en cohorte</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-ink">Cohorte</span>
              <select
                value={cohortId}
                onChange={(e) => setCohortId(e.target.value)}
                disabled={!programId}
                className="rounded-[var(--radius-sm)] border border-borde bg-paper px-3 py-2 text-ink disabled:opacity-50"
              >
                <option value="">
                  {programId ? "Selecciona una cohorte…" : "Elige un programa primero"}
                </option>
                {cohortsForProgram.map((c) => (
                  <option key={c.cohortId} value={c.cohortId}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ErrorText message={error} />
          <Button type="submit" disabled={submitting || !email.trim() || !password || !displayName.trim()}>
            {submitting ? "Creando…" : "Crear cuenta"}
          </Button>
        </form>
      ) : null}
    </Card>
  );
}
