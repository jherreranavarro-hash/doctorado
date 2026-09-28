"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { FormField } from "@/components/FormField";
import { CheckboxList } from "../../../_components/CheckboxList";
import type { CohortHeatmap, StudentGroup } from "../../../types";

export default function CohortGroupsPage({ params }: PageProps<"/docente/cohortes/[cohortId]/grupos">) {
  const { cohortId } = use(params);
  const [roster, setRoster] = useState<CohortHeatmap["students"]>([]);
  const [groups, setGroups] = useState<StudentGroup[] | null>(null);
  const [error, setError] = useState<string>();

  const [name, setName] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const [editingGroupId, setEditingGroupId] = useState<string>();

  function loadGroups() {
    apiFetch<StudentGroup[]>(`/doctoral-assignments/cohorts/${cohortId}/groups`)
      .then(setGroups)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar los grupos"));
  }

  useEffect(() => {
    apiFetch<CohortHeatmap>(`/doctoral-analytics/cohorts/${cohortId}/heatmap`)
      .then((h) => setRoster(h.students))
      .catch(() => undefined);
    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohortId]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    if (memberIds.length === 0) {
      setError("Selecciona al menos un estudiante para el grupo");
      return;
    }
    setCreating(true);
    try {
      await apiFetch(`/doctoral-assignments/cohorts/${cohortId}/groups`, {
        method: "POST",
        body: JSON.stringify({ name, studentIds: memberIds }),
      });
      setName("");
      setMemberIds([]);
      loadGroups();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el grupo");
    } finally {
      setCreating(false);
    }
  }

  async function onDelete(groupId: string) {
    setError(undefined);
    try {
      await apiFetch(`/doctoral-assignments/groups/${groupId}`, { method: "DELETE" });
      loadGroups();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar el grupo");
    }
  }

  const rosterItems = roster.map((s) => ({ id: s.doctoralStudentProfileId, label: s.displayName }));

  return (
    <main className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
      <Link href={`/docente/cohortes/${cohortId}`} className="text-azul2 font-semibold link-pill">
        ← Cohorte
      </Link>
      <h1 className="text-2xl font-bold text-navy-txt mt-2 mb-1">Grupos de estudiantes</h1>
      <p className="text-sm text-ink-suave mb-6">
        Grupos guardados dentro de esta cohorte, útiles para dirigir tareas a un subconjunto de alumnos sin
        seleccionarlos uno por uno cada vez.
      </p>

      {error ? (
        <p role="alert" className="text-peligro mb-4">
          {error}
        </p>
      ) : null}

      <Card className="mb-6">
        <h2 className="text-lg font-bold text-navy-txt mb-3">Nuevo grupo</h2>
        <form onSubmit={onCreate} className="flex flex-col gap-3" noValidate>
          <FormField
            label="Nombre del grupo"
            name="name"
            placeholder="Ej: Grupo de metodología cuantitativa"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div>
            <p className="text-sm font-semibold text-ink mb-1">Miembros</p>
            <CheckboxList
              items={rosterItems}
              selected={memberIds}
              onChange={setMemberIds}
              emptyMessage="Esta cohorte todavía no tiene alumnos inscritos."
            />
          </div>
          <Button type="submit" disabled={creating || !name.trim()} className="self-start">
            {creating ? "Creando…" : "Crear grupo"}
          </Button>
        </form>
      </Card>

      {!groups ? (
        <p className="text-ink-suave">Cargando…</p>
      ) : groups.length === 0 ? (
        <p className="text-ink-suave">Todavía no hay grupos en esta cohorte.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {groups.map((g) => (
            <li key={g.groupId}>
              <Card>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-ink">{g.name}</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setEditingGroupId(editingGroupId === g.groupId ? undefined : g.groupId)}
                    >
                      {editingGroupId === g.groupId ? "Cerrar" : "Editar"}
                    </Button>
                    <Button variant="danger" onClick={() => onDelete(g.groupId)}>
                      Eliminar
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-ink-suave mt-1">
                  {g.studentIds.length} {g.studentIds.length === 1 ? "miembro" : "miembros"}
                </p>
                {editingGroupId === g.groupId ? (
                  <EditGroupForm
                    group={g}
                    rosterItems={rosterItems}
                    onSaved={() => {
                      setEditingGroupId(undefined);
                      loadGroups();
                    }}
                    onError={setError}
                  />
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function EditGroupForm({
  group,
  rosterItems,
  onSaved,
  onError,
}: {
  group: StudentGroup;
  rosterItems: { id: string; label: string }[];
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState(group.name);
  const [memberIds, setMemberIds] = useState<string[]>(group.studentIds);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    setSaving(true);
    try {
      await apiFetch(`/doctoral-assignments/groups/${group.groupId}`, {
        method: "PATCH",
        body: JSON.stringify({ name, studentIds: memberIds }),
      });
      onSaved();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "No se pudo actualizar el grupo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-borde flex flex-col gap-3">
      <FormField label="Nombre" name="editName" value={name} onChange={(e) => setName(e.target.value)} />
      <div>
        <p className="text-sm font-semibold text-ink mb-1">Miembros</p>
        <CheckboxList
          items={rosterItems}
          selected={memberIds}
          onChange={setMemberIds}
          emptyMessage="Esta cohorte todavía no tiene alumnos inscritos."
        />
      </div>
      <Button onClick={onSave} disabled={saving || !name.trim()} className="self-start">
        {saving ? "Guardando…" : "Guardar cambios"}
      </Button>
    </div>
  );
}
