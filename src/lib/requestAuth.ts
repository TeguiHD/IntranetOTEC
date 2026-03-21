import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

import { parseAppRole, type AuthzContext } from "@/lib/authz";

export async function getRequestAuthContext(
  request: NextRequest,
): Promise<AuthzContext | null> {
  // Must match the cookie name used in src/auth.ts (isProd = NODE_ENV === "production")
  const secureCookie = process.env.NODE_ENV === "production";

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie,
  });

  if (!token) {
    return null;
  }

  const userRol = parseAppRole(token.rol);
  const userId =
    typeof token.sub === "string"
      ? token.sub
      : typeof token.id === "string"
        ? token.id
        : null;

  if (!userRol || !userId) {
    return null;
  }

  return { userId, userRol };
}
