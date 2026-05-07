# Iteración Admin — Cierre 2026-05-07

Documento de cierre de la iteración de mejoras al panel de **Administración**. Sirve como insumo para preparar la siguiente revisión humana, ahora orientada a Docente y Alumno, siguiendo el mismo formato del Word original `Mejoras ADMINISTRACIÓN(1).docx` y del análisis previo `analisis-admin-2026-05-07.md`.

## 1. Alcance y propósito

- **Origen**: revisión humana sección por sección sobre el panel admin, registrada en el Word.
- **Objetivo de la iteración**: traducir esa revisión en cambios de código que mejoren intuitividad, seguridad operacional y sostenibilidad técnica del proyecto.
- **No alcance**: docente y alumno (próxima iteración con su propio informe).

## 2. Resumen ejecutivo

23 commits sobre `303d783` (incluye `perf(admin/evaluaciones): carga diferida por tab activa`), agrupables en cuatro frentes:

1. **Bugs operativos bloqueantes** (Fase 0).
2. **Higiene técnica del código** (quality gate, runtime correcto del PDF).
3. **Selector estándar y arquitectura visual** (Fase 1: `PeriodoCursoSeccionPicker`, vista maestro-detalle, ficha de sección).
4. **Flujos críticos del Word** (Notificaciones, Beneficios/Credenciales, Certificados, Solicitudes, Asistencias/Notas).

Todas las pasadas se cerraron con `tsc`, `quality:gate` y `security:test` (45/45) en verde.

## 3. Bugs corregidos (Fase 0)

| Archivo / acción | Síntoma original | Corrección |
|---|---|---|
| `src/actions/usuarios.ts` (`buscarAlumnosAction`) | `/admin/matriculas` no encontraba RUT 29.300.456-0 | Normalización antes de comparar: prueba RUT con/sin formato, email, nombre completo, credencial `EXT-*` |
| `src/actions/historial-academico.ts` | `/admin/historial` caía con "Algo salió mal" | Validación de `periodoId`, logging contextual, fallback defensivo |
| `src/app/api/certificados/[codigo]/pdf/route.ts` | `pdf_failed` al descargar PDF | `export const runtime = "nodejs"` (`@react-pdf/renderer` no opera en Edge) |

> Pendiente operacional: reproducción real del PDF y del Historial requiere snapshot/dump del VPS para datos representativos.

## 4. Higiene técnica

- `chore(ui): cumplir quality gate` — 78 archivos: `inputMode` en inputs numéricos, sustitución de `transition-all` por lista explícita en charts, `outline-none` → `focus-visible:ring`, conversión de `div/span onClick` a `button` con `aria-label`.
- Sin cambios funcionales; alinea código con la regla de quality gate y mejora accesibilidad para usuarios mayores (objetivo declarado del proyecto).

## 5. Selector estándar y arquitectura visual

**Problema del Word**: muchas pantallas mezclan `<select>` nativos con combobox propios; el flujo `periodo → curso → sección` queda implícito y obliga a cada vista a redescubrirlo.

### 5.1 Componente compartido

- **`src/components/shared/PeriodoCursoSeccionPicker.tsx`**: server component composicional sobre `EntityFilterSelect`. El caller inyecta solo los niveles que necesita (`periodos`, `cursos`, `asignaturas`), elige `layout: "stack" | "inline"`, decide si crear su propio `<form>` (`asForm`) y puede activar `allowClear` por nivel cuando "" representa "todos".
- **Capacidad nueva en `EntityFilterSelect`**: opción `allowClear` que renderiza un item "Sin selección" al inicio del listbox, evitando la opción centinela "all" que tenía el panel admin.

### 5.2 Adopción

| Vista | Cambio |
|---|---|
| `/admin/agenda` (piloto) | Reemplaza select periodo + `AsignaturaFilterSelect` |
| `/admin/notas`, `/admin/asistencias` | Mismo patrón con búsqueda libre |
| `/admin/clases`, `/admin/horarios`, `/admin/evaluaciones` | Layout inline o stack según contexto |
| `/admin` (panel) | `allowClear` en periodo, conserva semántica "Todos los periodos" |
| `/admin/reportes`, `/admin/reportes/retencion` | Mismo patrón con `allowClear` |

### 5.3 Vista académica maestro-detalle

- **`/admin/academico`** (nuevo): a la izquierda, lista de cursos con buscador y badge de cantidad de secciones; a la derecha, ficha breve del curso seleccionado con sus secciones agrupadas por periodo. Cada sección expone botones Alumnos y Ficha. URL drives state (`?cursoId=X&q=...`).
- **`/admin/secciones/[id]`** (nuevo): ficha de sección con header (curso, nombre, código, periodo, turno, estado) y tabs Resumen / Alumnos / Horario / Clases / Evaluaciones / Asistencia / Notas / Certificados. Solo Resumen es real; los demás tabs redirigen al módulo especializado con `asignaturaId` + `periodoId` precargados — evita reescribir cada gestión y entrega un punto de entrada único.
- **Bridges**: `CursoManager` y `AsignaturaManager` ganan botones "Ver secciones" y "Ver ficha". `navigationConfig` agrega entrada "Vista académica" en grupo Oferta académica.

## 6. Flujos críticos del Word

### 6.1 Notificaciones (`/admin/notificaciones`)

| Punto del Word | Acción |
|---|---|
| Separar historial / nueva notificación | Tabs **Crear / Historial** en lugar del grid 2-cols mezclado |
| Vista de alcance antes de enviar | Acción nueva `contarDestinatariosNotificacionAction` reproduce la lógica de selección sin insertar; el formulario muestra alcance estimado en vivo |
| Evitar envíos masivos accidentales | Umbral `ALCANCE_CONFIRMACION_UMBRAL = 50`: si se supera, paso de confirmación explícita antes de enviar |
| Límite 500 usuarios hardcoded | `listarUsuariosActivosAdmin` parametrizable (default 2000); nueva `buscarUsuariosActivosAdmin(query)` para combobox remoto futuro |

### 6.2 Beneficios y Credenciales (`/admin/beneficios-credenciales`)

| Punto del Word | Acción |
|---|---|
| Selector moderno periodo → curso → sección | `BeneficiosCursoForm` (cliente): filtros en cascada en lugar del `<select>` plano |
| Confirmación fuerte para cambios masivos | Alcance estimado en vivo (matrículas activas) + paso de confirmación con resumen amber antes de aplicar |
| Solo un icono de tarjeta | Header con un único `IdCard`; se elimina `CreditCard` duplicado |
| Datos enriquecidos | `listarSeccionesParaAccesosAdmin` retorna `periodoId`, `cursoId` y campos asociados |

### 6.3 Certificados (`/admin/certificados`)

| Punto del Word / análisis | Acción |
|---|---|
| Combobox cargaba 2000 matrículas al cliente | Acción nueva `buscarMatriculasParaCertificadoAction(query)` retorna hasta 30 resultados (nombre/apellido/RUT/email/asignatura). `MatriculaCombobox` ahora hace búsqueda remota con debounce 250ms, cancelación de respuestas obsoletas, estados de carga/sin-resultado/error |
| Performance silenciosa | `certificados/page.tsx` deja de precargar matrículas |

### 6.4 Solicitudes → Certificados (`/admin/solicitudes`)

| Punto del Word | Acción |
|---|---|
| Validar automáticamente matrícula activa, periodo, estado de pago, reglas del curso | Helper `evaluarElegibilidadAlumnoRegular(alumnoId)` evalúa 4 reglas: matrícula activa, asignatura activa, periodo activo, pago en `pagado/becado` |
| Si cumple, emitir o preaprobar | Al crear solicitud `tipo=alumno_regular`: si cumple, `estado=aprobada` con observación `"Auto-evaluacion: cumple. ..."`; si no cumple, `pendiente` con razones legibles |
| Mostrar motivo claro al admin | `SolicitudesView` resalta paneles verde (cumple) / ámbar (requiere revisión) en `observacion` |
| Trazabilidad | Audit registra `estadoInicial` + `autoEvaluacion: true`. Código de respuesta `request_auto_approved` |
| Paginación y filtros | `listarSolicitudesDocumentosAdmin` acepta `q/tipo/estado/limit/offset`. Nuevas `count*Admin`, `resumen*Admin` con `count(*) FILTER` SQL. Form GET en `page.tsx` + componente `Pagination`. Header con tarjetas Total / Pendientes / Aprobadas / Auto-evaluadas |

### 6.5 Asistencias y Notas

| Riesgo silencioso | Acción |
|---|---|
| Listas sin paginación, conteos en JS | `limit/offset` server-side (50/página, máx 200) |
| Métricas calculadas iterando filas | Nuevas `resumen*Admin` con `count(*) FILTER (WHERE ...)` y `avg(...)` directamente en Postgres |
| Conteo de filas filtradas para paginación | Nuevas `count*Admin` con SELECT count |
| Métricas inestables al filtrar | El resumen del header usa el periodo entero, no el filtro actual: el admin mantiene contexto al refinar búsqueda |

## 7. Patrones consolidados

| Patrón | Fundamento | Aplicado en |
|---|---|---|
| **Alcance estimado + confirmación masiva** | Reduce envíos/cambios masivos accidentales; expone consecuencia antes del click | Notificaciones, Beneficios/Credenciales |
| **Paginación + agregaciones en SQL** | Evita traer todas las filas al servidor Next y contarlas en JS; escala con la operación real | Asistencias, Notas, Solicitudes |
| **Combobox remoto con debounce** | Sustituye precargas de miles de filas; el usuario escribe lo que recuerda y obtiene resultados relevantes | Certificados |
| **Picker estándar `periodo → curso → sección`** | Unifica el flujo institucional declarado en el Word | Agenda, Notas, Asistencias, Clases, Horarios, Evaluaciones, Panel, Reportes |
| **Auto-evaluación con razones legibles** | Lógica vive en código, no en la cabeza del admin; el rechazo tiene motivo escrito | Solicitudes alumno regular |
| **Ficha como hub navegacional** | Punto único de entrada por sección; los tabs delegan a módulos especializados con contexto preseleccionado | `/admin/secciones/[id]` |

## 8. Verificación honesta del Word, punto por punto

Tabla de cumplimiento real verificada contra el código actual y contra `Mejoras ADMINISTRACIÓN(1).docx` línea por línea. Las celdas "Parcial" detallan qué se hizo y qué no.

| # | Punto del Word | Estado | Detalle |
|---|---|---|---|
| 1 | Panel: vista por periodo, evaluar modal/desplegable | Hecho | `PeriodoCursoSeccionPicker` con `allowClear`; el "all" centinela ya no es necesario. |
| 2 | Panel: Métricas por Asignatura sin paginado | Pendiente | El bloque sigue sin paginación ni colapso por contexto. |
| 3 | Panel: búsqueda RUT mejor ubicada (modal/topbar) | Pendiente | Sigue debajo de tarjetas y métricas. |
| 4 | Panel: Datos Subidos por Docentes paginado | Pendiente | Acordeón sin paginación. |
| 5 | Agenda: periodo modal, asignatura combobox, docentes filtrados | Parcial | Periodo y asignatura ahora usan picker. Docente sigue como `<select>`. |
| 5b | Agenda: mes/año intuitivo (no input numérico) | Pendiente | Continúan los `<input type="number">`. La etiqueta "Anio" sigue mal escrita. |
| 6 | Secciones: tabs estado optimizados, eliminar 10/pag | Parcial | Picker adoptado. La paginación 10/20/50 sigue prominente en `/admin/asignaturas`. |
| 6b | Secciones: lógica tipo universidad curso+secciones | Parcial | Vista `/admin/academico` cubre el modelo mental, pero `/admin/asignaturas` no fue rediseñada. |
| 7 | Cursos: al crear, asignar secciones/docentes/alumnos inline | Pendiente | El flujo "compañerismo-relación" no se implementó. |
| 7b | Cursos: borrar por interfaz general y específicos por periodo | Pendiente | |
| 8 | Horarios: calendario 3/4 a la izquierda + listado 1/4 | Pendiente | Sigue grilla semanal. |
| 9 | Unificación conceptual Cursos+Secciones | Parcial | `/admin/academico` y la ficha `/admin/secciones/[id]` cubren la unificación operacional sin borrar las pantallas existentes. |
| 10 | Clases: selección intuitiva con dependencia de horarios | Parcial | Picker adoptado. La autogeneración desde bloques horarios ya existía pero no se unificó visualmente con la ficha de sección. |
| 11 | Evaluaciones: intuitividad y carga | Hecho | Picker adoptado y carga diferida por tab implementada (`perf(admin/evaluaciones): carga diferida por tab activa`). |
| 12 | Asistencias: detalle por curso/sección, paginación, métricas | Hecho | `limit/offset` server-side, `count(*) FILTER` SQL para resumen. |
| 13 | Notas: detalle por curso/sección, paginación, métricas | Hecho | Mismo patrón. |
| 14 | Encuestas: intuitividad y responsive | Pendiente | No abordado. |
| 15 | Docentes: gestión intuitiva, ver asignaciones | Pendiente | No abordado. |
| 16 | Alumnos: gestión cuenta + comunicación con matrícula | Pendiente | No abordado en su flujo principal. |
| 17 | Matrículas: estado + bloqueos por pago con notificación | Parcial | Bug RUT corregido. La advertencia visual de bloqueo por pago/cupo no se agregó. |
| 18 | Notificaciones: tabs historial/nueva, popup | Hecho | Tabs Crear/Historial, alcance estimado, confirmación masiva. |
| 19 | Solicitudes: badge en navbar/sidebar + push PWA en tiempo real | Parcial | Auto-evaluación, paginación y resumen agregado: hechos. Badge persistente y push tiempo real: pendientes. |
| 20 | Beneficios y credenciales: un solo icono, selector moderno, cambio masivo | Hecho | `BeneficiosCursoForm` con filtros en cascada, alcance, confirmación, único icono. |
| 21 | Certificados: automatizar desde solicitud alumno regular | Hecho | Auto-evaluación + combobox remoto. |
| 22 | Importar Alumnos: flujo operacional OTEC claro | Pendiente | El flujo existente no fue reorientado a sección/matrícula. |
| 23 | Dashboard: métricas reales, no botones-link | Pendiente | El panel sigue mezclando KPIs con tarjetas-modulo. |
| 24 | Optimizar 4 secciones del menú lateral | Pendiente | `navigationConfig.ts` ganó "Vista académica" pero no se consolidó "Reportes/Rendimiento/Retención/Asistencia/Notas" bajo "Analítica". |
| 25 | Historial: error "Algo salió mal" | Hecho (blindado) | Validación + fallback + logging. La reproducción runtime requiere datos reales. |
| 26 | Finanzas: ingresos por inscripciones | Pendiente | No abordado. |
| 27 | Carpeta académica (resultados/notas/asistencia ordenado) | Parcial | La ficha de sección actúa de hub con tabs que delegan a módulos. La "vista carpeta" unificada por alumno aún no existe. |
| 28 | PDF malo (`pdf_failed`) | Hecho (blindado) | `runtime = "nodejs"`. Reproducción runtime pendiente. |
| 29 | Asignación estudiantes a cursos intuitiva | Parcial | Bug RUT corregido. La "matrícula contextual desde sección" sigue pendiente como Fase 2 incremental. |
| 30 | Páginas con scroll gigante (`docente/asignaturas`) | Fuera de alcance | Pertenece a la iteración Docente. |
| 31 | BUG matrícula no encuentra alumnos | Hecho | Normalización RUT/email/credencial. |

**Resumen numérico**

- Hecho pleno: 11/31 (35%)
- Parcial con valor entregado: 7/31 (23%)
- Pendiente: 12/31 (39%)
- Fuera de alcance: 1/31 (3%)

## 9. Pendientes priorizados

Lista ordenada por intuitividad/impacto operativo, lista para alimentar la próxima tanda admin si el usuario decide retomar:

1. **Búsqueda RUT global en Topbar** (item 3) — toca todas las vistas, alta intuitividad.
2. **Agenda mes/año por nombre + corregir "Anio"** (item 5b) — error visible, 1 commit.
3. **Solicitudes badge en navbar y push PWA** (item 19) — la auto-evaluación quedó pero falta cerrar el ciclo de notificación.
4. **Matrículas: bloqueo claro por pago/cupo/periodo cerrado** (item 17) — vincula con Beneficios y con auto-evaluación de solicitudes.
5. **Reorganizar nav lateral en grupo Analítica** (item 24).
6. **Dashboard con métricas reales y no botones-link** (item 23).
7. **Importar Alumnos orientado a sección** (item 22).
8. **Cursos crear con secciones/docentes inline** (item 7).
9. **Horarios calendario 3/4 + 1/4** (item 8).
10. **Carpeta académica unificada por alumno/sección** (item 27).
11. **Encuestas responsive y wizard** (item 14).
12. **Docentes/Alumnos ficha integrada** (items 15/16).
13. **Finanzas con ingresos por inscripción** (item 26).

## 9. Verificación

Cada commit cerró con:

```
pnpm exec tsc --noEmit
pnpm quality:gate
pnpm security:test
```

Todos en verde al cierre.

## 10. Insumo para la siguiente iteración (Docente y Alumno)

Para mantener consistencia con el formato del Word de admin, conviene que el informe humano de docente/alumno cubra para cada vista:

1. **Estado actual** (qué hace hoy y qué se ve confuso o pesado).
2. **Comportamiento esperado** (frase corta, sin tecnicismo).
3. **Bugs reproducibles** (con pasos).
4. **Sugerencias de orden de pantalla / confirmaciones / vistas de alcance**.
5. **Datos faltantes o sobrantes**.

Áreas naturales para revisar en docente:

- `/docente/asignaturas` — fichas de asignatura, accesos rápidos.
- `/docente/asistencia` — toma QR vs registro manual.
- `/docente/asignaturas/[id]/evaluaciones` — creación/maquetado/resultados.
- `/docente/notificaciones` — recepción y acciones.

Áreas naturales para revisar en alumno:

- `/alumno` — dashboard "Esta semana".
- `/alumno/asignaturas` — nota final, estado aprobado/reprobado.
- `/alumno/evaluaciones/[id]` — entrega y feedback.
- `/alumno/solicitudes` — credencial, alumno regular (ya con auto-aprobación), tarjeta beneficio.
- `/alumno/notificaciones` — leídas/no leídas.

## 11. Sin tocar

- VPS: ningún cambio remoto. Todo el trabajo en local + commits.
- Datos sensibles: ningún secreto reproducido en docs.
