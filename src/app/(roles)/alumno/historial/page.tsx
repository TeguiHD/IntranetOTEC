import { redirect } from "next/navigation";

export const metadata = { title: "Historial" };

export default function AlumnoHistorialRedirect() {
  redirect("/alumno/notas");
}
