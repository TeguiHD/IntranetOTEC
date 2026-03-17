import { randomUUID } from "node:crypto";

import { auth } from "@/auth";
import { parseAppRole, type AppRole } from "@/lib/authz";
import { logEvent } from "@/lib/observability/logger";

export type MutationResult =
  | { ok: true; code: string }
  | { ok: false; code: string; message: string };

export type ActionActorContext = {
  correlationId: string;
  userId: string;
  userRol: AppRole;
};

export async function requireActionActor(
  action: string,
  allowedRoles: AppRole[],
): Promise<
  | { ok: true; actor: ActionActorContext }
  | { ok: false; result: MutationResult }
> {
  const correlationId = randomUUID();
  const session = await auth();
  const userRol = parseAppRole(session?.user?.rol);
  const userId = session?.user?.id;

  if (!userRol || !userId || !allowedRoles.includes(userRol)) {
    logEvent({
      correlationId,
      action,
      result: "denied",
      details: {
        reason: "role_not_allowed",
        role: userRol ?? "none",
      },
    });

    return {
      ok: false,
      result: {
        ok: false,
        code: "forbidden",
        message: "No autorizado para esta acción.",
      },
    };
  }

  return {
    ok: true,
    actor: {
      correlationId,
      userId,
      userRol,
    },
  };
}
