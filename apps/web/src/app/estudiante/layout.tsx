import { RequireRole } from "@/components/RequireRole";
import { PortalHeader } from "@/components/PortalHeader";

export default function EstudianteLayout({ children }: LayoutProps<"/estudiante">) {
  return (
    <RequireRole role="doctoral_student">
      <PortalHeader homeHref="/estudiante" title="Portal Estudiante" variant="estudiante" />
      {children}
    </RequireRole>
  );
}
