"use client";

import { FormEvent, useEffect, useRef, useState, useTransition } from "react";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import Image from "next/image";

import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  User,
} from "lucide-react";

import { RutInput } from "@/components/shared/RutInput";
import { normalizarRut } from "@/lib/rut";

type LoginTab = "alumno" | "staff";

const TAB_LABELS: Record<LoginTab, string> = {
  alumno: "Alumno",
  staff: "Docente / Admin",
};

const AUTH_ERROR_MESSAGE = "Credenciales inválidas. Verifica tus datos e inténtalo nuevamente.";

const mapAuthError = (rawError: string | null): string | null => {
  if (!rawError) {
    return null;
  }

  const normalized = rawError.toLowerCase();

  if (normalized.includes("credentials") || normalized.includes("callbackrouteerror")) {
    return AUTH_ERROR_MESSAGE;
  }

  return "No fue posible iniciar sesión. Intenta nuevamente en unos segundos.";
};

type LoginViewProps = {
  authError?: string;
};

function EyeIcon({ open }: { open: boolean }) {
  return open ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />;
}

function OtecLogo() {
  return (
    <Image
      src="/logo.svg"
      alt="Mi OTEC Intranet"
      width={320}
      height={130}
      className="h-24 w-auto object-contain sm:h-28"
      priority
    />
  );
}

export function LoginView({ authError }: LoginViewProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<LoginTab>("alumno");
  const [rut, setRut] = useState("");
  const [isRutValid, setIsRutValid] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const lastQueryErrorRef = useRef<string | null>(null);
  const lastFormErrorRef = useRef<string | null>(null);

  const queryError = mapAuthError(authError ?? null);

  useEffect(() => {
    if (!queryError || lastQueryErrorRef.current === queryError) {
      return;
    }

    lastQueryErrorRef.current = queryError;
    toast.error(queryError);
  }, [queryError]);

  useEffect(() => {
    if (!formError || lastFormErrorRef.current === formError) {
      return;
    }

    lastFormErrorRef.current = formError;
    toast.error(formError);
  }, [formError]);

  const runSignIn = (
    provider: "alumno-rut" | "staff-credentials",
    payload: Record<string, string>,
  ) => {
    startTransition(async () => {
      setFormError(null);

      const result = await signIn(provider, {
        ...payload,
        redirect: false,
      });

      if (!result || result.error) {
        setFormError(mapAuthError(result?.error ?? "credentials") ?? AUTH_ERROR_MESSAGE);
        return;
      }

      toast.success("Inicio de sesión exitoso. Redirigiendo...");
      router.replace("/");
      router.refresh();
    });
  };

  const handleAlumnoSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const rutLimpio = normalizarRut(rut);

    if (!rutLimpio || !isRutValid) {
      setFormError("Debes ingresar un RUT válido para continuar.");
      return;
    }

    runSignIn("alumno-rut", { rut: rutLimpio });
  };

  const handleStaffSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      setFormError("Debes ingresar correo y contraseña.");
      return;
    }

    runSignIn("staff-credentials", {
      email: email.trim().toLowerCase(),
      password,
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f3eef9] via-[#ede6f5] to-[#e8dff2] px-4 py-8 dark:from-gray-950 dark:via-[#0d0a14] dark:to-[#100c18]">
      {/* Decorative background circles */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl dark:bg-primary/5" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/8 blur-3xl dark:bg-primary/4" />
      </div>

      <section className="relative w-full max-w-md">
        {/* Logo + brand */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <OtecLogo />
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Acceso seguro a tu intranet educativa
          </p>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white/90 shadow-xl shadow-gray-200/50 backdrop-blur-sm dark:border-gray-700/60 dark:bg-gray-900/90 dark:shadow-none">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {(["alumno", "staff"] as const).map((tab) => {
              const active = activeTab === tab;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setFormError(null);
                    setActiveTab(tab);
                  }}
                  className={`relative flex-1 py-3.5 text-sm font-semibold transition-colors duration-200 ${
                    active
                      ? "bg-primary/5 text-primary dark:bg-primary/10 dark:text-primary-light"
                      : "text-text-secondary hover:bg-gray-50 hover:text-text-primary dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                  }`}
                >
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary dark:bg-primary-light" />
                  )}
                  <span className="flex items-center justify-center gap-2">
                    {tab === "alumno" ? <User className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    {TAB_LABELS[tab]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="px-6 py-7">
            {activeTab === "alumno" ? (
              <form className="space-y-5" onSubmit={handleAlumnoSubmit} noValidate>
                <div>
                  <p className="mb-4 text-sm text-text-secondary dark:text-gray-400">
                    Ingresa con tu <strong className="text-text-primary dark:text-white">RUT</strong> sin puntos y con guión (ej: 12345678-9).
                  </p>
                  <RutInput
                    id="alumno-rut"
                    name="rut"
                    value={rut}
                    required
                    autoFocus
                    disabled={isPending}
                    onChange={setRut}
                    onValidityChange={setIsRutValid}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isPending || !isRutValid}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cta text-sm font-semibold text-white shadow-md shadow-cta/20 transition-all duration-200 hover:bg-cta-dark hover:shadow-lg hover:shadow-cta/30 focus:ring-2 focus:ring-cta focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-cta/10"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Validando…
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4" />
                      Ingresar como Alumno
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form className="space-y-5" onSubmit={handleStaffSubmit} noValidate>
                <div className="space-y-1.5">
                  <label htmlFor="staff-email" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                    Correo electrónico
                  </label>
                  <input
                    id="staff-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    value={email}
                    disabled={isPending}
                    onChange={(event) => setEmail(event.currentTarget.value)}
                    placeholder="docente@miotec.cl"
                    className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3.5 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-primary-light dark:focus:ring-primary-light/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="staff-password" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="staff-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      disabled={isPending}
                      onChange={(event) => setPassword(event.currentTarget.value)}
                      placeholder="••••••••"
                      className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3.5 pr-11 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-primary-light dark:focus:ring-primary-light/20"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-text-primary dark:text-gray-500 dark:hover:text-gray-300"
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cta text-sm font-semibold text-white shadow-md shadow-cta/20 transition-all duration-200 hover:bg-cta-dark hover:shadow-lg hover:shadow-cta/30 focus:ring-2 focus:ring-cta focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-cta/10"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Validando…
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Ingresar como Staff
                    </>
                  )}
                </button>
              </form>
            )}

            <p className="mt-5 text-center text-xs text-text-secondary dark:text-gray-500">
              ¿Problemas de acceso?{" "}
              <span className="text-primary dark:text-primary-light">Contacta al administrador.</span>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-text-secondary/60 dark:text-gray-600">
          Mi OTEC · Intranet educativa segura
        </p>

        <p className="sr-only" role="status" aria-live="polite">
          {formError ?? queryError ?? ""}
        </p>
      </section>
    </main>
  );
}
