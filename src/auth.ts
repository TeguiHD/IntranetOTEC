import { randomUUID } from "node:crypto";

import { and, eq, isNull, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { getDb } from "@/db";
import { usuarios } from "@/db/schema";
import { parseAppRole, type AppRole } from "@/lib/authz";
import { registrarAudit } from "@/lib/audit";
import { logEvent } from "@/lib/observability/logger";
import { esRutExtranjero, formatearRut, normalizarRut, validarRut } from "@/lib/rut";

type AuthUserRecord = {
  id: string;
  nombre: string;
  apellido: string;
  rut: string | null;
  email: string | null;
  password: string | null;
  rol: AppRole;
};

const AUTH_ERROR_RESPONSE = "Credenciales inválidas";
const isProd = process.env.NODE_ENV === "production";
type StaffRole = Extract<AppRole, "admin" | "docente">;

type EmergencyStaffAccount = {
  email: string;
  role: StaffRole;
};

const splitCsv = (rawValue: string | undefined): string[] =>
  (rawValue ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const toSafeSlug = (value: string): string => {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return normalized || "user";
};

const emergencyAuthEnabled = (): boolean =>
  process.env.ENABLE_EMERGENCY_AUTH === "true";

const getEmergencyStaffAccounts = (): EmergencyStaffAccount[] => {
  const superAdminAccounts = splitCsv(process.env.SUPERADMIN_EMAILS).map((email) => ({
    email: normalizeEmail(email),
    role: "admin" as const,
  }));
  const docenteAccounts = splitCsv(process.env.TEST_DOCENTE_EMAILS).map((email) => ({
    email: normalizeEmail(email),
    role: "docente" as const,
  }));

  return [...superAdminAccounts, ...docenteAccounts];
};

const getEmergencyAlumnoRuts = (): Set<string> =>
  new Set(
    splitCsv(process.env.TEST_ALUMNO_RUTS)
      .map((rut) => normalizarRut(rut))
      .filter((rut) => validarRut(rut)),
  );

const verifyEmergencyPassword = async (password: string): Promise<boolean> => {
  const hashed = process.env.EMERGENCY_AUTH_PASSWORD_HASH?.trim();

  if (hashed) {
    try {
      return await bcrypt.compare(password, hashed);
    } catch {
      return false;
    }
  }

  const plain = process.env.EMERGENCY_AUTH_PASSWORD;
  return Boolean(plain && password === plain);
};

const resolveEmergencyStaffUser = async (
  email: string,
  password: string,
): Promise<AuthUserRecord | null> => {
  if (!emergencyAuthEnabled()) {
    return null;
  }

  const account = getEmergencyStaffAccounts().find((candidate) => candidate.email === email);

  if (!account) {
    return null;
  }

  const passwordOk = await verifyEmergencyPassword(password);

  if (!passwordOk) {
    return null;
  }

  return {
    id: `emg-${account.role}-${toSafeSlug(account.email)}`,
    nombre: account.role === "admin" ? "Superadmin" : "Docente",
    apellido: "Prueba",
    rut: null,
    email: account.email,
    password: null,
    rol: account.role,
  };
};

const resolveEmergencyAlumnoUser = (rutLimpio: string): AuthUserRecord | null => {
  if (!emergencyAuthEnabled()) {
    return null;
  }

  if (!getEmergencyAlumnoRuts().has(rutLimpio)) {
    return null;
  }

  return {
    id: `emg-alumno-${toSafeSlug(rutLimpio)}`,
    nombre: "Alumno",
    apellido: "Prueba",
    rut: rutLimpio,
    email: null,
    password: null,
    rol: "alumno",
  };
};

const getClientIp = (request: Request): string | undefined => {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim();
  }

  const realIp = request.headers.get("x-real-ip");
  return realIp ?? undefined;
};

const getCorrelationId = (request: Request): string =>
  request.headers.get("x-correlation-id") ?? randomUUID();

const buildDisplayName = (record: Pick<AuthUserRecord, "nombre" | "apellido">): string =>
  `${record.nombre} ${record.apellido}`.trim();

const toAuthUser = (record: AuthUserRecord) => ({
  id: record.id,
  name: buildDisplayName(record),
  email: record.email,
  rol: record.rol,
});

const registrarLogin = async ({
  request,
  user,
  exitoso,
  metodo,
  motivo,
}: {
  request: Request;
  user: Pick<AuthUserRecord, "id" | "rol"> | null;
  exitoso: boolean;
  metodo: "alumno-rut" | "staff-credentials";
  motivo: string;
}): Promise<void> => {
  await registrarAudit({
    correlationId: getCorrelationId(request),
    userId: user?.id ?? null,
    userRol: user?.rol ?? null,
    accion: exitoso ? "login_ok" : "login_fail",
    entidad: "auth",
    payload: {
      metodo,
      motivo,
    },
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
    exitoso,
  });
};

const selectAuthFields = {
  id: usuarios.id,
  nombre: usuarios.nombre,
  apellido: usuarios.apellido,
  rut: usuarios.rut,
  email: usuarios.email,
  password: usuarios.password,
  rol: usuarios.rol,
};

const denyAndAudit = async (
  request: Request,
  metodo: "alumno-rut" | "staff-credentials",
  motivo: string,
  user?: Pick<AuthUserRecord, "id" | "rol"> | null,
) => {
  await registrarLogin({
    request,
    user: user ?? null,
    exitoso: false,
    metodo,
    motivo,
  });

  return null;
};

const nextAuth = NextAuth({
  pages: {
    signIn: "/login",
    error: "/login",
  },
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60,
    updateAge: 15 * 60,
  },
  cookies: {
    sessionToken: {
      name: isProd ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        secure: isProd,
      },
    },
  },
  providers: [
    Credentials({
      id: "alumno-rut",
      name: "Alumno RUT",
      credentials: {
        rut: { label: "RUT", type: "text" },
      },
      async authorize(credentials, request) {
        const rawRut = typeof credentials?.rut === "string" ? credentials.rut : "";
        const isForeign = esRutExtranjero(rawRut);
        const rutLimpio = isForeign ? rawRut.trim().toUpperCase() : normalizarRut(rawRut);

        try {
          const db = getDb();

          if (!isForeign && !validarRut(rutLimpio)) {
            return denyAndAudit(request, "alumno-rut", "rut_invalido");
          }

          if (isForeign && rutLimpio.length < 7) {
            return denyAndAudit(request, "alumno-rut", "rut_extranjero_corto");
          }

          const rutFormateado = isForeign ? rutLimpio : formatearRut(rutLimpio);

          const [record] = await db
            .select(selectAuthFields)
            .from(usuarios)
            .where(
              and(
                isForeign
                  ? eq(usuarios.rut, rutLimpio)
                  : or(eq(usuarios.rut, rutLimpio), eq(usuarios.rut, rutFormateado)),
                eq(usuarios.rol, "alumno"),
                eq(usuarios.activo, true),
                isNull(usuarios.eliminadoAt),
              ),
            )
            .limit(1);

          if (!record || !record.password) {
            const emergencyUser = resolveEmergencyAlumnoUser(rutLimpio);

            if (emergencyUser) {
              logEvent({
                correlationId: getCorrelationId(request),
                action: "auth_emergency_account_used",
                result: "success",
                details: {
                  provider: "alumno-rut",
                  role: emergencyUser.rol,
                },
              });

              await registrarLogin({
                request,
                user: { id: emergencyUser.id, rol: emergencyUser.rol },
                exitoso: true,
                metodo: "alumno-rut",
                motivo: "ok_emergency",
              });

              return toAuthUser(emergencyUser);
            }

            return denyAndAudit(request, "alumno-rut", "usuario_no_encontrado");
          }

          const rutSalt = process.env.RUT_SALT;

          if (!rutSalt) {
            logEvent({
              correlationId: getCorrelationId(request),
              action: "auth_missing_rut_salt",
              result: "error",
              details: { provider: "alumno-rut" },
            });

            return denyAndAudit(
              request,
              "alumno-rut",
              "server_configuration_error",
              { id: record.id, rol: record.rol },
            );
          }

          const expectedSecret = `${rutSalt}${record.rut ?? rutLimpio}${record.id}`;
          const passwordOk = await bcrypt.compare(expectedSecret, record.password);

          if (!passwordOk) {
            return denyAndAudit(
              request,
              "alumno-rut",
              "password_mismatch",
              { id: record.id, rol: record.rol },
            );
          }

          await registrarLogin({
            request,
            user: { id: record.id, rol: record.rol },
            exitoso: true,
            metodo: "alumno-rut",
            motivo: "ok",
          });

          return toAuthUser(record);
        } catch (error) {
          const message = error instanceof Error ? error.message : "unknown_auth_error";

          if (validarRut(rutLimpio)) {
            const emergencyUser = resolveEmergencyAlumnoUser(rutLimpio);

            if (emergencyUser) {
              logEvent({
                correlationId: getCorrelationId(request),
                action: "auth_emergency_account_used",
                result: "success",
                details: {
                  provider: "alumno-rut",
                  role: emergencyUser.rol,
                  reason: "db_unavailable",
                },
              });

              await registrarLogin({
                request,
                user: { id: emergencyUser.id, rol: emergencyUser.rol },
                exitoso: true,
                metodo: "alumno-rut",
                motivo: "ok_emergency",
              });

              return toAuthUser(emergencyUser);
            }
          }

          logEvent({
            correlationId: getCorrelationId(request),
            action: "auth_provider_failed",
            result: "error",
            details: {
              provider: "alumno-rut",
              message,
            },
          });

          return denyAndAudit(request, "alumno-rut", "provider_error");
        }
      },
    }),
    Credentials({
      id: "staff-credentials",
      name: "Staff Credentials",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials, request) {
        const email =
          typeof credentials?.email === "string"
            ? normalizeEmail(credentials.email)
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) {
          return denyAndAudit(request, "staff-credentials", "missing_credentials");
        }

        try {
          const db = getDb();

          const [record] = await db
            .select(selectAuthFields)
            .from(usuarios)
            .where(
              and(
                eq(usuarios.email, email),
                eq(usuarios.activo, true),
                isNull(usuarios.eliminadoAt),
              ),
            )
            .limit(1);

          if (!record || !record.password) {
            const emergencyUser = await resolveEmergencyStaffUser(email, password);

            if (emergencyUser) {
              logEvent({
                correlationId: getCorrelationId(request),
                action: "auth_emergency_account_used",
                result: "success",
                details: {
                  provider: "staff-credentials",
                  role: emergencyUser.rol,
                },
              });

              await registrarLogin({
                request,
                user: { id: emergencyUser.id, rol: emergencyUser.rol },
                exitoso: true,
                metodo: "staff-credentials",
                motivo: "ok_emergency",
              });

              return toAuthUser(emergencyUser);
            }

            return denyAndAudit(request, "staff-credentials", "usuario_no_encontrado");
          }

          if (record.rol === "alumno") {
            return denyAndAudit(
              request,
              "staff-credentials",
              "rol_no_permitido",
              { id: record.id, rol: record.rol },
            );
          }

          const passwordOk = await bcrypt.compare(password, record.password);

          if (!passwordOk) {
            return denyAndAudit(
              request,
              "staff-credentials",
              "password_mismatch",
              { id: record.id, rol: record.rol },
            );
          }

          await registrarLogin({
            request,
            user: { id: record.id, rol: record.rol },
            exitoso: true,
            metodo: "staff-credentials",
            motivo: "ok",
          });

          return toAuthUser(record);
        } catch (error) {
          const message = error instanceof Error ? error.message : "unknown_auth_error";
          const emergencyUser = await resolveEmergencyStaffUser(email, password);

          if (emergencyUser) {
            logEvent({
              correlationId: getCorrelationId(request),
              action: "auth_emergency_account_used",
              result: "success",
              details: {
                provider: "staff-credentials",
                role: emergencyUser.rol,
                reason: "db_unavailable",
              },
            });

            await registrarLogin({
              request,
              user: { id: emergencyUser.id, rol: emergencyUser.rol },
              exitoso: true,
              metodo: "staff-credentials",
              motivo: "ok_emergency",
            });

            return toAuthUser(emergencyUser);
          }

          logEvent({
            correlationId: getCorrelationId(request),
            action: "auth_provider_failed",
            result: "error",
            details: {
              provider: "staff-credentials",
              message,
            },
          });

          return denyAndAudit(request, "staff-credentials", "provider_error");
        }
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      const configuredBaseUrl =
        process.env.AUTH_URL?.trim() ?? process.env.NEXT_PUBLIC_BASE_URL?.trim() ?? baseUrl;

      let safeBaseUrl = baseUrl;

      try {
        safeBaseUrl = new URL(configuredBaseUrl).origin;
      } catch {
        safeBaseUrl = baseUrl;
      }

      if (url.startsWith("/")) {
        return `${safeBaseUrl}${url}`;
      }

      try {
        const targetUrl = new URL(url);

        if (targetUrl.origin === safeBaseUrl) {
          return targetUrl.toString();
        }
      } catch {
        return safeBaseUrl;
      }

      return safeBaseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        const role = parseAppRole((user as { rol?: unknown }).rol);

        token.id = user.id;

        if (role) {
          token.rol = role;
        }
      }

      if (!token.sub && typeof token.id === "string") {
        token.sub = token.id;
      }

      return token;
    },
    async session({ session, token }) {
      const userId =
        typeof token.sub === "string"
          ? token.sub
          : typeof token.id === "string"
            ? token.id
            : null;
      const role = parseAppRole(token.rol);

      if (session.user && userId) {
        session.user.id = userId;
      }

      if (session.user && role) {
        session.user.rol = role;
      }

      return session;
    },
  },
});

export const { handlers, signIn, signOut, auth } = nextAuth;
export const authInvalidCredentialsMessage = AUTH_ERROR_RESPONSE;