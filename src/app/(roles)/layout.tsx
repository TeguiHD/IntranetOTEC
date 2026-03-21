import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
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

  // Only admins see the pending solicitudes badge
  let pendingSolicitudes: number | undefined;
  if (role === "admin") {
    try {
      const db = getDb();
      const rows = await db
        .select({ id: solicitudesDocumentos.id })
        .from(solicitudesDocumentos)
        .where(eq(solicitudesDocumentos.estado, "pendiente"));
      pendingSolicitudes = rows.length > 0 ? rows.length : undefined;
    } catch {
      // Non-critical — silently skip badge if DB is unreachable
    }
  }

  return (
    <RoleShell role={role} userName={userName} pendingSolicitudes={pendingSolicitudes}>
      {children}
    </RoleShell>
  );
}