import { RequireRole } from "@/components/RequireRole";
import { PortalHeader } from "@/components/PortalHeader";
import { AdminNav } from "./_components/AdminNav";

export default function AdministradorLayout({ children }: LayoutProps<"/administrador">) {
  return (
    <RequireRole role="doctoral_admin">
      <PortalHeader homeHref="/administrador" title="Panel de Administración" variant="administrador" />
      <AdminNav />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6">{children}</main>
    </RequireRole>
  );
}
