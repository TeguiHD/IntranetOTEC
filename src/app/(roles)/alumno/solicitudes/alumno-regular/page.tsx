import { redirect } from "next/navigation";

export const metadata = { title: "Mis Certificados" };

export default function SolicitudAlumnoRegularPage() {
  redirect("/alumno/certificados");
}
