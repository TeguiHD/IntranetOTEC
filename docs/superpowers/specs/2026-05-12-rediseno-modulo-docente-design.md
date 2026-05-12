# Diseño: Rediseño módulo docente — 2026-05-12

**Fuente:** Informe DOCENTE.docx (12Mayo2026)
**Contexto:** Post-sync con VPS. Codex ya implementó `/docente/materiales`, `/docente/pruebas` y removió historial del nav. Este spec cubre lo que queda.

---

## Alcance

### Bugs críticos
1. `/docente/asistencia` — Server Component error al cambiar estado de asistencia de alumno
2. `/admin/clases` — Filtro no muestra todas las secciones

### Rediseños
3. `/docente/asignaturas` — Reemplazar scroll monster por vista calendario semanal por bloques
4. `/docente/calendario` — Agregar franjas horarias a la vista mensual
5. `/docente/horario` — Ajuste visual menor

### Eliminaciones
6. Notas y observaciones fuera del rol docente (admin las gestiona en `/admin/notas`)

---

## 1. Bug: `/docente/asistencia`

**Problema:** `registrarAsistenciaDocenteAction` falla con error de Server Component en producción. El componente `AsistenciaView` usa `useOptimistic` + server action — la acción probablemente falla silenciosamente en el servidor y Next.js devuelve un error genérico.

**Diagnóstico a hacer:** Revisar `registrarAsistenciaDocenteAction` en `@/actions/docente` — validar que no lanza excepciones sin capturar y que el revalidate path es correcto.

**Fix esperado:** Envolver la action en try/catch con redirect a `state=error`, igual que el resto de actions del proyecto.

---

## 2. Bug: `/admin/clases`

**Problema:** El componente `PeriodoCursoSeccionPicker` + `listarAsignaturasAdmin` filtra por periodo activo por defecto, ocultando secciones de otros periodos.

**Fix esperado:** Asegurar que cuando no hay filtro de periodo seleccionado, se muestren todas las secciones. O agregar opción "Todos los periodos" al picker.

---

## 3. Rediseño: `/docente/asignaturas` → Vista calendario semanal

### Principio de diseño
Un docente no gestiona "asignaturas" en abstracto — gestiona **clases en el tiempo**. La interfaz debe reflejar eso: mostrar la semana, sus bloques de clase, y desde ahí acceder a todo.

### Layout

```
┌─────────────────────────────────────────────────┐
│  Mis Asignaturas    [← semana anterior] [semana →]│
│  Semana del 12 al 18 de mayo                     │
├───────┬───────┬───────┬───────┬───────┬───────┬──┤
│ LUN   │ MAR   │ MIÉ   │ JUE   │ VIE   │ SÁB   │DOM│
├───────┼───────┼───────┼───────┼───────┼───────┼──┤
│ 09:00 │       │       │       │       │       │  │
│[GEST] │       │[GEST] │       │       │       │  │
│ 09-11 │       │ 09-11 │       │       │       │  │
├───────┼───────┼───────┼───────┼───────┼───────┼──┤
│       │ 14:00 │       │ 14:00 │       │       │  │
│       │[CONT] │       │[CONT] │       │       │  │
│       │ 14-16 │       │ 14-16 │       │       │  │
└───────┴───────┴───────┴───────┴───────┴───────┴──┘
```

Cada bloque coloreado = una asignatura con horario fijo semanal. Color único por asignatura.

### Al clicar un bloque

Panel lateral deslizable (sheet) con:

1. **Cabecera** — Nombre asignatura, sección, fecha del día, hora
2. **Asistencia rápida** — Botón "Pasar lista" → abre inline el listado de alumnos con radio presente/ausente/tardanza/justificado. Si ya fue registrada hoy, muestra estado con opción de editar
3. **Material** — Listado de materiales de esa sesión (tarjetas: ícono tipo, nombre, descripción, tamaño). Botón "Subir archivo" abre formulario inline (nombre + descripción + archivo)
4. **Prueba del día** — Si hay evaluación asignada/activa para esa sesión, badge visible. Botón "Ir a Pruebas" redirige a `/docente/pruebas`
5. **QR de asistencia** — Si la clase tiene QR disponible, botón para generarlo inline

### Lo que se elimina de asignaturas

- Formulario registrar nota
- Formulario importar notas por archivo
- Formulario registrar observación
- Histórico de notas y observaciones con CSV export
- El panel vertical de scroll interminable

### Datos necesarios

- `obtenerHorarioDocente()` ya existe — devuelve `bloquesHorario` con día + hora inicio/fin + asignatura
- Las clases puntuales de cada sesión se obtienen con `listarClasesMesDocente` (ya existe)
- Cruzar bloques con clases del día seleccionado para saber si hay clase real

### Estado vacío

Si el docente no tiene bloques horarios configurados → mensaje: "Tu horario aún no está configurado. Contacta a administración." + link a Calendario para ver eventos.

### Mobile

En mobile: lista vertical de días de la semana. Hoy destacado. Al tocar un día se expanden las clases de ese día. Al tocar una clase → panel/modal con el mismo contenido.

---

## 4. Enhancement: `/docente/calendario`

**Problema actual:** Vista de mes con días, sin horas. Las clases aparecen solo como puntos/eventos sin indicar la hora.

**Propuesta:** Agregar vista "Semana" (toggle mes/semana). La vista semana muestra franjas horarias (columnas por día, filas por hora 07:00–22:00). Las clases del docente aparecen en su franja real.

**Implementación:** El `CalendarioContainer` ya tiene eventos. Agregar un modo `vista: "mes" | "semana"` controlado por state local. En vista semana, renderizar un grid con `gridRow` calculado desde `horaInicio`.

**Nota:** No romper la vista mensual — solo agregar el toggle.

---

## 5. Enhancement: `/docente/horario`

**Estado actual:** Ya tiene `WeeklyScheduleGrid` + estado vacío agregado por Codex.

**Mejoras pendientes:**
- Colores por asignatura (cada asignatura un color de fondo distinto en el bloque)
- Mostrar nombre completo de asignatura + sección en el bloque (actualmente puede estar truncado)
- En mobile: colapsar a lista día por día en vez de tabla horizontal con scroll

---

## 6. Notas y observaciones — fuera del docente

**Decisión:** Eliminar de `/docente/asignaturas` los formularios de notas y observaciones. El admin ya los gestiona en `/admin/notas`.

**Qué se limpia:**
- Importar de `@/actions/docente`: eliminar `registrarNotaDocenteFormAction`, `eliminarNotaDocenteFormAction`, `importarNotasDocenteFormAction`, `registrarObservacionDocenteFormAction`, `eliminarObservacionDocenteFormAction`, `listarNotasDocente`, `listarObservacionesDocente`
- Eliminar del `page.tsx` de asignaturas los `article` de notas, importar notas, observaciones e histórico
- NO tocar las server actions en sí (pueden ser usadas por admin en el futuro)

---

## Intercomunicación entre secciones

```
Asignaturas (calendario)
    ├── clic bloque → panel asistencia → registra sin salir
    ├── clic bloque → panel material → sube sin salir
    ├── clic bloque → "Ir a Pruebas" → /docente/pruebas (con asignatura pre-filtrada)
    └── clic bloque → QR → genera sin salir

Pruebas (/docente/pruebas)
    └── "Crear/editar" → /docente/asignaturas/[id]/evaluaciones

Materiales (/docente/materiales)
    └── "Abrir curso" → /docente/asignaturas?asignaturaId=X (scroll a top)

Asistencia (/docente/asistencia)
    └── Sigue existiendo como página completa para pasar lista mensual
    └── El panel de asignaturas ofrece acceso rápido al día actual
```

---

## Seguridad aplicada

- Todas las server actions validan `session.user.id` contra `asignaturaDocente` antes de operar
- El panel lateral de asignaturas NO carga datos de otras asignaturas — siempre filtra por `asignaturaId` del bloque seleccionado
- El upload de material valida tipo MIME y tamaño en el servidor (ya implementado en `subirMaterialFormAction`)
- QR de asistencia tiene TTL de 30 min (ya implementado)
- No exponer IDs de matrícula en URLs — usar `matriculaId` solo en hidden inputs de forms

---

## Jerarquía de componentes propuesta

```
DocenteAsignaturasPage (server)
├── SemanaNavegador (client) — navega semanas, carga datos por semana
│   └── CalendarioSemanalDocente (client)
│       └── BloqueCurso[] (client) — un bloque por clase/horario
│           └── PanelClase (client, sheet/drawer)
│               ├── SeccionAsistencia (client)
│               ├── SeccionMaterial (client)
│               ├── SeccionPrueba (client, solo link)
│               └── SeccionQR (client)
└── EstadoVacio (server, si no hay bloques)
```

---

## Orden de implementación recomendado

1. **Bug asistencia** — fix rápido, evita el error de producción
2. **Bug admin/clases filter** — fix rápido
3. **Limpiar asignaturas** — eliminar notas/obs, dejar solo lo que va al calendario
4. **Calendario semanal docente** — componente nuevo, reemplaza el body de asignaturas
5. **Panel lateral por bloque** — asistencia inline, material inline, link pruebas
6. **Calendario con franjas horarias** — toggle semana en CalendarioContainer
7. **Horario colores** — ajuste visual final
