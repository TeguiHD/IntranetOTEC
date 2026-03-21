import { cambiarPasswordFormAction } from "@/actions/usuarios";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { auth } from "@/auth";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  password_changed: { tone: "success", text: "Contraseña actualizada correctamente." },
  invalid_input: { tone: "error", text: "Datos inválidos. La contraseña debe tener al menos 8 caracteres." },
  passwords_mismatch: { tone: "error", text: "Las contraseñas nuevas no coinciden." },
  wrong_current_password: { tone: "error", text: "La contraseña actual es incorrecta." },
  user_not_found: { tone: "error", text: "Usuario no encontrado." },
  forbidden: { tone: "error", text: "No autorizado." },
  error: { tone: "error", text: "No fue posible actualizar la contraseña." },
};

type DocentePerfilPageProps = {
  searchParams?: Promise<{ state?: string }>;
};

export default async function DocentePerfilPage({ searchParams }: DocentePerfilPageProps) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string }));
  const session = await auth();

  return (
    <section className="space-y-5">
      <RouteStateToast state={params?.state} map={STATUS_MAP} />

      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Mi Perfil
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Información de tu cuenta y opciones de seguridad.
        </p>
      </header>

      {/* User info */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 text-base font-semibold text-text-primary dark:text-white">
          Datos de la Cuenta
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted dark:text-gray-500">
              Nombre
            </p>
            <p className="mt-1 text-sm text-text-primary dark:text-white">
              {session?.user?.name ?? "-"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted dark:text-gray-500">
              Rol
            </p>
            <p className="mt-1 text-sm text-text-primary dark:text-white capitalize">
              {session?.user?.rol ?? "-"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted dark:text-gray-500">
              Correo
            </p>
            <p className="mt-1 text-sm text-text-primary dark:text-white">
              {session?.user?.email ?? "-"}
            </p>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 text-base font-semibold text-text-primary dark:text-white">
          Cambiar Contraseña
        </h2>
        <form action={cambiarPasswordFormAction} className="space-y-4 max-w-sm">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="currentPassword"
              className="text-xs font-medium text-text-secondary dark:text-gray-400"
            >
              Contraseña actual
            </label>
            <input
              id="currentPassword"
              type="password"
              name="currentPassword"
              required
              autoComplete="current-password"
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="newPassword"
              className="text-xs font-medium text-text-secondary dark:text-gray-400"
            >
              Nueva contraseña (mín. 8 caracteres)
            </label>
            <input
              id="newPassword"
              type="password"
              name="newPassword"
              required
              minLength={8}
              autoComplete="new-password"
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="confirmPassword"
              className="text-xs font-medium text-text-secondary dark:text-gray-400"
            >
              Confirmar nueva contraseña
            </label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              required
              minLength={8}
              autoComplete="new-password"
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <button
            type="submit"
            className="h-10 rounded-xl bg-gradient-to-r from-cta to-cta-dark px-5 text-sm font-semibold text-white shadow-md hover:opacity-90"
          >
            Actualizar contraseña
          </button>
        </form>
      </div>
    </section>
  );
}
