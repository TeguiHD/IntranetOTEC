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

Tabla actualizada tras la segunda tanda de commits del 2026-05-07. Ya no refleja el cierre inicial de Claude: ahora cruza el Word con el código local actual, incluyendo búsqueda global, dashboard operativo, push de solicitudes, navegación Analítica, finanzas por matrícula, encuestas builder, carpeta de sección y la corrección de selección explícita en Matrículas/Horarios/Clases/Evaluaciones.

Nota de lectura: el Word original mezcla algunos puntos principales con subpuntos (`5b`, `6b`, `7b`). Por eso esta tabla usa **filas de control** y no fuerza porcentajes sobre 31 exactos.

| # | Punto del Word | Estado | Detalle |
|---|---|---|---|
| 1 | Panel: vista por periodo, evaluar modal/desplegable | Hecho | `PeriodoCursoSeccionPicker` con `allowClear`; el "all" centinela ya no es necesario. |
| 2 | Panel: Métricas por Asignatura sin paginado | Hecho | Se retiró del panel. El dashboard quedó como centro operativo; el detalle vive en Analítica/vistas de sección. |
| 3 | Panel: búsqueda RUT mejor ubicada (modal/topbar) | Hecho | `AdminRutLookup` está en Topbar admin, abre con botón y Cmd/Ctrl+K, busca por RUT/nombre/correo y lista alumnos/docentes. |
| 4 | Panel: Datos Subidos por Docentes paginado | Parcial | Se retiró del panel para bajar ruido visual. Falta crear una vista analítica dedicada si se quiere conservar ese histórico como reporte. |
| 5 | Agenda: periodo modal, asignatura combobox, docentes filtrados | Hecho | Periodo/sección usan picker; docente se filtra desde secciones disponibles. Sigue siendo `<select>`, pero ya no muestra docentes fuera de contexto. |
| 5b | Agenda: mes/año intuitivo (no input numérico) | Hecho | Mes y año pasaron a `select`; la etiqueta quedó como "Año". |
| 6 | Secciones: tabs estado optimizados, eliminar 10/pag | Parcial | Tabs por estado y resumen operativo mejorados. El selector de tamaño sigue existiendo, aunque menos dominante. |
| 6b | Secciones: lógica tipo universidad curso+secciones | Hecho | `/admin/academico` y `/admin/secciones/[id]` ordenan curso -> secciones por periodo sin eliminar las pantallas especializadas. |
| 7 | Cursos: al crear, asignar secciones/docentes/alumnos inline | Parcial | `CursoManager` permite crear primera sección opcional con periodo/turno/fechas/docente/cupo. Falta alta inline de alumnos en el mismo flujo. |
| 7b | Cursos: borrar por interfaz general y específicos por periodo | Pendiente | Hay acciones de archivar/eliminar en secciones, pero no se rediseñó una política completa curso-base vs sección-periodo. |
| 8 | Horarios: calendario 3/4 a la izquierda + listado 1/4 | Hecho | `/admin/horarios` usa `WeeklyScheduleGrid` en columna 3/4 y resumen/listado 1/4; ya exige sección explícita. |
| 9 | Unificación conceptual Cursos+Secciones | Hecho | `/admin/academico` + ficha de sección actúan como hub operacional. |
| 10 | Clases: selección intuitiva con dependencia de horarios | Hecho | Muestra dependencia de bloques, autogenera desde horario, enlaza a Horarios y ya no toma la primera sección por defecto. |
| 11 | Evaluaciones: intuitividad y carga | Hecho | Picker, carga diferida por tab y selección explícita de sección para evitar operar sobre la primera sección del periodo. |
| 12 | Asistencias: detalle por curso/sección, paginación, métricas | Hecho | `limit/offset` server-side, `count(*) FILTER` SQL para resumen. |
| 13 | Notas: detalle por curso/sección, paginación, métricas | Hecho | Mismo patrón. |
| 14 | Encuestas: intuitividad y responsive | Parcial | La ruta principal del menú usa `/admin/encuestas-builder` con wizard responsive. La ruta legacy `/admin/encuestas` aún existe para análisis de encuesta docente. |
| 15 | Docentes: gestión intuitiva, ver asignaciones | Parcial | Listado muestra ficha resumida con cantidad de secciones y estado. Falta vista de detalle por docente con secciones/clases/evaluaciones/material. |
| 16 | Alumnos: gestión cuenta + comunicación con matrícula | Parcial | Listado muestra matrículas/certificados y acciones de cuenta. Falta ficha profunda por alumno con historial completo navegable. |
| 17 | Matrículas: estado + bloqueos por pago con notificación | Hecho | No autoselecciona sección; muestra bloqueos por cupo/periodo/sección y advertencia por mora/pendientes del alumno antes de guardar. |
| 18 | Notificaciones: tabs historial/nueva, popup | Hecho | Tabs Crear/Historial, alcance estimado, confirmación masiva. |
| 19 | Solicitudes: badge en navbar/sidebar + push PWA en tiempo real | Hecho | Sidebar/Topbar muestran badge con `countSolicitudesPendientesAdmin`; nuevas solicitudes disparan push PWA a admins suscritos. |
| 20 | Beneficios y credenciales: un solo icono, selector moderno, cambio masivo | Parcial | Cambio masivo por curso tiene cascada periodo/curso/sección, alcance y confirmación. El filtro de control por persona aún usa un selector plano de sección. |
| 21 | Certificados: automatizar desde solicitud alumno regular | Hecho | Auto-evaluación + combobox remoto. |
| 22 | Importar Alumnos: flujo operacional OTEC claro | Hecho | El flujo se orientó a sección/matrícula y validación OTEC, en vez de una carga plana de usuarios. |
| 23 | Dashboard: métricas reales, no botones-link | Hecho | El panel dejó de ser grilla de módulos; ahora muestra KPIs accionables: solicitudes, clases hoy, mora, pagos, secciones, certificados y envíos. |
| 24 | Optimizar 4 secciones del menú lateral | Hecho | Subreportes se consolidaron bajo Analítica; las URLs siguen accesibles desde `/admin/reportes`. |
| 25 | Historial: error "Algo salió mal" | Hecho (blindado) | Validación + fallback + logging. La reproducción runtime requiere datos reales. |
| 26 | Finanzas: ingresos por inscripciones | Hecho | Finanzas incluye resumen de ingresos por matrícula/arancel, pagado, pendiente, mora y becado. |
| 27 | Carpeta académica (resultados/notas/asistencia ordenado) | Parcial | La ficha de sección actúa de hub con tabs que delegan a módulos. La "vista carpeta" unificada por alumno aún no existe. |
| 28 | PDF malo (`pdf_failed`) | Hecho (blindado) | `runtime = "nodejs"`. Reproducción runtime pendiente. |
| 29 | Asignación estudiantes a cursos intuitiva | Hecho | Bug RUT corregido, búsqueda normalizada y matrícula ya se abre con sección explícita desde fichas/rutas relacionadas. |
| 30 | Páginas con scroll gigante (`docente/asignaturas`) | Fuera de alcance | Pertenece a la iteración Docente. |
| 31 | BUG matrícula no encuentra alumnos | Hecho | Normalización RUT/email/credencial. |

**Resumen numérico**

- Hecho pleno: 23 filas de control.
- Parcial con valor entregado: 8 filas de control.
- Pendiente real de producto: 1 fila de control (`7b`) + reproducción con datos reales para PDF/Historial.
- Fuera de alcance: 1 fila de control.

## 9. Pendientes priorizados

Lista honesta después de esta segunda tanda. Ya no quedan los pendientes visibles que Claude enumeró como primera prioridad, pero sí quedan mejoras estructurales si se quiere cerrar Admin con estándar alto:

1. **Ficha profunda de alumno y docente**: hoy hay resumen en tabla; falta página/modal de detalle con relaciones académicas completas.
2. **Beneficios/Credenciales**: reemplazar el selector plano del filtro por persona por la misma cascada periodo → curso → sección.
3. **Curso base vs secciones por periodo**: definir política completa de eliminar/archivar curso base y secciones específicas.
4. **Carpeta académica por alumno**: la ficha de sección existe; falta la vista transversal por alumno.
5. **Ruta legacy `/admin/encuestas`**: decidir si se migra a builder, se deja como reporte histórico o se redirige.
6. **PDF/Historial con datos reales**: el código quedó blindado, pero falta reproducir con snapshot/dump representativo.

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
