import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-navy text-paper hover:bg-navy-d disabled:opacity-50",
  secondary: "bg-paper2 text-ink border border-borde hover:bg-borde/40 disabled:opacity-50",
  danger: "bg-peligro text-paper hover:opacity-90 disabled:opacity-50",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`tap-target justify-center rounded-[var(--radius-sm)] px-4 py-2 font-semibold transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
    />
  );
}
