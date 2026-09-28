"use client";

// Lista de casillas reutilizable — selección de estudiantes (roster de
// cohorte) o de grupos guardados, usada tanto al crear una tarea (sección de
// destinatarios) como al armar un grupo nuevo.

export interface CheckboxListItem {
  id: string;
  label: string;
  hint?: string;
}

export function CheckboxList({
  items,
  selected,
  onChange,
  emptyMessage,
}: {
  items: CheckboxListItem[];
  selected: string[];
  onChange: (next: string[]) => void;
  emptyMessage: string;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  if (items.length === 0) {
    return <p className="text-sm text-ink-suave">{emptyMessage}</p>;
  }

  return (
    <ul className="flex flex-col gap-1 max-h-64 overflow-y-auto border border-borde rounded-[var(--radius-sm)] p-2">
      {items.map((item) => (
        <li key={item.id}>
          <label className="tap-target gap-2 cursor-pointer text-sm text-ink">
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={() => toggle(item.id)}
              className="w-4 h-4"
            />
            <span>{item.label}</span>
            {item.hint ? <span className="text-ink-suave text-xs">{item.hint}</span> : null}
          </label>
        </li>
      ))}
    </ul>
  );
}
