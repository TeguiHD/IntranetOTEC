import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { countMisNotificacionesNoLeidas } from "@/actions/notificaciones";
import { PushNotificationSetup } from "@/components/shared/PushNotificationSetup";
import { getDb } from "@/db";
import { solicitudesDocumentos } from "@/db/schema";
import { RoleShell } from "@/components/shared/RoleShell";
import { parseAppRole } from "@/lib/authz";

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

  const pendingSolicitudesPromise = role === "admin"
    ? (async () => {
        try {
          const db = getDb();
          const rows = await db
            .select({ id: solicitudesDocumentos.id })
            .from(solicitudesDocumentos)
            .where(eq(solicitudesDocumentos.estado, "pendiente"));

          return rows.length > 0 ? rows.length : undefined;
        } catch {
          return undefined;
        }
      })()
    : Promise.resolve(undefined);

  const unreadNotifsPromise = role === "alumno" || role === "docente"
    ? countMisNotificacionesNoLeidas().catch(() => 0)
    : Promise.resolve(0);

  const [pendingSolicitudes, unreadNotifs] = await Promise.all([
    pendingSolicitudesPromise,
    unreadNotifsPromise,
  ]);

  return (
    <RoleShell
      role={role}
      userName={userName}
      pendingSolicitudes={pendingSolicitudes}
      unreadNotifs={unreadNotifs}
    >
      <PushNotificationSetup />
      {children}
    </RoleShell>
  );
}