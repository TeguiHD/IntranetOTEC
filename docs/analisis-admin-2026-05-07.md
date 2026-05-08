# Análisis de mejoras Admin - 2026-05-07

Fuente primaria: `Mejoras ADMINISTRACIÓN(1).docx`, revisión humana sección por sección del Admin.

Fuente secundaria: `6Mayo2026.txt`, usado solo como contexto de criterio general porque mezcla brainstorming IA, alcance amplio y datos sensibles. No se reproducen secretos ni credenciales.

## Lectura ejecutiva

La revisión no pide "más secciones"; pide ordenar la operación administrativa alrededor de entidades reales de una OTEC: periodo académico -> curso base -> sección/asignatura -> docente -> alumnos/matrículas -> clases/evaluaciones/asistencia/notas/certificados.

El problema principal no es visual aislado. Es de arquitectura de flujo: muchas páginas resuelven partes de la misma relación, pero obligan al administrador a saltar entre módulos, buscar manualmente, repetir filtros y entender distinciones internas como curso/sección/asignatura. El resultado es carga cognitiva alta cuando haya muchos alumnos, docentes, cursos y periodos.

Prioridad recomendada: primero corregir bugs operativos, luego rediseñar el flujo "Cursos/Secciones/Matrículas", y recién después optimizar reportes, dashboard y visuales finos.

## Bugs priorizados

### P0/P1 - Matrícula no encuentra alumnos

Síntoma reportado: en `/admin/matriculas`, el combobox de alumno no encuentra el RUT `29.300.456-0`.

Hallazgo técnico: el input envia el texto tal como se escribió y `buscarAlumnosAction` hace `ilike` literal contra `usuarios.rut`. Si el RUT en BD está guardado normalizado como `293004560`, buscar con puntos y guion no matchea. También busca solo nombre, apellido y rut; no correo ni credencial normalizada alternativa.

Archivos:

- `src/app/(roles)/admin/matriculas/AlumnoCombobox.tsx`: debounce y búsqueda desde el texto visible.
- `src/actions/usuarios.ts`: `buscarAlumnosAction` usa `term = %query%` y `ilike(usuarios.rut, term)`.

Acción recomendada:

1. Normalizar el query de RUT/credencial en backend, no solo en UI.
2. Buscar por variantes: texto original, texto sin puntos/guion, RUT formateado y credenciales `EXT-*`.
3. Mostrar estado del alumno y si ya está matriculado en la sección seleccionada.
4. Recibir `asignaturaId` en la búsqueda para entregar resultados contextuales: disponible, ya matriculado, inactivo, retirado, suspendido, etc.

### P1 - Certificados PDF retorna `pdf_failed`

Síntoma reportado: `/admin/certificados` falla al descargar PDF con error `pdf_failed`.

Hallazgo técnico: la ruta atrapa cualquier excepción y responde solo `{ error: "pdf_failed" }`, aunque registra `reason` internamente. La generación depende de `@react-pdf/renderer` y de datos de certificado/matrícula/alumno. TypeScript pasa, así que falta reproducir runtime con un certificado real o seed.

Archivos:

- `src/app/api/certificados/[codigo]/pdf/route.ts`: catch genérico en líneas finales y joins del certificado.
- `src/lib/certificatePdf.tsx`: render con `renderToBuffer`.

Acción recomendada:

1. Reproducir con un código real local/staging y revisar el `reason` logueado.
2. Agregar prueba de integración que emita un certificado y llame la ruta PDF.
3. Mejorar respuesta de admin: mantener mensaje seguro para usuario, pero mostrar correlación/diagnóstico interno.
4. Validar que certificados creados antes de cambios de schema tengan snapshot compatible.

### P1 - Historial Admin arroja error inesperado

Síntoma reportado: `/admin/historial` muestra "Algo salió mal".

Hallazgo técnico: la página depende de `obtenerHistorialAcademicoAdmin`, que arma subconsultas agregadas sobre evaluaciones, respuestas, notas, preguntas y eventos de supervisión. TypeScript pasa, por lo que el riesgo está en SQL/runtime, datos legacy, `searchParams` o una incompatibilidad de agregados/joins en PostgreSQL real.

Archivos:

- `src/app/(roles)/admin/historial/page.tsx`
- `src/actions/historial-academico.ts`

Acción recomendada:

1. Reproducir local con datos reales o snapshot.
2. Separar la consulta en pasos defensivos: filtros, base rows, agregados.
3. Agregar error boundary con correlación y fallback vacío útil.
4. Convertir Historial en "vista carpeta" por curso/sección, no solo tabla de evaluaciones.

## Mejoras por dominio

### 1. Navegación Admin

La navegación lateral tiene demasiados destinos de primer nivel. En `navigationConfig.ts`, Admin mezcla operación diaria, registros, soporte, reportes y sistema. Además el Panel duplica accesos con `MODULE_CARDS`, generando dos mapas mentales distintos.

Propuesta:

- Consolidar "Reportes", "Rendimiento", "Retención", "Asistencia" y "Notas" bajo un único módulo de Analítica.
- Consolidar "Cursos" y "Secciones" como un módulo académico con vista maestro-detalle.
- Mantener Admin simple: Inicio, Académico, Personas, Operación, Comunicación, Analítica, Sistema.
- Usar badges contextuales para solicitudes/notificaciones/certificados pendientes.

### 2. Cursos, Secciones y Matrículas

Este es el núcleo del rediseño. El Word identifica que "Curso" y "Sección" están relacionados y hoy el flujo no acompaña esa relación.

Propuesta:

- Curso = plantilla/base: nombre, código, horas, descripción, precio base.
- Sección = instancia impartida: periodo, turno, docente, sala/bloques, cupos, precio de inscripción, estado.
- Matrícula = relación alumno-sección con estado de pago y estado académico.

Interfaz recomendada:

- Vista de curso con árbol de secciones: "Podología Clínica" -> secciones por periodo/horario/docente.
- Desde una sección permitir: asignar docente, gestionar alumnos, crear clases, ver asistencia, ver evaluaciones, notas y certificados.
- Matricular alumnos desde contexto de sección, no desde una pantalla aislada que pide primero entender `asignaturaId`.

### 3. Filtros y búsqueda contextual

El patrón que se repite en el Word: muchos desplegables serán inviables con volumen real.

Propuesta:

- Crear un componente estándar `PeriodoCursoSeccionPicker`.
- Todos los selectores de curso/sección deben ser combobox con búsqueda, agrupación por curso y filtro por periodo.
- Cuando el usuario ya eligió periodo, las secciones, docentes y alumnos deben quedar filtrados por ese contexto.
- Evitar `10/pag`, `20/pag`, etc. como control prominente; mantenerlo como preferencia secundaria o paginación/infinite list con búsqueda.

### 4. Panel Admin

El Panel tiene métricas, tarjetas de módulos, búsqueda por RUT, métricas por asignatura y datos docentes. La revisión humana dice que hay exceso visual y que la búsqueda por RUT es importante pero mal ubicada.

Propuesta:

- Panel = estado operativo del día/periodo: solicitudes pendientes, clases hoy, alumnos activos, matrículas pendientes de pago, certificados emitidos, alertas.
- La búsqueda por RUT debe ser una acción global persistente en Topbar o modal universal.
- "Métricas por asignatura" debe moverse a Analítica o a la vista de curso/sección.
- "Datos subidos por docentes" debe tener filtros por periodo/curso/docente y paginado real.

### 5. Agenda, Horarios y Clases

Agenda ya tiene calendario mensual y listado diario. El Word apunta a hacer más intuitivo periodo/mes/año y selección de curso/sección.

Propuesta:

- Agenda debe ser calendario como eje principal: mes/semana/día.
- Mes debe seleccionarse por nombre y año por stepper/dropdown, no campo numérico expuesto.
- Horarios debe ser planificación semanal por sección.
- Clases debe depender de horarios: crear/autogenerar sesiones desde bloques, y permitir excepciones puntuales.

### 6. Evaluaciones, Notas, Asistencia e Historial

Estas secciones están muy relacionadas y hoy se ven como módulos separados.

Propuesta:

- Para Admin, crear una vista "Carpeta académica" por sección:
  - Alumnos matriculados.
  - Clases y asistencia.
  - Evaluaciones.
  - Notas/resultados.
  - Certificados/documentos.
- Mantener pantallas especializadas, pero la navegación principal debe partir desde curso/sección.
- Evaluaciones necesita conservar tabs, pero con carga diferida por tab para evitar peso inicial.

### 7. Personas: Docentes y Alumnos

Docentes y Alumnos deben ser gestores de cuentas, pero también mostrar sus relaciones académicas.

Propuesta:

- Alumno: estado, credencial, correo, PIN, matrículas, certificados, solicitudes, historial.
- Docente: cuenta, secciones asignadas, clases, evaluaciones, material/subidas.
- Acciones rápidas desde la ficha: matricular alumno, resetear PIN, cambiar estado, ver historial.

### 8. Solicitudes, Beneficios y Certificados

Solicitudes necesita badges en menú/topbar y potencial push PWA. Certificados debería integrarse con solicitudes, no depender solo de emisión manual.

Propuesta:

- Nueva solicitud de certificado alumno regular:
  - Validar automáticamente matrícula activa/estado de pago/reglas del curso.
  - Si cumple, generar certificado sin aprobación manual o dejarlo preaprobado.
  - Si no cumple, enviar a revisión con motivo claro.
- Beneficios/Credenciales:
  - Mantener solo un icono de tarjeta como pide el Word.
  - Reemplazar desplegable infinito por selector agrupado periodo -> curso -> sección.
  - Confirmación fuerte para cambios masivos por sección.

### 9. Notificaciones

La revisión pide separar bien historial y nueva notificación.

Propuesta:

- Tabs: Crear, Historial, Plantillas, Métricas.
- Modal o panel lateral para nueva notificación.
- Segmentación por periodo/curso/sección/alumnos específicos.
- Vista de alcance antes de enviar: total destinatarios y exclusiones.

### 10. Finanzas

La sección debe nacer de matrícula/precio de inscripción por sección.

Propuesta:

- Agregar precio base en curso y precio final en sección.
- Finanzas debe mostrar ingresos por periodo, sección, estado de pago, mora, becas y pendientes.
- Integrar estado de pago de matrícula con bloqueos operativos claros.

## Roadmap sugerido

### Fase 0 - Bugs bloqueantes

- Corregir búsqueda de alumnos en matrícula.
- Reproducir y corregir `pdf_failed`.
- Reproducir y corregir `/admin/historial`.

### Fase 1 - Modelo mental Admin

- Rediseñar navegación y agrupar reportes.
- Crear selector estándar periodo/curso/sección.
- Mover búsqueda por RUT a acción global.

### Fase 2 - Flujo académico principal

- Rediseñar Cursos/Secciones como maestro-detalle.
- Integrar matrícula contextual desde sección.
- Agregar ficha de sección con alumnos, docente, clases, evaluaciones, asistencia, notas.

### Fase 3 - Operación diaria

- Mejorar Agenda/Horarios/Clases como calendario + planificación.
- Agregar autogeneración y edición visual de sesiones.

### Fase 4 - Registros y carpeta histórica

- Unificar resultados de pruebas, notas y asistencia en carpeta académica.
- Convertir Historial en vista explorable por curso/sección/alumno.

### Fase 5 - Comunicación y documentos

- Rediseñar Notificaciones.
- Automatizar certificados desde solicitudes.
- Mejorar Beneficios/Credenciales con selector moderno y confirmación masiva.

## Revisión de flujo real vs mejoras aplicables

Esta pasada cruza la revisión humana del Word con el estado real del código local actualizado. La conclusión general es que el modelo técnico ya distingue bastante bien `curso` y `sección/asignatura`, pero la interfaz todavía obliga al administrador a operar por módulos aislados. La mejora profesional debe ordenar el Admin alrededor de un flujo institucional: periodo -> curso -> sección -> matrícula -> operación académica -> documentos/reportes.

### Navegación y estructura Admin

Estado actual:

- El menú Admin tiene seis grupos y más de veinte entradas visibles: Panel, Agenda, Secciones, Cursos, Horarios, Clases, Evaluaciones, Asistencias, Notas, Encuestas, Personas, Comunicación, Reportes, Historial, Finanzas y Auditoría.
- `src/components/shared/navigationConfig.ts` ya agrupa por dominios, pero "Dashboard", "Rendimiento", "Retención", "Asistencia" y "Notas" siguen apareciendo como entradas separadas de primer nivel en Inteligencia y control.
- El Panel también repite accesos con tarjetas de módulos, generando una segunda navegación paralela.

Mejora aplicable:

- Reducir la barra lateral a módulos de trabajo: Inicio, Académico, Personas, Comunicación, Analítica, Finanzas y Sistema.
- Dejar Rendimiento, Retención, Asistencia y Notas como tabs o subrutas dentro de Analítica, no como secciones equivalentes.
- Mantener badges persistentes para Solicitudes y eventos críticos, porque el Word pide notificación visible para nuevas solicitudes.

Prioridad: alta. Es una mejora transversal y reduce carga cognitiva antes de tocar cada pantalla.

### Panel Admin

Estado actual:

- `src/app/(roles)/admin/page.tsx` carga periodo, búsqueda RUT, resumen docentes, métricas globales, métricas por asignatura y notificaciones recientes en una sola vista.
- El selector de periodo es un `select` común con botón "Aplicar periodo".
- Las métricas por asignatura se muestran completas sin paginado ni colapso contextual.
- La búsqueda por RUT queda debajo de tarjetas, notificaciones y métricas, aunque el Word la considera una función relevante.
- "Datos Subidos por Docentes" es un acordeón por docente; puede crecer demasiado con histórico real.

Mejora aplicable:

- Convertir el Panel en una vista de estado operativo, no en una bodega de todos los módulos.
- Mover búsqueda RUT a acción global persistente en Topbar, idealmente modal tipo comando: buscar alumno/docente por RUT, nombre o correo desde cualquier sección.
- En el Panel dejar solo KPIs de hoy/periodo: solicitudes pendientes, clases hoy, matrículas pendientes de pago, certificados emitidos, secciones activas, alertas.
- Mover "Métricas por asignatura" y "Datos Subidos por Docentes" a Analítica o a la ficha de sección/docente.
- Reemplazar selector de periodo por `PeriodoPicker` con estado, fechas y búsqueda si hay muchos periodos.

Prioridad: alta. Debe hacerse junto con navegación y selector estándar.

### Agenda

Estado actual:

- `src/app/(roles)/admin/agenda/page.tsx` ya filtra asignaturas por periodo y docentes por las asignaturas resultantes.
- La asignatura usa combobox con búsqueda, lo que coincide con el Word.
- Mes y año son inputs numéricos (`mes`, `anio`); además el label actual muestra "Anio".
- La vista central ya usa `AdminAgendaBoard`, con clases y evaluaciones del mes.

Mejora aplicable:

- Reemplazar mes/año numérico por navegación de calendario: mes anterior/siguiente, selector de mes por nombre y selector de año.
- Mantener filtros dependientes en cascada: periodo -> sección -> docente.
- Agregar accesos desde un evento del calendario: abrir clase, asistencia, evaluación o ficha de sección.
- Si una sección está seleccionada, mostrar a un costado resumen de horario, docente, cupos y próximas acciones.

Prioridad: media-alta. Es visible y muy alineada con el Word, pero depende del selector estándar.

### Cursos y Secciones

Estado actual:

- El schema ya define el modelo correcto: `cursos` como plantilla reutilizable y `asignaturas` como oferta concreta de curso en periodo/turno. Incluso existe alias semántico `secciones = asignaturas`.
- `/admin/cursos` gestiona catálogo base: nombre, código, descripción, horas y estado. Muestra total de secciones, pero no permite crear secciones desde el curso.
- `/admin/asignaturas` gestiona secciones con tabs por estado, búsqueda, fecha desde/hasta y selector de `10/20/50 por página`.
- El Word pide una lógica tipo universidad: un curso con varias secciones, cada una con docente, sala, horario, alumnos, evaluaciones y avance distinto.

Mejora aplicable:

- Crear una vista maestro-detalle en Académico: lista de cursos a la izquierda, secciones agrupadas a la derecha.
- En ficha de curso permitir crear sección inmediatamente: periodo, turno, docente, sala/bloques, cupos, precio de inscripción y estado.
- En ficha de sección mostrar tabs operativas: Resumen, Alumnos, Horario, Clases, Evaluaciones, Asistencia, Notas, Certificados.
- El control de `10/pág` no debe ser el foco. Mantener paginación técnica abajo; arriba priorizar búsqueda, periodo, estado y agrupación por curso.

Prioridad: muy alta. Es el núcleo del rediseño y desbloquea Matrículas, Clases, Evaluaciones, Asistencias, Notas, Certificados y Finanzas.

### Matrículas

Estado actual:

- `/admin/matriculas` selecciona una asignatura/sección, luego un alumno y estado de pago.
- Si no viene `asignaturaId`, toma la primera asignatura disponible, lo que puede llevar al admin a matricular en una sección no deseada si no revisa bien.
- El combobox de alumno busca globalmente; ya se corrigió localmente el bug de RUT normalizado en `buscarAlumnosAction`, pero el resultado aún no es contextual a la sección seleccionada.
- El estado de pago existe (`pendiente`, `pagado`, `mora`, `becado`) y ya se muestra en tabla.

Mejora aplicable:

- Hacer que la matrícula nazca desde una sección: "Agregar alumnos a esta sección".
- En el selector de alumno mostrar estado contextual: disponible, ya matriculado, inactivo, baja, suspendido o sin pago.
- Agregar advertencias claras: cupo lleno, matrícula previa, periodo cerrado, alumno inactivo, pago pendiente.
- Permitir acciones masivas desde sección: importar alumnos, matricular selección, cambiar estado de pago, exportar nómina.
- Mantener `/admin/matriculas` como vista global de auditoría, no como flujo principal de inscripción.

Prioridad: muy alta. El Word lo marca como bug y como flujo poco intuitivo.

### Horarios y Clases

Estado actual:

- `/admin/horarios` muestra una grilla semanal por sección, pero es principalmente visual.
- `/admin/clases` permite filtrar por periodo/sección, crear clase y autogenerar clases desde bloques horarios.
- La relación lógica ya existe: bloques horarios -> autogeneración de clases.

Mejora aplicable:

- Unificar el flujo: desde ficha de sección, primero configurar bloques horarios y luego autogenerar clases.
- Agregar calendario semanal editable para PC: grilla grande a la izquierda y listado/resumen a la derecha, como propone el Word.
- En Clases, mostrar "próximas", "pasadas", "sin asistencia" y "con evaluación" como estados útiles.
- Evitar que la creación manual de clases sea la primera opción si la sección ya tiene bloques horarios.

Prioridad: alta después de Cursos/Secciones.

### Evaluaciones

Estado actual:

- `/admin/evaluaciones/page.tsx` es la pantalla más pesada: alrededor de 1600 líneas.
- Tiene tabs para Evaluaciones, Banco Local, Maquetador, Resultados y Supervisión.
- Aunque hay tabs y paginación visual, la página prepara muchos datos del `selectedEvaluacionId` en el render del servidor, incluso cuando el admin no está mirando esa pestaña.
- La carga conceptual es alta: creación, banco, importación, pauta, publicación, resultados, corrección manual, intentos recuperables, supervisión y auditoría viven juntos.

Mejora aplicable:

- Mantener tabs, pero convertir cada tab en subcomponente/server segment con carga diferida por tab.
- En ficha de sección, mostrar Evaluaciones como parte de la carpeta académica; desde ahí abrir gestión avanzada.
- Separar mentalmente tres flujos:
  - Crear/publicar evaluación.
  - Maquetar/revisar preguntas.
  - Corregir/resultados/supervisión.
- Agregar resumen de "qué falta para publicar" como checklist persistente, porque el código ya calcula `publicationChecks`.

Prioridad: alta. Hay ganancia de UX y de performance.

### Asistencias, Notas e Historial

Estado actual:

- `/admin/asistencias` y `/admin/notas` filtran por periodo, sección y búsqueda de alumno; agrupan por asignatura.
- `listarAsistenciasAdmin` y `listarNotasAdmin` no reciben paginación, por lo que pueden crecer sin límite en periodos grandes.
- `/admin/historial` ya apunta a una vista institucional por evaluación/sección; localmente se agregó fallback defensivo para evitar caída total.
- El Word pide que resultados, notas y asistencia vivan en una vista tipo carpetas.

Mejora aplicable:

- Crear "Carpeta académica" por sección:
  - Nómina/matrículas.
  - Asistencia por clase.
  - Evaluaciones y resultados.
  - Notas finales.
  - Certificados/documentos.
  - Historial de cambios relevantes.
- Agregar paginación server-side en Asistencias y Notas.
- Hacer que Historial sea explorable por periodo -> curso -> sección -> alumno/evaluación, no solo una tabla de evaluaciones.

Prioridad: alta. Además mitiga riesgo de performance.

### Encuestas

Estado actual:

- Existe constructor con plantillas, campañas por grupo y detalle de resultados.
- La creación está inline en la página principal; para muchos cursos/secciones puede sentirse pesada.
- El componente ya permite asignar múltiples secciones, pero falta ordenar el flujo por audiencia y estado de campaña.

Mejora aplicable:

- Convertir "Nueva encuesta" en wizard o modal lateral:
  1. Plantilla.
  2. Audiencia.
  3. Periodo/curso/secciones.
  4. Obligatoriedad.
  5. Confirmación de alcance.
- Agregar tabs: Campañas activas, Borradores, Cerradas, Resultados.
- Mantener detalle visual de resultados, pero optimizar mobile con secciones colapsables.

Prioridad: media. Está mejor que otras áreas, requiere orden y responsive.

### Docentes y Alumnos

Estado actual:

- Docentes y Alumnos funcionan como gestores de cuentas con búsqueda y paginación.
- La ficha académica no está integrada: un docente no muestra rápidamente secciones asignadas; un alumno no muestra matrículas, certificados, solicitudes o historial desde su fila principal.
- En Alumnos existe importación y acciones de cuenta, pero la asignación a curso vive en Matrículas.

Mejora aplicable:

- Agregar drawer/ficha por persona:
  - Alumno: datos, estado, PIN, matrículas, pagos, certificados, solicitudes, historial.
  - Docente: datos, secciones asignadas, clases, evaluaciones, material/subidas, actividad.
- Desde ficha de alumno permitir "Matricular en sección".
- Desde ficha de docente permitir "Asignar a sección".

Prioridad: media-alta. Mejora flujo diario sin rehacer todo el modelo.

### Solicitudes, Certificados y Beneficios/Credenciales

Estado actual:

- Solicitudes muestra pendientes e historial, con filtros en cliente.
- Certificados emite manualmente por matrícula. Carga hasta 2000 matrículas para el combobox local.
- La ruta PDF fue reforzada localmente con runtime Node.js, pero aún falta validar con certificado real.
- Beneficios/Credenciales permite control por persona y cambio masivo por curso, pero usa `select` nativo con todas las secciones y no exige una confirmación fuerte para el cambio masivo.
- En el Word se pide dejar solo un icono de tarjeta en Beneficios/Credenciales.

Mejora aplicable:

- Solicitud de certificado alumno regular debe validar automáticamente matrícula activa, periodo, estado de pago y reglas del curso.
- Si cumple, emitir certificado automáticamente o dejarlo preaprobado; si no cumple, mostrar motivo al admin.
- Certificados debe buscar matrícula por alumno/RUT/sección con combobox remoto, no cargar 2000 registros al cliente.
- Beneficios/Credenciales debe usar selector moderno periodo -> curso -> sección y modal de confirmación con impacto: cuántos alumnos serán afectados.
- Dejar un solo icono principal en "Control por curso".

Prioridad: alta por bug PDF, solicitudes y riesgo de cambio masivo.

### Notificaciones

Estado actual:

- Notificaciones junta creación e historial en una grilla de dos columnas.
- Puede enviar global, por curso o individual.
- `listarUsuariosActivosAdmin` limita a 500 usuarios y `listarAsignaturasActivasAdmin` lista secciones sin selector por periodo en UI.

Mejora aplicable:

- Separar en tabs: Crear, Historial, Plantillas, Métricas.
- Nueva notificación como modal/panel lateral con selector de alcance.
- Antes de enviar, mostrar vista de impacto: destinatarios totales, curso/sección, exclusiones y ejemplo de destinatarios.
- Agregar filtro de periodo/curso/sección antes de seleccionar destinatarios individuales.

Prioridad: media-alta. Es comunicación operativa y debe evitar envíos masivos accidentales.

### Importar Alumnos

Estado actual:

- Es una de las pantallas más desarrolladas: periodo picker, creación de periodo, preview, validación y confirmación.
- El flujo está orientado a archivo -> periodo -> importación, pero el Word pide lógica OTEC completa para asignar alumnos a curso activo.

Mejora aplicable:

- Hacer explícito el destino académico antes de importar: periodo y mapeo curso/sección.
- En preview, agrupar por curso detectado y mostrar qué secciones se crearán o reutilizarán.
- Permitir resolver ambigüedades antes de confirmar: curso parecido, sección existente, alumnos duplicados, credenciales auto-generadas.
- Después de importar, ofrecer acciones: ver sección, revisar matrículas, exportar errores, enviar notificación.

Prioridad: media-alta. La base existe; falta orientar el flujo a sección/matrícula.

### Finanzas

Estado actual:

- Finanzas registra ingresos/gastos manuales, con resumen global.
- La action acepta `asignaturaId`, pero la UI actual no expone selección de sección.
- No existe vínculo operacional fuerte entre matrícula, precio de inscripción y finanzas.

Mejora aplicable:

- Agregar precio base en curso y precio final en sección.
- Al matricular alumno, crear o sugerir ingreso financiero asociado a la matrícula.
- Finanzas debe poder filtrar por periodo, curso, sección, estado de pago y categoría.
- Mostrar métricas mensuales: ingresos por inscripción, mora, becas, gastos y balance por periodo.

Prioridad: media. Depende de ordenar Matrículas y Secciones.

### Administradores y Auditoría

Estado actual:

- El Word no pide cambios relevantes para Administradores ni Auditoría.

Mejora aplicable:

- Mantener ambos fuera del rediseño visual inicial.
- Solo revisar accesibilidad, mensajes y confirmaciones destructivas cuando se haga limpieza general.

Prioridad: baja.

## Orden recomendado de implementación

1. Consolidar selector estándar `PeriodoCursoSeccionPicker` y búsqueda global por RUT/persona.
2. Rediseñar navegación Admin y convertir Reportes en Analítica con tabs.
3. Construir ficha Curso/Sección como eje operacional.
4. Mover matrícula principal a contexto de sección y mejorar resultados del combobox de alumno.
5. Integrar Horarios/Clases en flujo visual de sección.
6. Crear Carpeta académica para Asistencia, Notas, Evaluaciones, Certificados e Historial.
7. Reorganizar Evaluaciones con carga por tab.
8. Automatizar Solicitudes -> Certificados y reforzar PDF con prueba real.
9. Mejorar Beneficios/Credenciales y Notificaciones con confirmación de alcance.
10. Conectar Finanzas con matrícula/precio de sección.

## Criterio de aceptación para las mejoras

- El admin puede partir desde un periodo, elegir curso/sección y resolver alumnos, docentes, clases, evaluaciones, asistencia, notas y certificados sin saltar entre cinco pantallas.
- Todo selector con potencial de muchos registros debe ser combobox buscable y contextual, no `select` largo.
- Todo cambio masivo debe mostrar confirmación con número de afectados.
- Todo listado de datos históricos debe tener paginación o carga diferida server-side.
- La URL debe conservar filtros relevantes: periodo, curso/sección, tab, búsqueda y página.
- Mobile debe usar cards/resúmenes colapsables; desktop puede usar tablas densas.

## Verificación realizada

- Extracción de texto del Word desde XML del `.docx`.
- Revisión de las 5 imágenes embebidas.
- Revisión de rutas Admin y componentes clave.
- `pnpm exec tsc --noEmit` ejecutado correctamente.

No se modificó lógica de aplicación en esta pasada; este archivo es análisis y priorización.
