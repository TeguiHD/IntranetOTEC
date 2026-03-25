import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const tstz = (name: string) => timestamp(name, { withTimezone: true });

export const rolEnum = pgEnum("rol", ["admin", "docente", "alumno"]);

export const estadoAsigEnum = pgEnum("estado_asig", [
  "borrador",
  "activo",
  "finalizado",
  "archivado",
]);

export const auditAccionEnum = pgEnum("audit_accion", [
  "login_ok",
  "login_fail",
  "logout",
  "crear",
  "editar",
  "desactivar",
  "archivar",
  "cerrar_ciclo",
  "emitir_certificado",
  "invalidar_certificado",
  "subir_material",
  "exportar_excel",
  "cambiar_nota",
  "registrar_asistencia",
]);

export type Rol = (typeof rolEnum.enumValues)[number];
export type AuditAccion = (typeof auditAccionEnum.enumValues)[number];

export const estadoPagoEnum = pgEnum("estado_pago", [
  "pendiente",
  "pagado",
  "mora",
  "becado",
]);

export const estadoAsistEnum = pgEnum("estado_asist", [
  "presente",
  "ausente",
  "tardanza",
  "justificado",
]);

export const tipoEvalEnum = pgEnum("tipo_eval", [
  "formulario",
  "tarea",
  "examen",
  "proyecto",
]);

export const tipoPregEnum = pgEnum("tipo_preg", [
  "opcion_multiple",
  "verdadero_falso",
  "respuesta_corta",
  "desarrollo",
  "likert",
  "si_no",
  "texto_libre",
]);

export const audienciaEncuestaEnum = pgEnum("audiencia_encuesta", [
  "alumnos",
  "docentes",
  "todos",
]);

export const estadoEncuestaEnum = pgEnum("estado_encuesta", [
  "borrador",
  "activa",
  "cerrada",
]);

export const tipoCertEnum = pgEnum("tipo_cert", [
  "alumno_regular",
  "termino_curso",
]);

export const tipoSolicitudDocEnum = pgEnum("tipo_solicitud_doc", [
  "credencial",
  "alumno_regular",
  "tarjeta_beneficio",
]);

export const estadoSolicitudDocEnum = pgEnum("estado_solicitud_doc", [
  "pendiente",
  "aprobada",
  "rechazada",
]);

export const tipoFinEnum = pgEnum("tipo_fin", ["ingreso", "gasto"]);

export const tipoVideoEnum = pgEnum("tipo_video", [
  "youtube",
  "vimeo",
  "drive",
  "directo",
]);

export const usuarios = pgTable(
  "usuarios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rut: text("rut"),
    nombre: text("nombre").notNull(),
    apellido: text("apellido").notNull(),
    email: text("email").unique(),
    password: text("password"),
    rol: rolEnum("rol").notNull(),
    avatarUrl: text("avatar_url"),
    activo: boolean("activo").default(true),
    eliminadoAt: tstz("eliminado_at"),
    eliminadoPor: uuid("eliminado_por"),
    createdAt: tstz("created_at").defaultNow(),
    updatedAt: tstz("updated_at").defaultNow(),
  },
  (t) => ({
    uniqRutRol: unique().on(t.rut, t.rol),
  }),
);

export const asignaturas = pgTable("asignaturas", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  codigo: text("codigo").unique(),
  docenteId: uuid("docente_id").references(() => usuarios.id),
  fechaInicio: date("fecha_inicio").notNull(),
  duracionMeses: integer("duracion_meses").notNull(),
  estado: estadoAsigEnum("estado").default("borrador"),
  maxAlumnos: integer("max_alumnos").default(30),
  createdBy: uuid("created_by").references(() => usuarios.id),
  createdAt: tstz("created_at").defaultNow(),
  updatedAt: tstz("updated_at").defaultNow(),
});

export const matriculas = pgTable(
  "matriculas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    alumnoId: uuid("alumno_id").notNull().references(() => usuarios.id),
    asignaturaId: uuid("asignatura_id")
      .notNull()
      .references(() => asignaturas.id),
    montoArancel: numeric("monto_arancel", { precision: 10, scale: 2 }),
    estadoPago: estadoPagoEnum("estado_pago").default("pendiente"),
    fechaPago: date("fecha_pago"),
    activa: boolean("activa").default(true),
    eliminadoAt: tstz("eliminado_at"),
    eliminadoPor: uuid("eliminado_por"),
    createdAt: tstz("created_at").defaultNow(),
  },
  (t) => ({
    uniq: unique().on(t.alumnoId, t.asignaturaId),
    activoIdx: index("matriculas_activas_idx")
      .on(t.asignaturaId)
      .where(sql`${t.eliminadoAt} IS NULL`),
  }),
);

export const clases = pgTable(
  "clases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    asignaturaId: uuid("asignatura_id")
      .notNull()
      .references(() => asignaturas.id),
    titulo: text("titulo").notNull(),
    descripcion: text("descripcion"),
    numeroSesion: integer("numero_sesion").notNull(),
    fecha: date("fecha").notNull(),
    horaInicio: time("hora_inicio"),
    urlGrabacion: text("url_grabacion"),
    tipoUrl: tipoVideoEnum("tipo_url"),
    publicada: boolean("publicada").default(false),
    eliminadoAt: tstz("eliminado_at"),
    eliminadoPor: uuid("eliminado_por"),
    createdAt: tstz("created_at").defaultNow(),
  },
  (t) => ({
    uniq: unique().on(t.asignaturaId, t.numeroSesion),
    activoIdx: index("clases_activas_idx")
      .on(t.asignaturaId)
      .where(sql`${t.eliminadoAt} IS NULL AND ${t.publicada} = true`),
  }),
);

export const material = pgTable(
  "material",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    claseId: uuid("clase_id").notNull().references(() => clases.id),
    nombre: text("nombre").notNull(),
    storagePath: text("storage_path").notNull(),
    hashMd5: text("hash_md5").notNull(),
    tamanioBytes: integer("tamanio_bytes"),
    subidoPor: uuid("subido_por").references(() => usuarios.id),
    eliminadoAt: tstz("eliminado_at"),
    eliminadoPor: uuid("eliminado_por"),
    createdAt: tstz("created_at").defaultNow(),
  },
  (t) => ({
    storagePathIdx: index("material_storage_path_idx").on(t.storagePath),
    activoIdx: index("material_activo_idx")
      .on(t.claseId)
      .where(sql`${t.eliminadoAt} IS NULL`),
    hashIdx: index("material_hash_idx").on(t.hashMd5),
  }),
);

export const asistencia = pgTable(
  "asistencia",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    claseId: uuid("clase_id").notNull().references(() => clases.id),
    matriculaId: uuid("matricula_id").notNull().references(() => matriculas.id),
    estado: estadoAsistEnum("estado").default("ausente"),
    observacion: text("observacion"),
    registradoPor: uuid("registrado_por").references(() => usuarios.id),
    fechaRegistro: tstz("fecha_registro").defaultNow(),
  },
  (t) => ({
    uniq: unique().on(t.claseId, t.matriculaId),
  }),
);

export const evaluaciones = pgTable(
  "evaluaciones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    asignaturaId: uuid("asignatura_id")
      .notNull()
      .references(() => asignaturas.id),
    titulo: text("titulo").notNull(),
    tipo: tipoEvalEnum("tipo").notNull(),
    ponderacion: numeric("ponderacion", { precision: 5, scale: 2 }),
    fechaInicio: tstz("fecha_inicio"),
    fechaLimite: tstz("fecha_limite"),
    intentosMax: integer("intentos_max").default(1),
    instrucciones: text("instrucciones"),
    publicada: boolean("publicada").default(false),
    // --- Unified survey fields ---
    esEncuesta: boolean("es_encuesta").default(false),
    audiencia: audienciaEncuestaEnum("audiencia"),
    obligatoria: boolean("obligatoria").default(false),
    estadoEncuesta: estadoEncuestaEnum("estado_encuesta").default("borrador"),
    plantillaOrigen: text("plantilla_origen"), // e.g. "docente_otec", "estilos_aprendizaje"
    creadoPor: uuid("creado_por").references(() => usuarios.id),
    // ---
    eliminadoAt: tstz("eliminado_at"),
    eliminadoPor: uuid("eliminado_por"),
    createdAt: tstz("created_at").defaultNow(),
  },
  (t) => ({
    activoIdx: index("evaluaciones_activas_idx")
      .on(t.asignaturaId)
      .where(sql`${t.eliminadoAt} IS NULL AND ${t.publicada} = true`),
    encuestaActivaIdx: index("evaluaciones_encuesta_activa_idx")
      .on(t.asignaturaId)
      .where(sql`${t.esEncuesta} = true AND ${t.eliminadoAt} IS NULL`),
  }),
);

export const preguntas = pgTable(
  "preguntas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    evaluacionId: uuid("evaluacion_id")
      .notNull()
      .references(() => evaluaciones.id),
    enunciado: text("enunciado").notNull(),
    tipo: tipoPregEnum("tipo").notNull(),
    opciones: jsonb("opciones"),
    puntaje: numeric("puntaje", { precision: 5, scale: 2 }).default("1"),
    orden: integer("orden"),
    eliminadoAt: tstz("eliminado_at"),
    eliminadoPor: uuid("eliminado_por"),
  },
  (t) => ({
    activoIdx: index("preguntas_activas_idx")
      .on(t.evaluacionId)
      .where(sql`${t.eliminadoAt} IS NULL`),
  }),
);

export const respuestasFormulario = pgTable("respuestas_formulario", {
  id: uuid("id").primaryKey().defaultRandom(),
  evaluacionId: uuid("evaluacion_id")
    .notNull()
    .references(() => evaluaciones.id),
  matriculaId: uuid("matricula_id").notNull().references(() => matriculas.id),
  preguntaId: uuid("pregunta_id").notNull().references(() => preguntas.id),
  respuesta: text("respuesta"),
  esCorrecta: boolean("es_correcta"),
  intento: integer("intento").default(1),
  createdAt: tstz("created_at").defaultNow(),
});

// --- Asignaciones de encuesta: quién debe responder y si ya lo hizo ---
export const encuestaAsignaciones = pgTable(
  "encuesta_asignaciones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    evaluacionId: uuid("evaluacion_id")
      .notNull()
      .references(() => evaluaciones.id),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuarios.id),
    completada: boolean("completada").default(false),
    completadaAt: tstz("completada_at"),
    createdAt: tstz("created_at").defaultNow(),
  },
  (t) => ({
    uniq: unique().on(t.evaluacionId, t.usuarioId),
    pendienteIdx: index("encuesta_asig_pendiente_idx")
      .on(t.usuarioId)
      .where(sql`${t.completada} = false`),
  }),
);

export const notas = pgTable(
  "notas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    evaluacionId: uuid("evaluacion_id")
      .notNull()
      .references(() => evaluaciones.id),
    matriculaId: uuid("matricula_id").notNull().references(() => matriculas.id),
    nota: numeric("nota", { precision: 3, scale: 1 }),
    observacion: text("observacion"),
    entregaUrl: text("entrega_url"),
    calificadoPor: uuid("calificado_por").references(() => usuarios.id),
    fechaNota: tstz("fecha_nota").defaultNow(),
    eliminadoAt: tstz("eliminado_at"),
    eliminadoPor: uuid("eliminado_por"),
  },
  (t) => ({
    uniq: unique().on(t.evaluacionId, t.matriculaId),
    activoIdx: index("notas_activas_idx")
      .on(t.matriculaId)
      .where(sql`${t.eliminadoAt} IS NULL`),
  }),
);

export const certificados = pgTable("certificados", {
  id: uuid("id").primaryKey().defaultRandom(),
  codigoUnico: text("codigo_unico").unique().notNull(),
  matriculaId: uuid("matricula_id").notNull().references(() => matriculas.id),
  tipo: tipoCertEnum("tipo").notNull(),
  datosSnapshot: jsonb("datos_snapshot").notNull(),
  urlPublica: text("url_publica"),
  qrPayload: text("qr_payload"),
  generadoPor: uuid("generado_por").references(() => usuarios.id),
  fechaEmision: tstz("fecha_emision").defaultNow(),
  valido: boolean("valido").default(true),
});

export const solicitudesDocumentos = pgTable(
  "solicitudes_documentos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    alumnoId: uuid("alumno_id").notNull().references(() => usuarios.id),
    tipo: tipoSolicitudDocEnum("tipo").notNull(),
    estado: estadoSolicitudDocEnum("estado").default("pendiente").notNull(),
    observacion: text("observacion"),
    resueltoPor: uuid("resuelto_por").references(() => usuarios.id),
    resueltoAt: tstz("resuelto_at"),
    createdAt: tstz("created_at").defaultNow(),
    updatedAt: tstz("updated_at").defaultNow(),
  },
  (t) => ({
    alumnoFechaIdx: index("solicitudes_doc_alumno_fecha_idx").on(
      t.alumnoId,
      t.createdAt,
    ),
  }),
);

export const notasDocente = pgTable(
  "notas_docente",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    docenteId: uuid("docente_id").notNull().references(() => usuarios.id),
    asignaturaId: uuid("asignatura_id").notNull().references(() => asignaturas.id),
    matriculaId: uuid("matricula_id").notNull().references(() => matriculas.id),
    nota: numeric("nota", { precision: 3, scale: 1 }).notNull(),
    fechaRegistro: date("fecha_registro").notNull(),
    anioRegistro: integer("anio_registro").notNull(),
    createdAt: tstz("created_at").defaultNow(),
    updatedAt: tstz("updated_at").defaultNow(),
  },
  (t) => ({
    alumnoFechaIdx: index("notas_docente_alumno_fecha_idx").on(
      t.matriculaId,
      t.fechaRegistro,
    ),
  }),
);

export const observacionesDocente = pgTable(
  "observaciones_docente",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    docenteId: uuid("docente_id").notNull().references(() => usuarios.id),
    asignaturaId: uuid("asignatura_id").notNull().references(() => asignaturas.id),
    matriculaId: uuid("matricula_id").notNull().references(() => matriculas.id),
    observacion: text("observacion").notNull(),
    fechaRegistro: date("fecha_registro").notNull(),
    anioRegistro: integer("anio_registro").notNull(),
    createdAt: tstz("created_at").defaultNow(),
  },
  (t) => ({
    alumnoFechaIdx: index("obs_docente_alumno_fecha_idx").on(
      t.matriculaId,
      t.fechaRegistro,
    ),
  }),
);

export const finanzas = pgTable(
  "finanzas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tipo: tipoFinEnum("tipo").notNull(),
    monto: numeric("monto", { precision: 12, scale: 2 }).notNull(),
    descripcion: text("descripcion").notNull(),
    categoria: text("categoria"),
    asignaturaId: uuid("asignatura_id").references(() => asignaturas.id),
    fecha: date("fecha").notNull(),
    comprobanteUrl: text("comprobante_url"),
    createdBy: uuid("created_by").references(() => usuarios.id),
    eliminadoAt: tstz("eliminado_at"),
    eliminadoPor: uuid("eliminado_por"),
    createdAt: tstz("created_at").defaultNow(),
  },
  (t) => ({
    activoIdx: index("finanzas_activas_idx")
      .on(t.fecha)
      .where(sql`${t.eliminadoAt} IS NULL`),
  }),
);

// --- Encuesta de evaluación docente/OTEC ---
// Cada alumno puede completar UNA encuesta por asignatura (una vez finalizado el periodo).
// Admin puede habilitar/deshabilitar por asignatura.
export const encuestasDocente = pgTable(
  "encuestas_docente",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    asignaturaId: uuid("asignatura_id").notNull().references(() => asignaturas.id),
    alumnoId: uuid("alumno_id").notNull().references(() => usuarios.id),
    // Respuestas como JSONB: { d1..d6: 1-7, o1..o6: 1-7 }
    respuestas: jsonb("respuestas").notNull(),
    // Promedios calculados al guardar
    promedioDocente: numeric("promedio_docente", { precision: 3, scale: 1 }),
    promedioOtec: numeric("promedio_otec", { precision: 3, scale: 1 }),
    createdAt: tstz("created_at").defaultNow(),
  },
  (t) => ({
    // Un alumno solo puede responder una vez por asignatura
    uniq: unique().on(t.asignaturaId, t.alumnoId),
    asigIdx: index("encuesta_docente_asig_idx").on(t.asignaturaId),
  }),
);

// Config de encuesta por asignatura (habilitada o no)
export const encuestaDocenteConfig = pgTable("encuesta_docente_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  asignaturaId: uuid("asignatura_id").notNull().unique().references(() => asignaturas.id),
  habilitada: boolean("habilitada").default(false),
  updatedAt: tstz("updated_at").defaultNow(),
});

// --- Test de Estilos de Aprendizaje ---
// Máximo 2 intentos por alumno.
export const testEstilos = pgTable(
  "test_estilos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    alumnoId: uuid("alumno_id").notNull().references(() => usuarios.id),
    intento: integer("intento").notNull().default(1), // 1 o 2
    // Respuestas como JSONB: { v1..v5, a1..a5, k1..k5 }
    respuestas: jsonb("respuestas").notNull(),
    // Puntajes calculados por estilo
    puntajeVisual: numeric("puntaje_visual", { precision: 4, scale: 1 }),
    puntajeAuditivo: numeric("puntaje_auditivo", { precision: 4, scale: 1 }),
    puntajeKinestesico: numeric("puntaje_kinestesico", { precision: 4, scale: 1 }),
    estiloPreferente: text("estilo_preferente"), // "visual" | "auditivo" | "kinestesico"
    createdAt: tstz("created_at").defaultNow(),
  },
  (t) => ({
    alumnoIdx: index("test_estilos_alumno_idx").on(t.alumnoId),
    uniq: unique().on(t.alumnoId, t.intento),
  }),
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id"),
    userRol: rolEnum("user_rol"),
    accion: auditAccionEnum("accion").notNull(),
    entidad: text("entidad"),
    entidadId: uuid("entidad_id"),
    payload: jsonb("payload"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    exitoso: boolean("exitoso").default(true),
    createdAt: tstz("created_at").defaultNow(),
  },
  (t) => ({
    userIdx: index("audit_user_idx").on(t.userId),
    accionIdx: index("audit_accion_idx").on(t.accion),
    fechaIdx: index("audit_fecha_idx").on(t.createdAt),
  }),
);

// --- QR tokens para registro de asistencia ---
// El docente genera un token por clase (válido 30 min).
// El alumno escanea el QR → visita la URL → se registra automáticamente.
export const qrAsistenciaTokens = pgTable(
  "qr_asistencia_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    claseId: uuid("clase_id").notNull().references(() => clases.id),
    token: text("token").notNull().unique(),
    createdBy: uuid("created_by").notNull().references(() => usuarios.id),
    expiresAt: tstz("expires_at").notNull(),
    createdAt: tstz("created_at").defaultNow(),
  },
  (t) => ({
    tokenIdx: index("qr_asistencia_token_idx").on(t.token),
    claseIdx: index("qr_asistencia_clase_idx").on(t.claseId),
  }),
);

// --- Mensajería interna por asignatura ---
// Canal de comunicación docente ↔ alumno dentro de cada asignatura.
export const mensajes = pgTable(
  "mensajes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    asignaturaId: uuid("asignatura_id").notNull().references(() => asignaturas.id),
    emisorId: uuid("emisor_id").notNull().references(() => usuarios.id),
    contenido: text("contenido").notNull(),
    creadoAt: tstz("creado_at").defaultNow(),
    eliminadoAt: tstz("eliminado_at"),
  },
  (t) => ({
    asignaturaIdx: index("mensajes_asignatura_idx").on(t.asignaturaId),
    creadoAtIdx: index("mensajes_creado_at_idx").on(t.creadoAt),
  }),
);

export const rateLimitLog = pgTable(
  "rate_limit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ip: text("ip").notNull(),
    endpoint: text("endpoint").notNull(),
    intentos: integer("intentos").default(1),
    bloqueadoAt: tstz("bloqueado_at"),
    ventanaAt: tstz("ventana_at").defaultNow(),
  },
  (t) => ({
    ipEndpointIdx: index("rate_limit_ip_endpoint_idx").on(t.ip, t.endpoint),
    bloqueadoIdx: index("rate_limit_bloqueado_idx").on(t.bloqueadoAt),
  }),
);
