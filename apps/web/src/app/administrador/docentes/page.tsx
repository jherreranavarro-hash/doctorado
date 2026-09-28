"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { FormField } from "@/components/FormField";
import { createProfessor } from "../_lib/api";
import { ErrorText } from "../_components/ErrorText";

export default function DocentesPage() {
  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-navy-txt">Docentes</h1>
        <p className="text-sm text-ink-suave">
          Crea cuentas de docente aquí. La asignación a una cohorte específica se hace desde el
          detalle de cada cohorte.
        </p>
      </div>

      <Card>
        <p className="text-sm text-ink border-l-4 border-alerta pl-3">
          <strong>Nota:</strong> el backend todavía no expone un listado de docentes de la
          organización (solo permite crearlos), así que esta página es de creación únicamente. Una
          vez creado, asigna al docente a una cohorte desde{" "}
          <span className="italic">Programa → Cohorte → Asignar docente</span> (por correo).
        </p>
      </Card>

      <ProfessorForm />
    </div>
  );
}

function ProfessorForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [created, setCreated] = useState<string>();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    setCreated(undefined);
    setSubmitting(true);
    try {
      await createProfessor({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        ...(title.trim() ? { title: title.trim() } : {}),
      });
      setCreated(`Se creó la cuenta de ${displayName.trim()} (${email.trim()}).`);
      setEmail("");
      setPassword("");
      setDisplayName("");
      setTitle("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la cuenta");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-bold text-navy-txt mb-4">Crear docente</h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
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
        {created ? <p className="text-exito text-sm">{created}</p> : null}
        <Button type="submit" disabled={submitting || !email.trim() || !password || !displayName.trim()}>
          {submitting ? "Creando…" : "Crear cuenta"}
        </Button>
      </form>
      <p className="text-xs text-ink-suave mt-4">
        ¿Quieres asignarlo a una cohorte ahora? Ve a{" "}
        <Link href="/administrador" className="text-azul2 underline">
          Resumen
        </Link>{" "}
        → elige el programa → abre la cohorte → &ldquo;Asignar docente&rdquo;.
      </p>
    </Card>
  );
}
