export const APP_ROLES = ["admin", "docente", "alumno"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export type AuthzContext = {
  userId: string;
  userRol: AppRole;
};

export type AuthzResult =
  | { permitido: true }
  | { permitido: false; motivo: string };

export const isAppRole = (role: string): role is AppRole =>
  APP_ROLES.includes(role as AppRole);

export const parseAppRole = (role: unknown): AppRole | null => {
  if (typeof role !== "string") {
    return null;
  }

  return isAppRole(role) ? role : null;
};

export const rolPermitidoEnRuta = (
  pathname: string,
  role: AppRole,
): AuthzResult => {
  if (pathname.startsWith("/admin") && role !== "admin") {
    return { permitido: false, motivo: "role_mismatch_admin" };
  }

  if (pathname.startsWith("/docente") && role !== "docente") {
    return { permitido: false, motivo: "role_mismatch_docente" };
  }

  if (pathname.startsWith("/alumno") && role !== "alumno") {
    return { permitido: false, motivo: "role_mismatch_alumno" };
  }

  return { permitido: true };
};

export const autorizarRoles = (
  context: AuthzContext,
  allowedRoles: AppRole[],
): AuthzResult => {
  if (!allowedRoles.includes(context.userRol)) {
    return { permitido: false, motivo: "role_not_allowed" };
  }

  return { permitido: true };
};

export const autorizarOwnership = (
  context: AuthzContext,
  ownerId: string | null | undefined,
  options?: { adminOverride?: boolean },
): AuthzResult => {
  if (!ownerId) {
    return { permitido: false, motivo: "owner_missing" };
  }

  if (context.userId === ownerId) {
    return { permitido: true };
  }

  if (options?.adminOverride !== false && context.userRol === "admin") {
    return { permitido: true };
  }

  return { permitido: false, motivo: "ownership_denied" };
};
