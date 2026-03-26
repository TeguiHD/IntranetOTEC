import { BASE_URL, renderEmailBase } from "./base";

/* ─── Helpers ──────────────────────────────────────────────────────── */

const heading = (text: string) =>
  `<h2 style="color:#1f2937;font-size:18px;font-weight:700;margin:0 0 16px;">${text}</h2>`;

const paragraph = (text: string) =>
  `<p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 12px;">${text}</p>`;

const detail = (label: string, value: string) =>
  `<tr><td style="color:#6b7280;font-size:13px;padding:6px 12px 6px 0;vertical-align:top;white-space:nowrap;">${label}</td><td style="color:#1f2937;font-size:13px;font-weight:600;padding:6px 0;vertical-align:top;">${value}</td></tr>`;

const detailsTable = (rows: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;border-collapse:collapse;background-color:#f9fafb;border-radius:8px;overflow:hidden;"><tbody style="padding:12px;">${rows}</tbody></table>`;

const ctaButton = (href: string, label: string) =>
  `<div style="text-align:center;margin:24px 0 8px;"><a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#8B3A9E,#5A1F68);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:10px;box-shadow:0 2px 8px rgba(139,58,158,0.3);">${label}</a></div>`;

/* ─── Templates ────────────────────────────────────────────────────── */

export function templateDocenteAsignado(data: {
  docenteNombre: string;
  asignaturaNombre: string;
  asignaturaCodigo: string | null;
  fechaInicio: string;
}) {
  const body = [
    heading("Has sido asignado como docente"),
    paragraph(`Hola ${data.docenteNombre},`),
    paragraph("Se te ha asignado como docente responsable de una asignatura en la plataforma Mi OTEC."),
    detailsTable(
      detail("Asignatura", data.asignaturaNombre) +
      (data.asignaturaCodigo ? detail("Código", data.asignaturaCodigo) : "") +
      detail("Fecha inicio", data.fechaInicio),
    ),
    paragraph("Ya puedes acceder a tu panel de docente para gestionar las clases, asistencia y materiales."),
    ctaButton(`${BASE_URL}/docente/asignaturas`, "Ir al panel docente"),
  ].join("");

  return {
    subject: `Asignación docente: ${data.asignaturaNombre}`,
    html: renderEmailBase("Asignación docente", body),
  };
}

export function templateMatriculaCreada(data: {
  alumnoNombre: string;
  asignaturaNombre: string;
  estadoPago: string;
}) {
  const body = [
    heading("Matrícula registrada"),
    paragraph(`Hola ${data.alumnoNombre},`),
    paragraph("Tu matrícula ha sido registrada exitosamente en la plataforma Mi OTEC."),
    detailsTable(
      detail("Asignatura", data.asignaturaNombre) +
      detail("Estado de pago", data.estadoPago.charAt(0).toUpperCase() + data.estadoPago.slice(1)),
    ),
    paragraph("Ya puedes acceder a tu panel de alumno para revisar tu asistencia y materiales disponibles."),
    ctaButton(`${BASE_URL}/alumno/asignaturas`, "Ir a mis cursos"),
  ].join("");

  return {
    subject: `Matrícula confirmada: ${data.asignaturaNombre}`,
    html: renderEmailBase("Matrícula registrada", body),
  };
}

export function templateMatriculaDesactivada(data: {
  alumnoNombre: string;
  asignaturaNombre: string;
}) {
  const body = [
    heading("Matrícula desactivada"),
    paragraph(`Hola ${data.alumnoNombre},`),
    paragraph(`Tu matrícula en la asignatura <strong>${data.asignaturaNombre}</strong> ha sido desactivada.`),
    paragraph("Si consideras que esto es un error, por favor contacta al administrador de tu OTEC."),
  ].join("");

  return {
    subject: `Matrícula desactivada: ${data.asignaturaNombre}`,
    html: renderEmailBase("Matrícula desactivada", body),
  };
}

export function templateMaterialSubido(data: {
  alumnoNombre: string;
  asignaturaNombre: string;
  materialNombre: string;
}) {
  const body = [
    heading("Nuevo material disponible"),
    paragraph(`Hola ${data.alumnoNombre},`),
    paragraph("Se ha subido nuevo material de estudio a una de tus asignaturas."),
    detailsTable(
      detail("Asignatura", data.asignaturaNombre) +
      detail("Archivo", data.materialNombre),
    ),
    paragraph("Puedes descargarlo desde tu panel de alumno."),
    ctaButton(`${BASE_URL}/alumno/asignaturas`, "Ver material"),
  ].join("");

  return {
    subject: `Nuevo material: ${data.asignaturaNombre}`,
    html: renderEmailBase("Nuevo material", body),
  };
}

export function templateSolicitudCreada(data: {
  alumnoNombre: string;
  tipoSolicitud: string;
}) {
  const body = [
    heading("Solicitud recibida"),
    paragraph(`Hola ${data.alumnoNombre},`),
    paragraph(`Tu solicitud de tipo <strong>${data.tipoSolicitud}</strong> ha sido recibida y está en revisión.`),
    paragraph("Te notificaremos cuando haya una respuesta. Puedes revisar el estado desde tu panel."),
    ctaButton(`${BASE_URL}/alumno/solicitudes`, "Ver mis solicitudes"),
  ].join("");

  return {
    subject: `Solicitud recibida: ${data.tipoSolicitud}`,
    html: renderEmailBase("Solicitud recibida", body),
  };
}

export function templateSolicitudResuelta(data: {
  alumnoNombre: string;
  tipoSolicitud: string;
  estado: string;
  respuesta: string | null;
}) {
  const estadoColor = data.estado === "aprobada" ? "#059669" : data.estado === "rechazada" ? "#dc2626" : "#6b7280";
  const body = [
    heading("Solicitud resuelta"),
    paragraph(`Hola ${data.alumnoNombre},`),
    paragraph(`Tu solicitud de tipo <strong>${data.tipoSolicitud}</strong> ha sido resuelta.`),
    detailsTable(
      detail("Estado", `<span style="color:${estadoColor};font-weight:700;">${data.estado.charAt(0).toUpperCase() + data.estado.slice(1)}</span>`) +
      (data.respuesta ? detail("Respuesta", data.respuesta) : ""),
    ),
    ctaButton(`${BASE_URL}/alumno/solicitudes`, "Ver detalle"),
  ].join("");

  return {
    subject: `Solicitud ${data.estado}: ${data.tipoSolicitud}`,
    html: renderEmailBase("Solicitud resuelta", body),
  };
}

export function templateCertificadoGenerado(data: {
  alumnoNombre: string;
  proposito: string;
  fechaEmision: string;
  solicitudId: string;
}) {
  const body = [
    heading("Certificado generado"),
    paragraph(`Hola ${data.alumnoNombre},`),
    paragraph("Tu <strong>Certificado de Alumno Regular</strong> ha sido generado exitosamente."),
    detailsTable(
      detail("Propósito", data.proposito) +
      detail("Fecha de emisión", data.fechaEmision) +
      detail("Referencia", data.solicitudId.slice(0, 8).toUpperCase()),
    ),
    paragraph("Puedes imprimir o descargar tu certificado desde el siguiente enlace:"),
    ctaButton(
      `${BASE_URL}/alumno/solicitudes/alumno-regular/certificado?solicitudId=${data.solicitudId}`,
      "Ver certificado",
    ),
  ].join("");

  return {
    subject: "Certificado de Alumno Regular generado",
    html: renderEmailBase("Certificado generado", body),
  };
}

export function templateEvaluacionPublicada(data: {
  alumnoNombre: string;
  evaluacionTitulo: string;
  asignaturaNombre: string;
  fechaLimite: string | null;
}) {
  const body = [
    heading("Nueva evaluación disponible"),
    paragraph(`Hola ${data.alumnoNombre},`),
    paragraph("Se ha publicado una nueva evaluación en uno de tus cursos."),
    detailsTable(
      detail("Evaluación", data.evaluacionTitulo) +
      detail("Asignatura", data.asignaturaNombre) +
      (data.fechaLimite ? detail("Fecha límite", data.fechaLimite) : ""),
    ),
    ctaButton(`${BASE_URL}/alumno/evaluaciones`, "Ir a evaluaciones"),
  ].join("");

  return {
    subject: `Nueva evaluación: ${data.evaluacionTitulo}`,
    html: renderEmailBase("Nueva evaluación", body),
  };
}

export function templateClaseAgendada(data: {
  alumnoNombre: string;
  claseTitulo: string;
  asignaturaNombre: string;
  fecha: string;
  hora?: string | null;
}) {
  const body = [
    heading("Nueva clase agendada"),
    paragraph(`Hola ${data.alumnoNombre},`),
    paragraph("Se ha publicado una nueva clase en uno de tus cursos."),
    detailsTable(
      detail("Clase", data.claseTitulo) +
      detail("Asignatura", data.asignaturaNombre) +
      detail("Fecha", data.fecha) +
      (data.hora ? detail("Hora", data.hora) : ""),
    ),
    ctaButton(`${BASE_URL}/alumno/clases`, "Ver clases"),
  ].join("");

  return {
    subject: `Nueva clase: ${data.claseTitulo} — ${data.asignaturaNombre}`,
    html: renderEmailBase("Nueva clase", body),
  };
}

export function templateNuevoMensaje(data: {
  destinatarioNombre: string;
  emisorNombre: string;
  asignaturaNombre: string;
  preview: string;
}) {
  const body = [
    heading("Nuevo mensaje"),
    paragraph(`Hola ${data.destinatarioNombre},`),
    paragraph(`<strong>${data.emisorNombre}</strong> te ha enviado un mensaje en la asignatura <strong>${data.asignaturaNombre}</strong>.`),
    `<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #8B3A9E;background:#faf5ff;border-radius:0 8px 8px 0;color:#4b5563;font-size:14px;font-style:italic;">${data.preview}</blockquote>`,
    ctaButton(`${BASE_URL}/alumno/asignaturas`, "Ver conversación"),
  ].join("");

  return {
    subject: `Nuevo mensaje de ${data.emisorNombre} — ${data.asignaturaNombre}`,
    html: renderEmailBase("Nuevo mensaje", body),
  };
}

export function templateBienvenida(data: {
  nombre: string;
  rol: string;
}) {
  const rolLabel = data.rol === "admin" ? "Administrador" : data.rol === "docente" ? "Docente" : "Alumno";
  const dashboardUrl = data.rol === "admin" ? "/admin" : data.rol === "docente" ? "/docente" : "/alumno";

  const body = [
    heading("Bienvenido a Mi OTEC"),
    paragraph(`Hola ${data.nombre},`),
    paragraph(`Tu cuenta ha sido creada exitosamente con el rol de <strong>${rolLabel}</strong>.`),
    paragraph("Ya puedes iniciar sesión y acceder a todas las funcionalidades de la plataforma."),
    ctaButton(`${BASE_URL}${dashboardUrl}`, "Ingresar a la plataforma"),
  ].join("");

  return {
    subject: "Bienvenido a Mi OTEC",
    html: renderEmailBase("Bienvenida", body),
  };
}
