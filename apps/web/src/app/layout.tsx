import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal de Doctorados",
  description: "Plataforma de estudio para programas de doctorado.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="relative min-h-full flex flex-col bg-paper text-ink">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
