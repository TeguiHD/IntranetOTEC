import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

import { parseAppRole, type AuthzContext } from "@/lib/authz";

export async function getRequestAuthContext(
  request: NextRequest,
): Promise<AuthzContext | null> {
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    ?.toLowerCase();
  const secureByForwardedProto = forwardedProto === "https";
  const secureByConfig = (process.env.AUTH_URL ?? "").startsWith("https://");

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: secureByForwardedProto || secureByConfig,
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
