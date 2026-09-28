import type { InputHTMLAttributes } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function FormField({ label, id, name, className = "", ...props }: FormFieldProps) {
  const inputId = id ?? name;
  return (
    <label htmlFor={inputId} className="flex flex-col gap-1 text-sm">
      <span className="font-semibold text-ink">{label}</span>
      <input
        {...props}
        id={inputId}
        name={name}
        className={`rounded-[var(--radius-sm)] border border-borde bg-paper px-3 py-2 text-ink placeholder:text-ink-suave ${className}`}
      />
    </label>
  );
}
