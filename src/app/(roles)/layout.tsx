import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { countSolicitudesPendientesAdmin } from "@/actions/solicitudes-documentos";
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

  let pendingSolicitudes = 0;
  if (role === "admin") {
    pendingSolicitudes = await countSolicitudesPendientesAdmin();
  }

  return (
    <RoleShell role={role} userName={userName} pendingSolicitudes={pendingSolicitudes}>
      {children}
    </RoleShell>
  );
}