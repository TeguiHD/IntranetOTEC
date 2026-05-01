import { listarAsignaturasDocente, listarClasesMesDocente } from "@/actions/docente";

import { AsistenciaView } from "./AsistenciaView";

export const metadata = { title: "Asistencia" };

export default async function DocenteAsistenciaPage() {
  const hoy = new Date();
  const mes = hoy.getMonth() + 1;
  const anio = hoy.getFullYear();

  const [clasesMes, asignaturas] = await Promise.all([
    listarClasesMesDocente(anio, mes),
    listarAsignaturasDocente(),
  ]);

  return (
    <AsistenciaView
      clasesMesInicial={clasesMes}
      asignaturas={asignaturas}
      mesInicial={mes}
      anioInicial={anio}
    />
  );
}
