"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { FormField } from "@/components/FormField";
import {
  assignProfessorToCohort,
  enrollStudentInModule,
  listCohorts,
  listModules,
  listPrograms,
  listStudents,
  reactivateStudent,
  removeModuleEnrollment,
  removeStudentFromCohort,
  suspendStudent,
  updateStudentName,
} from "../../_lib/api";
import { ErrorText } from "../../_components/ErrorText";
import { StatusBadge } from "../../_components/StatusBadge";
import { MODULE_ENROLLMENT_STATUS_LABELS } from "../../_lib/labels";
import type { DoctoralCohort, DoctoralProgram, DoctoralStudentListItem, ProgramModule } from "../../types";

export default function CohorteDetailPage(props: PageProps<"/administrador/cohortes/[cohortId]">) {
  const { cohortId } = use(props.params);
  const searchParams = use(props.searchParams);
  const programIdHint = typeof searchParams.programId === "string" ? searchParams.programId : undefined;

  const [program, setProgram] = useState<DoctoralProgram | null>(null);
  const [cohort, setCohort] = useState<DoctoralCohort | null>(null);
  const [modules, setModules] = useState<ProgramModule[] | null>(null);
  const [students, setStudents] = useState<DoctoralStudentListItem[] | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);

  function reload() {
    setReloadKey((n) => n + 1);
  }

  // Resuelve la cohorte + su programa: no existe un GET de cohorte por id,
  // así que se busca en la(s) cohorte(s) del programa (usando el hint de la
  // URL cuando viene del detalle del programa, o recorriendo todos los
  // programas si se llega por link directo).
  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      try {
        const programs = await listPrograms();
        const candidates = programIdHint
          ? programs.filter((p) => p.id === programIdHint)
          : programs;

        for (const p of candidates) {
          const cohortsOfProgram = await listCohorts(p.id);
          const found = cohortsOfProgram.find((c) => c.id === cohortId);
          if (found) {
            if (!cancelled) {
              setProgram(p);
              setCohort(found);
            }
            return;
          }
        }
        if (!cancelled) setLoadError("Esta cohorte no existe o no pertenece a tu organización");
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : "No se pudo cargar la cohorte");
        }
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [cohortId, programIdHint, reloadKey]);

  useEffect(() => {
    if (!program) return;
    listModules(program.id).then(setModules).catch(() => setModules([]));
  }, [program, reloadKey]);

  useEffect(() => {
    listStudents({ cohortId }).then(setStudents).catch(() => setStudents([]));
  }, [cohortId, reloadKey]);

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

  if (!cohort || !program) {
    return <p className="text-ink-suave text-sm">Cargando…</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <Link href={`/administrador/programas/${program.id}`} className="text-azul2 text-sm underline w-fit">
        ← Volver a {program.name}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-navy-txt">{cohort.name}</h1>
        <p className="text-sm text-ink-suave">
          {program.name} · Ingreso {cohort.startYear}
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-navy-txt">
          Estudiantes inscritos {students ? `(${students.length})` : ""}
        </h2>
        {!students ? (
          <p className="text-ink-suave text-sm">Cargando estudiantes…</p>
        ) : students.length === 0 ? (
          <Card>
            <p className="text-ink-suave">
              Esta cohorte todavía no tiene estudiantes. Inscríbelos desde{" "}
              <Link href="/administrador/estudiantes" className="text-azul2 underline">
                el mantenedor de estudiantes
              </Link>
              .
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {students.map((student) => (
              <StudentRow
                key={student.studentProfileId}
                student={student}
                cohortId={cohortId}
                programModules={modules ?? []}
                onChanged={reload}
              />
            ))}
          </div>
        )}
      </section>

      <AssignProfessorSection cohortId={cohortId} onChanged={reload} />
    </div>
  );
}

function StudentRow({
  student,
  cohortId,
  programModules,
  onChanged,
}: {
  student: DoctoralStudentListItem;
  cohortId: string;
  programModules: ProgramModule[];
  onChanged: () => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(student.displayName);
  const [pickModuleId, setPickModuleId] = useState("");
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
    setEditingName(false);
  }

  const enrolledModuleIds = new Set(student.moduleEnrollments.map((m) => m.moduleId));
  const linkableModules = programModules.filter((m) => !enrolledModuleIds.has(m.id));

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          {editingName ? (
            <form onSubmit={onSaveName} className="flex items-center gap-2">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="rounded-[var(--radius-sm)] border border-borde bg-paper px-2 py-1 text-ink"
                autoFocus
              />
              <Button type="submit" className="!min-h-8 !py-1 text-xs" disabled={busy || !displayName.trim()}>
                Guardar
              </Button>
              <button
                type="button"
                className="text-xs text-ink-suave underline"
                onClick={() => {
                  setEditingName(false);
                  setDisplayName(student.displayName);
                }}
              >
                cancelar
              </button>
            </form>
          ) : (
            <p className="font-bold text-navy-txt">
              {student.displayName}{" "}
              <button
                type="button"
                className="text-xs text-azul2 underline ml-1"
                onClick={() => setEditingName(true)}
              >
                editar
              </button>
            </p>
          )}
          <p className="text-sm text-ink-suave">{student.email}</p>
        </div>
        <StatusBadge status={student.status} />
      </div>

      <ErrorText message={error} />

      <div className="flex gap-2 flex-wrap">
        {student.status === "suspended" ? (
          <Button
            variant="secondary"
            className="!min-h-8 !py-1 text-xs"
            disabled={busy}
            onClick={() => run(() => reactivateStudent(student.studentProfileId))}
          >
            Reactivar
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="!min-h-8 !py-1 text-xs"
            disabled={busy}
            onClick={() => run(() => suspendStudent(student.studentProfileId))}
          >
            Suspender
          </Button>
        )}
        <Button
          variant="danger"
          className="!min-h-8 !py-1 text-xs"
          disabled={busy}
          onClick={() => {
            if (confirm(`¿Quitar a ${student.displayName} de esta cohorte?`)) {
              run(() => removeStudentFromCohort(student.studentProfileId, cohortId));
            }
          }}
        >
          Quitar de la cohorte
        </Button>
      </div>

      <div className="border-t border-borde pt-3">
        <p className="text-sm font-semibold text-ink mb-2">Módulos vinculados</p>
        {student.moduleEnrollments.length === 0 ? (
          <p className="text-sm text-ink-suave mb-2">Sin módulos vinculados todavía.</p>
        ) : (
          <ul className="flex flex-col gap-1 mb-2">
            {student.moduleEnrollments.map((enrollment) => (
              <li key={enrollment.moduleId} className="flex items-center gap-2 text-sm">
                <span>{enrollment.title}</span>
                <span className="text-xs text-ink-suave">
                  ({MODULE_ENROLLMENT_STATUS_LABELS[enrollment.status]})
                </span>
                <button
                  type="button"
                  disabled={busy}
                  className="text-xs text-peligro underline"
                  onClick={() =>
                    run(() => removeModuleEnrollment(student.studentProfileId, enrollment.moduleId))
                  }
                >
                  Desvincular
                </button>
              </li>
            ))}
          </ul>
        )}
        {linkableModules.length > 0 ? (
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={pickModuleId}
              onChange={(e) => setPickModuleId(e.target.value)}
              className="rounded-[var(--radius-sm)] border border-borde bg-paper px-2 py-1 text-sm"
            >
              <option value="">Selecciona un módulo…</option>
              {linkableModules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.order}. {m.title}
                </option>
              ))}
            </select>
            <Button
              className="!min-h-8 !py-1 text-xs"
              disabled={busy || !pickModuleId}
              onClick={() => {
                run(() => enrollStudentInModule(student.studentProfileId, pickModuleId));
                setPickModuleId("");
              }}
            >
              Vincular módulo
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function AssignProfessorSection({ cohortId, onChanged }: { cohortId: string; onChanged: () => void }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    setSuccess(undefined);
    setSubmitting(true);
    try {
      await assignProfessorToCohort(cohortId, { email: email.trim() });
      setSuccess(`Se asignó a ${email.trim()} a esta cohorte.`);
      setEmail("");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo asignar el docente");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-bold text-navy-txt">Docentes asignados</h2>
      <Card className="flex flex-col gap-3">
        <p className="text-sm text-ink-suave">
          El backend todavía no expone un listado de docentes ya asignados a una cohorte (solo
          permite asignar por correo) — ver nota en el reporte de esta entrega. Mientras tanto,
          usa este formulario para asignar; para confirmar quién quedó asignado, revisa con el
          propio docente o la base de datos.
        </p>
        <form onSubmit={onSubmit} className="flex items-end gap-3 flex-wrap">
          <FormField
            label="Correo del docente"
            type="email"
            name="professorEmail"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-w-[16rem]"
          />
          <Button type="submit" disabled={submitting || !email.trim()}>
            {submitting ? "Asignando…" : "Asignar docente"}
          </Button>
        </form>
        {success ? <p className="text-exito text-sm">{success}</p> : null}
        <ErrorText message={error} />
      </Card>
    </section>
  );
}
