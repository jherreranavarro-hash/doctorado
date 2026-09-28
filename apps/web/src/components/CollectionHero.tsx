import { SearchIcon } from "./icons";

const GRADIENT: Record<"estudiante" | "docente" | "administrador", string> = {
  estudiante: "bg-linear-to-br from-azul2 to-navy-d",
  docente: "bg-linear-to-br from-gold to-garnet-d",
  administrador: "bg-linear-to-br from-garnet to-navy-d",
};

/** Cabecera de página de índice ("centro de ayuda" style): color de acento
 * a página completa + buscador integrado, seguido de una lista de
 * IndexCard. Reutilizada en los 3 portales para que "Mis módulos" / "Mis
 * cohortes" / "Programas" compartan la misma primera impresión. */
export function CollectionHero({
  variant,
  title,
  subtitle,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar…",
  action,
}: {
  variant: "estudiante" | "docente" | "administrador";
  title: string;
  subtitle?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className={`${GRADIENT[variant]} -mx-4 px-4 py-10 sm:py-12 sm:rounded-b-[28px] mb-8`}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-paper2">{title}</h1>
            {subtitle ? <p className="text-paper2/80 mt-1.5 max-w-lg">{subtitle}</p> : null}
          </div>
          {action}
        </div>
        {onSearchChange ? (
          <div className="mt-6 relative max-w-md">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-paper2/70" />
            <input
              type="search"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl bg-paper2/15 placeholder:text-paper2/70 text-paper2 pl-11 pr-4 py-3 outline-none focus:bg-paper2/25 transition-colors border border-paper2/20"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
