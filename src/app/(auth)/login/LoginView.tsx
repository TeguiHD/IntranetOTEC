"use client";

import { FormEvent, useEffect, useRef, useState, useTransition } from "react";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { RutInput } from "@/components/shared/RutInput";
import { normalizarRut } from "@/lib/rut";

type LoginTab = "alumno" | "staff";

const TAB_LABELS: Record<LoginTab, string> = {
  alumno: "Alumno (RUT)",
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

export function LoginView({ authError }: LoginViewProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<LoginTab>("alumno");
  const [rut, setRut] = useState("");
  const [isRutValid, setIsRutValid] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <main className="flex min-h-screen items-center bg-bg-light px-4 py-8 dark:bg-gray-950 sm:py-12">
      <section className="mx-auto w-full max-w-md rounded-md border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <header className="border-b border-gray-200 px-6 py-5 text-center dark:border-gray-700">
          <h1 className="text-2xl font-bold text-primary dark:text-primary-light">Mi OTEC</h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-300">
            Intranet educativa
          </p>
        </header>

        <div className="-mx-6 mt-0 flex border-b border-gray-200 px-6 dark:border-gray-700">
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
                className={`relative flex-1 border-b-[3px] px-4 py-3 text-sm font-medium ${
                  active
                    ? "border-primary text-primary dark:text-primary-light"
                    : "border-gray-200 text-text-secondary hover:text-text-primary dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            );
          })}
        </div>

        <div className="px-6 py-6">
          {activeTab === "alumno" ? (
            <form className="space-y-4" onSubmit={handleAlumnoSubmit} noValidate>
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
              <button
                type="submit"
                disabled={isPending}
                className="h-11 w-full rounded bg-primary text-sm font-semibold text-white hover:bg-primary-dark focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:bg-primary-dark dark:hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Validando…" : "Ingresar"}
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleStaffSubmit} noValidate>
              <div className="space-y-1">
                <label htmlFor="staff-email" className="text-sm font-medium text-text-primary dark:text-gray-100">
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
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary placeholder:text-gray-500 focus:border-transparent focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-400"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="staff-password" className="text-sm font-medium text-text-primary dark:text-gray-100">
                  Contraseña
                </label>
                <input
                  id="staff-password"
                  name="password"
                  type="password"
                  inputMode="text"
                  autoComplete="current-password"
                  value={password}
                  disabled={isPending}
                  onChange={(event) => setPassword(event.currentTarget.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary placeholder:text-gray-500 focus:border-transparent focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-400"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="h-11 w-full rounded bg-primary text-sm font-semibold text-white hover:bg-primary-dark focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:bg-primary-dark dark:hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Validando…" : "Ingresar"}
              </button>
            </form>
          )}

          <p className="mt-4 text-center text-xs text-text-secondary dark:text-gray-300">
            ¿Problemas de acceso? Contacta al administrador de la intranet.
          </p>

          <p className="sr-only" role="status" aria-live="polite">
            {formError ?? queryError ?? ""}
          </p>
        </div>
      </section>
    </main>
  );
}