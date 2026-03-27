import { Bell } from "lucide-react";

import {
  listarAlumnosActivosAdmin,
  listarAsignaturasActivasAdmin,
  listarNotificacionesAdmin,
} from "@/actions/notificaciones";

import { NotificacionesAdminView } from "./NotificacionesAdminView";

export const metadata = { title: "Notificaciones" };

export default async function AdminNotificacionesPage() {
  const [asignaturas, alumnos, historial] = await Promise.all([
    listarAsignaturasActivasAdmin(),
    listarAlumnosActivosAdmin(),
    listarNotificacionesAdmin(),
  ]);

  return (
    <section className="space-y-5">
      <header className="flex items-center gap-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary">
          <Bell className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Notificaciones
          </h1>
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Envía mensajes a todos los alumnos, por curso o individualmente.
          </p>
        </div>
      </header>

      <NotificacionesAdminView
        asignaturas={asignaturas}
        alumnos={alumnos}
        historial={historial}
      />
    </section>
  );
}
