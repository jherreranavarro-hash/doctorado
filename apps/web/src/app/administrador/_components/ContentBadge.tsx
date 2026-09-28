export function ContentBadge({ hasRealContent }: { hasRealContent: boolean }) {
  return (
    <span
      className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
        hasRealContent ? "bg-exito text-paper" : "bg-borde text-ink-suave"
      }`}
    >
      {hasRealContent ? "Contenido cargado" : "Estructura pendiente de contenido"}
    </span>
  );
}
