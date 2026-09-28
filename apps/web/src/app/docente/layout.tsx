import { RequireRole } from "@/components/RequireRole";
import { PortalHeader } from "@/components/PortalHeader";

export default function DocenteLayout({ children }: LayoutProps<"/docente">) {
  return (
    <RequireRole role="doctoral_professor">
      <PortalHeader homeHref="/docente" title="Portal Docente" variant="docente" />
      {children}
    </RequireRole>
  );
}
