import { redirect } from "next/navigation";

export const metadata = { title: "Mi Horario" };

export default function AlumnoHorarioRedirect() {
  redirect("/alumno/calendario");
}
