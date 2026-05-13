export type TutorialCategoria = "principal" | "completo";

export type Tutorial = {
  slug: string;
  titulo: string;
  descripcionCorta: string;
  descripcionLarga: string;
  pasos: string[];
  duracion: string;
  categoria: TutorialCategoria;
  mp4: string;
  poster: string;
  disponible: boolean;
};

export const TUTORIALES_ALUMNO: Tutorial[] = [
  {
    slug: "panel-principal",
    titulo: "1. Panel Principal",
    descripcionCorta: "Botones de acceso rápido y notificaciones de eventos importantes.",
    descripcionLarga:
      "Recorrido por el panel principal del alumno: accesos rápidos a todos los módulos, y al hacer scroll, las notificaciones de eventos importantes como evaluaciones pendientes y notas recientes.",
    pasos: [
      "Ingresa con tu RUT y PIN.",
      "El panel muestra accesos rápidos a Cursos, Materiales, Calendario, Notas y Asistencia.",
      "Haz scroll hacia abajo para ver notificaciones recientes.",
      "Revisa evaluaciones pendientes y últimas notas publicadas.",
    ],
    duracion: "1 min",
    categoria: "principal",
    mp4: "/tutoriales/alumno/alumno-01-login-dashboard.mp4",
    poster: "/tutoriales/alumno/posters/poster-01-login.png",
    disponible: true,
  },
  {
    slug: "mis-cursos",
    titulo: "2. Mis Cursos",
    descripcionCorta: "Cursos inscritos con asistencia y notas.",
    descripcionLarga:
      "En Mis Cursos ves los cursos a los que estás inscrito, junto con tu asistencia acumulada y las notas obtenidas en cada uno.",
    pasos: [
      "Ve a «Mis Cursos» en el menú lateral.",
      "Cada tarjeta muestra el curso al que estás inscrito.",
      "Al entrar verás tu asistencia y notas del curso.",
    ],
    duracion: "Próximamente",
    categoria: "principal",
    mp4: "/tutoriales/alumno/alumno-02-cursos-materiales.mp4",
    poster: "/tutoriales/alumno/posters/poster-02-cursos.png",
    disponible: true,
  },
  {
    slug: "materiales",
    titulo: "3. Materiales",
    descripcionCorta: "PDFs y archivos que suben los docentes por curso inscrito.",
    descripcionLarga:
      "Sección de materiales con los archivos que tus docentes suben para cada curso al que estás inscrito. Descárgalos cuando los necesites.",
    pasos: [
      "Ve a «Materiales» en el menú lateral.",
      "Encuentra el material organizado por curso inscrito.",
      "Haz clic en «Abrir archivo» para descargarlo.",
    ],
    duracion: "Próximamente",
    categoria: "principal",
    mp4: "",
    poster: "/tutoriales/alumno/posters/poster-02-cursos.png",
    disponible: false,
  },
  {
    slug: "calendario",
    titulo: "4. Calendario",
    descripcionCorta: "Eventos del mes con clic intuitivo en cada uno.",
    descripcionLarga:
      "El calendario muestra todos tus eventos del mes: clases, evaluaciones y entregas. Haz clic en cualquier evento para ver el detalle e ir directo a la sección correspondiente.",
    pasos: [
      "Ve a «Calendario» en el menú lateral.",
      "Visualiza todos los eventos del mes en la grilla.",
      "Haz clic en un evento para ver su detalle.",
      "Navega directamente a la evaluación o clase correspondiente.",
    ],
    duracion: "Próximamente",
    categoria: "principal",
    mp4: "",
    poster: "/tutoriales/alumno/posters/poster-completo.png",
    disponible: false,
  },
  {
    slug: "clases",
    titulo: "5. Clases",
    descripcionCorta: "Acceso a clases grabadas que comparte el docente.",
    descripcionLarga:
      "Si el docente graba sus clases y las comparte por la intranet, aquí podrás verlas y volver a revisarlas cuando lo necesites.",
    pasos: [
      "Ve a «Clases» en el menú lateral.",
      "Selecciona el curso al que perteneces.",
      "Si el docente subió la grabación, podrás reproducirla.",
    ],
    duracion: "Próximamente",
    categoria: "principal",
    mp4: "",
    poster: "/tutoriales/alumno/posters/poster-completo.png",
    disponible: false,
  },
  {
    slug: "evaluaciones",
    titulo: "6. Evaluaciones",
    descripcionCorta: "Pruebas presenciales u online por curso inscrito.",
    descripcionLarga:
      "Encuentra las evaluaciones pendientes según los cursos a los que estás inscrito. Las pruebas pueden ser presenciales u online — las online se responden directamente desde aquí.",
    pasos: [
      "Ve a «Evaluaciones» en el menú lateral.",
      "Verás las pruebas pendientes por curso.",
      "Si es online, haz clic para responderla en la intranet.",
      "Si es presencial, verás la fecha y modalidad.",
      "Envía tus respuestas antes del plazo.",
    ],
    duracion: "Próximamente",
    categoria: "principal",
    mp4: "",
    poster: "/tutoriales/alumno/posters/poster-completo.png",
    disponible: false,
  },
  {
    slug: "mis-notas",
    titulo: "7. Mis Notas",
    descripcionCorta: "Calificaciones por curso y evaluación, o estado «en revisión».",
    descripcionLarga:
      "Consulta tus notas organizadas por curso y por cada evaluación. Si la nota aún no está publicada, verás el estado «en revisión» mientras el docente termina de calificar.",
    pasos: [
      "Ve a «Mis Notas» en el menú lateral.",
      "Las notas se muestran agrupadas por curso.",
      "Cada evaluación muestra su calificación o «En revisión».",
    ],
    duracion: "Próximamente",
    categoria: "principal",
    mp4: "/tutoriales/alumno/alumno-03-asistencia-notas.mp4",
    poster: "/tutoriales/alumno/posters/poster-03-notas.png",
    disponible: true,
  },
  {
    slug: "mi-asistencia",
    titulo: "8. Mi Asistencia",
    descripcionCorta: "Asistencia clase por clase, por curso inscrito.",
    descripcionLarga:
      "Revisa tu asistencia detallada por cada curso al que estás inscrito. Verás cada clase del curso y tu estado de asistencia.",
    pasos: [
      "Ve a «Mi Asistencia» en el menú lateral.",
      "Selecciona el curso para ver el detalle.",
      "Cada clase muestra si asististe o no.",
    ],
    duracion: "Próximamente",
    categoria: "principal",
    mp4: "",
    poster: "/tutoriales/alumno/posters/poster-03-notas.png",
    disponible: false,
  },
  {
    slug: "mis-certificados",
    titulo: "9. Mis Certificados",
    descripcionCorta: "Obtén tu certificado de alumno regular.",
    descripcionLarga:
      "Desde Mis Certificados puedes emitir de forma autónoma tu certificado de alumno regular. El certificado incluye QR de verificación y se descarga como PDF.",
    pasos: [
      "Ve a «Mis Certificados» en el menú lateral.",
      "Selecciona el tipo: Alumno Regular.",
      "Haz clic en «Emitir Certificado».",
      "Descarga el PDF con código QR de verificación.",
    ],
    duracion: "1 min",
    categoria: "principal",
    mp4: "/tutoriales/alumno/alumno-04-certificados.mp4",
    poster: "/tutoriales/alumno/posters/poster-04-certificados.png",
    disponible: true,
  },
  {
    slug: "credencial",
    titulo: "10. Credencial",
    descripcionCorta: "Credencial OTEC con beneficios en sponsors.",
    descripcionLarga:
      "Si tienes algún curso activo, puedes solicitar tu credencial. Esta credencial te otorga beneficios con los sponsors de la OTEC.",
    pasos: [
      "Ve a «Credencial» en el menú lateral.",
      "Verifica que tengas un curso activo.",
      "Solicita tu credencial desde la pantalla.",
      "Con tu credencial accedes a beneficios con sponsors.",
    ],
    duracion: "1 min",
    categoria: "principal",
    mp4: "/tutoriales/alumno/alumno-05-credencial.mp4",
    poster: "/tutoriales/alumno/posters/poster-05-credencial.png",
    disponible: true,
  },
  {
    slug: "tarjeta-beneficios",
    titulo: "11. Tarjeta de Beneficios",
    descripcionCorta: "Descuentos por asistencia para fidelizar estudiantes.",
    descripcionLarga:
      "La tarjeta de beneficios se basa en tu asistencia. A más asistencia, más descuentos disponibles. Es la forma de fidelizar a los estudiantes con beneficios reales.",
    pasos: [
      "Ve a «Tarjeta Beneficio» en el menú lateral.",
      "La tarjeta se llena según tu asistencia acumulada.",
      "Cada hito de asistencia desbloquea descuentos.",
    ],
    duracion: "2 min",
    categoria: "principal",
    mp4: "/tutoriales/alumno/alumno-06-tarjeta-beneficio.mp4",
    poster: "/tutoriales/alumno/posters/poster-06-beneficios.png",
    disponible: true,
  },
  {
    slug: "tutorial-completo",
    titulo: "Tutorial Completo del Alumno",
    descripcionCorta: "Recorrido completo por todos los módulos del alumno.",
    descripcionLarga:
      "Video completo que cubre todos los módulos disponibles para el alumno en un solo recorrido.",
    pasos: [],
    duracion: "Completo",
    categoria: "completo",
    mp4: "/tutoriales/alumno/tutorial_alumno.mp4",
    poster: "/tutoriales/alumno/posters/poster-completo.png",
    disponible: true,
  },
];

export const TUTORIALES_DOCENTE: Tutorial[] = [
  {
    slug: "panel",
    titulo: "1. Panel",
    descripcionCorta: "Botones de acceso rápido del docente.",
    descripcionLarga:
      "El panel principal del docente muestra los botones de acceso rápido a todos los módulos: asignaturas, materiales, pruebas, asistencia y calendario.",
    pasos: [
      "Ingresa con tu correo y contraseña.",
      "El panel muestra los accesos rápidos.",
      "Cada botón te lleva directo al módulo correspondiente.",
    ],
    duracion: "1 min",
    categoria: "principal",
    mp4: "/tutoriales/docente/docente-01-login-dashboard.mp4",
    poster: "/tutoriales/docente/posters/poster-01-login.png",
    disponible: true,
  },
  {
    slug: "mis-asignaturas",
    titulo: "2. Mis Asignaturas",
    descripcionCorta: "Calendario L-V por bloques + alumnos por curso.",
    descripcionLarga:
      "Mis Asignaturas muestra todos los cursos que dictas. Tiene un calendario semanal de lunes a viernes con tus bloques horarios por asignatura. Abajo verás tus alumnos por curso, con nombre, RUT y asistencia.",
    pasos: [
      "Ve a «Mis Asignaturas» en el menú lateral.",
      "Visualiza el calendario L-V con tus bloques horarios.",
      "Selecciona un curso para ver los alumnos.",
      "Revisa nombre, RUT y asistencia de cada alumno.",
    ],
    duracion: "2 min",
    categoria: "principal",
    mp4: "/tutoriales/docente/docente-02-asignaturas.mp4",
    poster: "/tutoriales/docente/posters/poster-02-asignaturas.png",
    disponible: true,
  },
  {
    slug: "materiales",
    titulo: "3. Materiales",
    descripcionCorta: "Cargar material y habilitar/deshabilitar visualización.",
    descripcionLarga:
      "Carga material de apoyo (PDFs, documentos) por cada curso que tienes asignado. Puedes habilitar o deshabilitar la visualización de cada material para los alumnos.",
    pasos: [
      "Ve a «Materiales» en el menú lateral.",
      "Selecciona el curso al que vas a subir el material.",
      "Haz clic en «Subir archivo».",
      "Habilita o deshabilita su visualización para los alumnos.",
    ],
    duracion: "2 min",
    categoria: "principal",
    mp4: "/tutoriales/docente/docente-04-materiales.mp4",
    poster: "/tutoriales/docente/posters/poster-04-materiales.png",
    disponible: true,
  },
  {
    slug: "pruebas",
    titulo: "4. Pruebas",
    descripcionCorta: "Crear pruebas con habilitar/deshabilitar.",
    descripcionLarga:
      "Crea pruebas para tus cursos con preguntas y opciones. Puedes habilitar o deshabilitar la prueba en cualquier momento — los alumnos solo ven las habilitadas.",
    pasos: [
      "Ve a «Pruebas» en el menú lateral.",
      "Selecciona el curso y haz clic en «Nueva prueba».",
      "Agrega las preguntas con sus opciones.",
      "Habilita la prueba para que los alumnos la vean.",
      "Deshabilítala cuando quieras dejar de recibir respuestas.",
    ],
    duracion: "3 min",
    categoria: "principal",
    mp4: "/tutoriales/docente/docente-05-evaluaciones.mp4",
    poster: "/tutoriales/docente/posters/poster-05-evaluaciones.png",
    disponible: true,
  },
  {
    slug: "asistencia",
    titulo: "5. Asistencia",
    descripcionCorta: "Activar la clase para pasar asistencia según fecha.",
    descripcionLarga:
      "De acuerdo a las fechas de tus clases programadas, puedes activar la clase para pasar asistencia. Una vez activa, los alumnos pueden marcar presencia (QR o manual).",
    pasos: [
      "Ve a «Asistencia» en el menú lateral.",
      "Encuentra la clase del día según fecha.",
      "Haz clic en «Activar clase».",
      "Pasa asistencia con QR o manualmente alumno por alumno.",
    ],
    duracion: "4 min",
    categoria: "principal",
    mp4: "/tutoriales/docente/docente-03-asistencia-qr.mp4",
    poster: "/tutoriales/docente/posters/poster-03-asistencia.png",
    disponible: true,
  },
  {
    slug: "mis-clases",
    titulo: "6. Mis Clases",
    descripcionCorta: "Clases ya hechas con asistencia de alumnos.",
    descripcionLarga:
      "Consulta el historial de clases que ya hiciste, organizadas por curso. Para cada clase puedes ver la asistencia registrada de tus alumnos.",
    pasos: [
      "Ve a «Mis Clases» en el menú lateral.",
      "Selecciona el curso.",
      "Revisa cada clase realizada con la asistencia registrada.",
    ],
    duracion: "Próximamente",
    categoria: "principal",
    mp4: "",
    poster: "/tutoriales/docente/posters/poster-completo.png",
    disponible: false,
  },
  {
    slug: "calendario",
    titulo: "7. Calendario",
    descripcionCorta: "Clases, evaluaciones y eventos personales.",
    descripcionLarga:
      "El calendario muestra todas tus clases programadas, las evaluaciones pendientes y los eventos personales que agregues. Vista mensual con detalle al hacer clic.",
    pasos: [
      "Ve a «Calendario» en el menú lateral.",
      "Visualiza tus clases del mes en la grilla.",
      "Verás también tus evaluaciones programadas.",
      "Agrega eventos personales con el botón de nuevo evento.",
    ],
    duracion: "Próximamente",
    categoria: "principal",
    mp4: "",
    poster: "/tutoriales/docente/posters/poster-completo.png",
    disponible: false,
  },
  {
    slug: "tutorial-completo",
    titulo: "Tutorial Completo del Docente",
    descripcionCorta: "Recorrido completo por todos los módulos del docente.",
    descripcionLarga:
      "Video completo que cubre todos los módulos del docente en un solo recorrido.",
    pasos: [],
    duracion: "Completo",
    categoria: "completo",
    mp4: "/tutoriales/docente/tutorial_docente.mp4",
    poster: "/tutoriales/docente/posters/poster-completo.png",
    disponible: true,
  },
];

export function getTutorialBySlug(
  slug: string,
  rol: "alumno" | "docente",
): Tutorial | undefined {
  const lista = rol === "alumno" ? TUTORIALES_ALUMNO : TUTORIALES_DOCENTE;
  return lista.find((t) => t.slug === slug);
}

export function getTutorialesAdyacentes(
  slug: string,
  rol: "alumno" | "docente",
): { anterior: Tutorial | null; siguiente: Tutorial | null } {
  const lista = (
    rol === "alumno" ? TUTORIALES_ALUMNO : TUTORIALES_DOCENTE
  ).filter((t) => t.categoria !== "completo");
  const idx = lista.findIndex((t) => t.slug === slug);
  return {
    anterior: idx > 0 ? lista[idx - 1] : null,
    siguiente: idx < lista.length - 1 ? lista[idx + 1] : null,
  };
}
