// Desarrollado por Nicoholas Lopetegui — https://nicoholas.dev/
// Diseño y desarrollo web: Victor Salinas — NETLINKS (instagram.com/netlinks.cl)

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { countSolicitudesPendientesAdmin } from "@/actions/solicitudes-documentos";
import { EncuestaObligatoriaBlocker } from "@/components/shared/EncuestaObligatoriaBlocker";
import { PushNotificationSetup } from "@/components/shared/PushNotificationSetup";
import { RoleShell } from "@/components/shared/RoleShell";
import { parseAppRole } from "@/lib/authz";
import { obtenerEncuestasPendientesObligatorias } from "@/lib/encuestaBlocking";

type RolesLayoutProps = {
  children: React.ReactNode;
};

export default async function RolesLayout({ children }: RolesLayoutProps) {
  const session = await auth();
  const role = parseAppRole(session?.user?.rol);
  const userId = session?.user?.id;

  if (!session || !role || !userId) {
    redirect("/login");
  }

  const userName = session.user.name?.trim() || "Usuario";

  // Determine current path (injected by middleware via x-pathname header)
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-pathname") ?? "/";

  // Allow the /encuestas/* route through without blocking
  // so users can actually respond to surveys
  const isEncuestaResponsePath = pathname.startsWith("/encuestas/");

  const [pendingSolicitudes, encuestasPendientes] = await Promise.all([
    role === "admin" ? countSolicitudesPendientesAdmin() : Promise.resolve(0),
    // Only check for blocking if not already on a survey response page
    role === "alumno" || role === "docente"
      ? obtenerEncuestasPendientesObligatorias(userId)
      : Promise.resolve([]),
  ]);

  // Block navigation only for non-encuesta paths
  const hasPendingObligatory = !isEncuestaResponsePath && encuestasPendientes.length > 0;

  return (
    <RoleShell role={role} userName={userName} pendingSolicitudes={pendingSolicitudes}>
      {role === "alumno" && <PushNotificationSetup />}
      {hasPendingObligatory ? (
        <EncuestaObligatoriaBlocker pendientes={encuestasPendientes} />
      ) : (
        children
      )}
    </RoleShell>
  );
}