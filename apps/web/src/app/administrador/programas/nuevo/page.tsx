"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { FormField } from "@/components/FormField";
import { createProgram } from "../../_lib/api";
import { ErrorText } from "../../_components/ErrorText";

export default function NuevoProgramaPage() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [totalSemesters, setTotalSemesters] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    setSubmitting(true);
    try {
      const program = await createProgram({
        key: key.trim(),
        name: name.trim(),
        ...(institution.trim() ? { institution: institution.trim() } : {}),
        ...(totalSemesters ? { totalSemesters: Number(totalSemesters) } : {}),
      });
      router.push(`/administrador/programas/${program.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el programa");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-navy-txt mb-1">Crear programa</h1>
      <p className="text-sm text-ink-suave mb-6">
        La clave (key) es interna y no se puede cambiar después de crear el programa.
      </p>

      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField
            label="Clave interna"
            name="key"
            placeholder="ej. psicologia_clinica"
            required
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          <FormField
            label="Nombre del programa"
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <FormField
            label="Institución (opcional)"
            name="institution"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
          />
          <FormField
            label="Número de semestres (opcional)"
            name="totalSemesters"
            type="number"
            min={1}
            max={20}
            value={totalSemesters}
            onChange={(e) => setTotalSemesters(e.target.value)}
          />
          <ErrorText message={error} />
          <div className="flex gap-3">
            <Button type="submit" disabled={submitting || !key.trim() || !name.trim()}>
              {submitting ? "Creando…" : "Crear programa"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push("/administrador")}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
