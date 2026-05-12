# Rediseño Módulo Docente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir bugs críticos en asistencia y filtro de clases admin, rediseñar `/docente/asignaturas` como calendario semanal interactivo, y mejorar calendario y horario docente.

**Architecture:** El calendario semanal docente usa `bloquesHorario` (patrón recurrente) para renderizar la grilla. Al clicar un bloque se abre un panel lateral (drawer) que carga la clase concreta de ese día vía server action. Notas y observaciones se eliminan del rol docente (admin las gestiona). El fix de asistencia corrige el ciclo `useOptimistic` que no persiste en el estado padre.

**Tech Stack:** Next.js 14 App Router, React 19, TypeScript, Drizzle ORM, Tailwind CSS, Lucide icons. No se agregan dependencias externas.

---

## File Map

### Nuevos
- `src/components/docente/CalendarioSemanalDocente.tsx` — grilla semana Lun–Sáb con bloques coloreados por asignatura
- `src/components/docente/PanelClase.tsx` — drawer lateral: asistencia inline, material, link pruebas, QR
- `src/actions/docente-calendario.ts` — `listarClasePorAsignaturaYFecha`, `listarMaterialClase`, `listarAlumnosClase`

### Modificados
- `src/app/(roles)/docente/asistencia/AsistenciaView.tsx` — fix useOptimistic + restaurar tab Tarjetas
- `src/app/(roles)/admin/clases/page.tsx` — fix filtro periodos (default vacío)
- `src/app/(roles)/docente/asignaturas/page.tsx` — reemplazar body por CalendarioSemanalDocente; eliminar forms notas/obs
- `src/app/(roles)/docente/calendario/page.tsx` — pasar bloques horarios al CalendarioContainer
- `src/components/shared/CalendarioContainer.tsx` — agregar toggle vista semana con franjas horarias
- `src/components/shared/WeeklyScheduleGrid.tsx` — añadir colores por asignatura y mejora mobile

---

## Task 1: Fix bug asistencia — useOptimistic no persiste

**Problema:** `handleMarcar` aplica el cambio optimista pero cuando termina la transición, `useOptimistic` revierte al estado base (`clasesMes`) que no fue actualizado. El botón parece que no hace nada.

**Files:**
- Modify: `src/app/(roles)/docente/asistencia/AsistenciaView.tsx`

- [ ] **Step 1.1: Entender el ciclo actual**

En `AsistenciaView` (línea ~686), `clasesMes` es el estado base:
```typescript
const [clasesMes, setClasesMes] = useState<ClaseMes[]>(clasesMesInicial);
```
En `CalendarTab` (línea ~91), `useOptimistic` usa ese estado:
```typescript
const [localClases, setLocalClases] = useOptimistic(clasesMes);
```
Cuando `startTransition` termina, `localClases` vuelve a `clasesMes` (sin el cambio).

- [ ] **Step 1.2: Agregar callback `onUpdateEstado` en AsistenciaView**

En `AsistenciaView`, antes del return, agregar el callback que actualiza `clasesMes` permanentemente:

```typescript
const handleUpdateEstado = useCallback(
  (claseId: string, matriculaId: string, estado: NonNullable<EstadoAsist>) => {
    setClasesMes((prev) =>
      prev.map((clase) =>
        clase.id !== claseId
          ? clase
          : {
              ...clase,
              alumnos: clase.alumnos.map((a) =>
                a.matriculaId !== matriculaId ? a : { ...a, estado },
              ),
            },
      ),
    );
  },
  [],
);
```

- [ ] **Step 1.3: Pasar el callback a CalendarTab**

Cambiar la firma de `CalendarTab`:
```typescript
function CalendarTab({
  clasesMes,
  mes,
  anio,
  onMesChange,
  onUpdateEstado,
}: {
  clasesMes: ClaseMes[];
  mes: number;
  anio: number;
  onMesChange: (m: number, a: number) => void;
  onUpdateEstado: (claseId: string, matriculaId: string, estado: NonNullable<EstadoAsist>) => void;
}) {
```

Y en el render de `AsistenciaView`:
```typescript
<CalendarTab
  clasesMes={clasesMes}
  mes={mes}
  anio={anio}
  onMesChange={handleMesChange}
  onUpdateEstado={handleUpdateEstado}
/>
```

- [ ] **Step 1.4: Actualizar `handleMarcar` en CalendarTab**

Reemplazar `handleMarcar` actual (~línea 118) por:
```typescript
const handleMarcar = useCallback(
  (claseId: string, matriculaId: string, estado: NonNullable<EstadoAsist>, fecha: string) => {
    startTransition(async () => {
      setLocalClases((prev) =>
        prev.map((clase) =>
          clase.id !== claseId
            ? clase
            : {
                ...clase,
                alumnos: clase.alumnos.map((a) =>
                  a.matriculaId !== matriculaId ? a : { ...a, estado },
                ),
              },
        ),
      );
      const result = await registrarAsistenciaDocenteAction({
        claseId,
        matriculaId,
        estado,
        fechaRegistro: fecha,
      });
      if (result.ok) {
        onUpdateEstado(claseId, matriculaId, estado);
      }
    });
  },
  [setLocalClases, onUpdateEstado],
);
```

- [ ] **Step 1.5: Restaurar tab "Tarjetas de Asistencia"**

En el array de tabs (~línea 706), cambiar:
```typescript
// ANTES:
{(["calendario"] as const).map((t) => (

// DESPUÉS:
{(["calendario", "tarjetas"] as const).map((t) => (
```

Esto restaura el tab "Tarjetas de Asistencia" que ya tiene implementación completa en `FidelidadTab`.

- [ ] **Step 1.6: Verificar en local**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Esperado: 0 errores relacionados a AsistenciaView.

- [ ] **Step 1.7: Commit**

```bash
git add src/app/\(roles\)/docente/asistencia/AsistenciaView.tsx
git commit -m "fix(asistencia): corrige persistencia de useOptimistic y restaura tab tarjetas"
```

---

## Task 2: Fix filtro `/admin/clases` — no muestra todas las secciones

**Problema:** El `selectedPeriodoId` siempre cae al periodo activo como default. Secciones de otros periodos no aparecen en el filtro de asignaturas.

**Files:**
- Modify: `src/app/(roles)/admin/clases/page.tsx`

- [ ] **Step 2.1: Cambiar lógica de defaultPeriodoId**

Localizar (~línea 76):
```typescript
const defaultPeriodoId = periodos.find((p) => p.estado === "activo")?.id ?? periodos[0]?.id ?? "";
const selectedPeriodoId =
  requestedPeriodoId && periodos.some((p) => p.id === requestedPeriodoId)
    ? requestedPeriodoId
    : defaultPeriodoId;
```

Reemplazar por:
```typescript
const activePeriodoId = periodos.find((p) => p.estado === "activo")?.id ?? periodos[0]?.id ?? "";
// Si el usuario no pasó periodoId explícitamente, no forzar filtro
const selectedPeriodoId =
  requestedPeriodoId && periodos.some((p) => p.id === requestedPeriodoId)
    ? requestedPeriodoId
    : requestedPeriodoId === ""
    ? ""
    : activePeriodoId;
```

- [ ] **Step 2.2: Pasar periodoId undefined cuando no hay selección**

Localizar la llamada a `listarAsignaturasAdmin` (~línea 84):
```typescript
const asignaturas = await listarAsignaturasAdmin(
  { limit: 1000, offset: 0 },
  { incluirArchivadas: false, periodoId: selectedPeriodoId || undefined },
);
```

Esto ya es correcto: cuando `selectedPeriodoId` es `""`, pasa `undefined` y trae todas las secciones.

- [ ] **Step 2.3: Agregar opción "Todos los periodos" en el picker**

Buscar el componente `PeriodoCursoSeccionPicker` que renderiza los filtros en el return. Si no está expuesto como prop, agregar directamente en el `<form>` de filtros de la página el `<option value="">Todos los periodos</option>` como primer elemento del select de periodos.

En el return de `AdminClasesPage`, localizar donde se renderiza el select de período y agregar:
```tsx
<select name="periodoId" defaultValue={selectedPeriodoId}>
  <option value="">Todos los periodos</option>
  {periodos.map((p) => (
    <option key={p.id} value={p.id}>
      {p.nombre} {p.estado === "activo" ? "(activo)" : ""}
    </option>
  ))}
</select>
```

Si el select viene del `PeriodoCursoSeccionPicker`, revisar ese componente y agregar la opción vacía ahí.

- [ ] **Step 2.4: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "clases/page"
```
Esperado: sin errores.

- [ ] **Step 2.5: Commit**

```bash
git add src/app/\(roles\)/admin/clases/page.tsx
git commit -m "fix(admin/clases): muestra secciones de todos los periodos en el filtro"
```

---

## Task 3: Limpiar `/docente/asignaturas` — eliminar notas y observaciones

**Files:**
- Modify: `src/app/(roles)/docente/asignaturas/page.tsx`

- [ ] **Step 3.1: Eliminar imports no usados**

En `page.tsx` de asignaturas, eliminar los imports:
```typescript
// Eliminar:
eliminarNotaDocenteFormAction,
eliminarObservacionDocenteFormAction,
importarNotasDocenteFormAction,
listarNotasDocente,
listarObservacionesDocente,
registrarNotaDocenteFormAction,
registrarObservacionDocenteFormAction,
```

Y eliminar también:
```typescript
// Eliminar de material:
eliminarMaterialFormAction,
listarMaterialPorAsignatura,
subirMaterialFormAction,
```
(el material ahora está en su propia página `/docente/materiales`)

- [ ] **Step 3.2: Simplificar la carga de datos**

El page actualmente carga 8 datasets en paralelo. Reducir a lo esencial para la vista de asignaturas:
```typescript
const [clases, matriculas, resumenAlumnos, alumnosEnRiesgo, anunciosAsignatura] = selectedAsignaturaId
  ? await Promise.all([
      listarClasesDocente(selectedAsignaturaId),
      listarMatriculasDocente(selectedAsignaturaId),
      listarResumenAlumnosDocente(selectedAsignaturaId),
      listarAlumnosEnRiesgo(selectedAsignaturaId),
      listarAnunciosAsignatura(selectedAsignaturaId),
    ])
  : [[], [], [], [], []];
```

- [ ] **Step 3.3: Eliminar articles de notas, importar notas, observaciones e histórico**

Eliminar del JSX los `<article>` con `id` o headers:
- "Registrar nota"
- "Importar notas por archivo"
- "Registrar observación"
- "Histórico de notas y observaciones" (con sus exports CSV)

También eliminar las variables `notasFiltradas`, `observacionesFiltradas`, `notasCsvHref`, `observacionesCsvHref`, `anioParam`, `aniosDisponibles`.

- [ ] **Step 3.4: Eliminar article de "Subir material" de asignaturas**

El material ahora tiene su propia página. Eliminar el `<article>` de "Subir material" que usa `subirMaterialFormAction` y el listado de `materiales`.

- [ ] **Step 3.5: Agregar link a Materiales y a Notas (admin)**

En el nav de anchor links del page, reemplazar las anclas removidas por links útiles:
```tsx
<Link
  href="/docente/materiales"
  className="rounded-lg border border-gray-100 px-3 py-2 text-center font-medium text-text-secondary hover:border-primary/30 hover:text-primary dark:border-gray-800 dark:text-gray-300"
>
  Materiales
</Link>
```

- [ ] **Step 3.6: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "asignaturas/page"
```
Esperado: sin errores.

- [ ] **Step 3.7: Commit**

```bash
git add src/app/\(roles\)/docente/asignaturas/page.tsx
git commit -m "refactor(docente/asignaturas): elimina notas y observaciones del rol docente"
```

---

## Task 4: Nuevo server action — datos de clase por fecha

Se necesita una acción para el panel lateral del calendario: dado `asignaturaId` + `fecha`, devolver la clase de ese día con alumnos y materiales.

**Files:**
- Create: `src/actions/docente-calendario.ts`

- [ ] **Step 4.1: Crear el archivo**

```typescript
"use server";

import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import {
  asignaturas,
  asistencias,
  clases,
  materiales,
  matriculas,
  usuarios,
} from "@/db/schema";
import { requireActionActor } from "./_security";

export type ClaseDia = {
  id: string;
  titulo: string;
  numeroSesion: number;
  horaInicio: string | null;
  horaFin: string | null;
  sala: string | null;
  alumnos: {
    matriculaId: string;
    alumnoNombre: string;
    alumnoApellido: string;
    alumnoRut: string | null;
    estado: "presente" | "ausente" | "tardanza" | "justificado" | null;
  }[];
  materiales: {
    id: string;
    nombre: string;
    descripcion: string | null;
    tamanioBytes: number | null;
    tipo: string | null;
  }[];
};

export async function listarClasePorAsignaturaYFecha(
  asignaturaId: string,
  fecha: string,
): Promise<ClaseDia | null> {
  const actorResult = await requireActionActor("asignaturas.docente", ["docente"]);
  if (!actorResult.ok) return null;

  const db = getDb();

  const [clase] = await db
    .select({
      id: clases.id,
      titulo: clases.titulo,
      numeroSesion: clases.numeroSesion,
      horaInicio: clases.horaInicio,
      horaFin: clases.horaFin,
      sala: clases.sala,
    })
    .from(clases)
    .where(
      and(
        eq(clases.asignaturaId, asignaturaId),
        eq(clases.fecha, fecha),
        isNull(clases.eliminadoAt),
      ),
    )
    .limit(1);

  if (!clase) return null;

  const [alumnosRows, materialesRows] = await Promise.all([
    db
      .select({
        matriculaId: matriculas.id,
        alumnoNombre: usuarios.nombre,
        alumnoApellido: usuarios.apellido,
        alumnoRut: usuarios.rut,
        estado: asistencias.estado,
      })
      .from(matriculas)
      .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
      .leftJoin(
        asistencias,
        and(
          eq(asistencias.matriculaId, matriculas.id),
          eq(asistencias.claseId, clase.id),
        ),
      )
      .where(
        and(eq(matriculas.asignaturaId, asignaturaId), isNull(matriculas.eliminadoAt)),
      )
      .orderBy(usuarios.apellido, usuarios.nombre),
    db
      .select({
        id: materiales.id,
        nombre: materiales.nombre,
        descripcion: materiales.descripcion,
        tamanioBytes: materiales.tamanioBytes,
        tipo: materiales.tipo,
      })
      .from(materiales)
      .where(
        and(eq(materiales.claseId, clase.id), isNull(materiales.eliminadoAt)),
      ),
  ]);

  return {
    ...clase,
    horaInicio: clase.horaInicio ? String(clase.horaInicio).slice(0, 5) : null,
    horaFin: clase.horaFin ? String(clase.horaFin).slice(0, 5) : null,
    alumnos: alumnosRows.map((a) => ({
      ...a,
      estado: (a.estado as ClaseDia["alumnos"][number]["estado"]) ?? null,
    })),
    materiales: materialesRows,
  };
}
```

- [ ] **Step 4.2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "docente-calendario"
```
Esperado: sin errores.

- [ ] **Step 4.3: Commit**

```bash
git add src/actions/docente-calendario.ts
git commit -m "feat(actions): agrega listarClasePorAsignaturaYFecha para panel docente"
```

---

## Task 5: Componente PanelClase — drawer lateral

**Files:**
- Create: `src/components/docente/PanelClase.tsx`

- [ ] **Step 5.1: Crear el componente**

```typescript
"use client";

import { useCallback, useState, useTransition } from "react";

import { BookOpen, ChevronRight, Clock, FileText, MapPin, Shield, Upload, X } from "lucide-react";

import { registrarAsistenciaDocenteAction } from "@/actions/docente";
import { listarClasePorAsignaturaYFecha, type ClaseDia } from "@/actions/docente-calendario";
import { subirMaterialFormAction } from "@/actions/material";
import { QrAsistenciaButton } from "@/components/docente/QrAsistenciaButton";
import Link from "next/link";

type EstadoAsist = "presente" | "ausente" | "tardanza" | "justificado";

const ESTADO_CONFIG: Record<EstadoAsist, { label: string; dot: string; btn: string; activBtn: string }> = {
  presente:    { label: "Presente",    dot: "bg-emerald-500", btn: "border-emerald-300 text-emerald-700 hover:bg-emerald-50", activBtn: "bg-emerald-500 text-white border-emerald-500" },
  tardanza:    { label: "Tardanza",    dot: "bg-amber-400",   btn: "border-amber-300 text-amber-700 hover:bg-amber-50",       activBtn: "bg-amber-400 text-white border-amber-400" },
  ausente:     { label: "Ausente",     dot: "bg-rose-500",    btn: "border-rose-300 text-rose-700 hover:bg-rose-50",          activBtn: "bg-rose-500 text-white border-rose-500" },
  justificado: { label: "Justificado", dot: "bg-blue-500",    btn: "border-blue-300 text-blue-700 hover:bg-blue-50",          activBtn: "bg-blue-500 text-white border-blue-500" },
};

type Props = {
  asignaturaId: string;
  asignaturaNombre: string;
  fecha: string;         // "YYYY-MM-DD"
  diaNombre: string;     // "Lunes 12 mayo"
  horaInicio: string | null;
  horaFin: string | null;
  sala: string | null;
  onClose: () => void;
  pruebasHref: string;   // "/docente/pruebas?asignaturaId=..."
};

function formatFecha(iso: string, diaNombre: string): string {
  return diaNombre;
}

export function PanelClase({
  asignaturaId,
  asignaturaNombre,
  fecha,
  diaNombre,
  horaInicio,
  horaFin,
  sala,
  onClose,
  pruebasHref,
}: Props) {
  const [clase, setClase] = useState<ClaseDia | null | undefined>(undefined); // undefined = sin cargar
  const [loading, startLoad] = useTransition();
  const [estadosLocales, setEstadosLocales] = useState<Record<string, EstadoAsist>>({});
  const [pendiente, startSave] = useTransition();
  const [showMaterialForm, setShowMaterialForm] = useState(false);

  // Cargar al montar
  useState(() => {
    startLoad(async () => {
      const data = await listarClasePorAsignaturaYFecha(asignaturaId, fecha);
      setClase(data);
      if (data) {
        const init: Record<string, EstadoAsist> = {};
        for (const a of data.alumnos) {
          if (a.estado) init[a.matriculaId] = a.estado;
        }
        setEstadosLocales(init);
      }
    });
  });

  const marcar = useCallback(
    (matriculaId: string, estado: EstadoAsist) => {
      if (!clase) return;
      setEstadosLocales((prev) => ({ ...prev, [matriculaId]: estado }));
      startSave(async () => {
        await registrarAsistenciaDocenteAction({
          claseId: clase.id,
          matriculaId,
          estado,
          fechaRegistro: fecha,
        });
      });
    },
    [clase, fecha],
  );

  const iconTipo = (tipo: string | null) => {
    if (!tipo) return <FileText className="h-4 w-4 text-gray-400" />;
    if (tipo.includes("pdf")) return <FileText className="h-4 w-4 text-red-500" />;
    if (tipo.includes("video")) return <BookOpen className="h-4 w-4 text-violet-500" />;
    return <FileText className="h-4 w-4 text-gray-400" />;
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl dark:bg-gray-900 sm:max-w-sm">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex-1 min-w-0">
            <p className="truncate text-base font-bold text-text-primary dark:text-white">
              {asignaturaNombre}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-text-secondary dark:text-gray-400">
              <span>{diaNombre}</span>
              {horaInicio && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {horaInicio}{horaFin ? `–${horaFin}` : ""}
                </span>
              )}
              {sala && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {sala}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Cerrar panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading && (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!loading && clase === null && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <Clock className="h-10 w-10 text-gray-300 dark:text-gray-700" />
            <p className="text-sm font-semibold text-text-primary dark:text-white">Sin clase este día</p>
            <p className="text-xs text-text-secondary dark:text-gray-400">
              No hay clase registrada para esta asignatura en esta fecha. Contacta a administración para generar las clases desde los bloques horarios.
            </p>
          </div>
        )}

        {!loading && clase && (
          <div className="flex flex-col gap-0 divide-y divide-gray-100 dark:divide-gray-800">
            {/* Asistencia */}
            <section className="px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  Asistencia
                </h2>
                <QrAsistenciaButton
                  claseId={clase.id}
                  claseNombre={`Sesión ${clase.numeroSesion} – ${clase.titulo}`}
                />
              </div>

              {clase.alumnos.length === 0 ? (
                <p className="text-xs text-text-secondary dark:text-gray-400">Sin alumnos matriculados.</p>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-800">
                  {clase.alumnos.map((alumno) => {
                    const estadoActual = estadosLocales[alumno.matriculaId] ?? null;
                    return (
                      <div key={alumno.matriculaId} className="flex flex-col gap-2 px-3 py-2.5">
                        <p className="text-sm font-medium text-text-primary dark:text-white">
                          {alumno.alumnoApellido}, {alumno.alumnoNombre}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {(["presente", "ausente", "tardanza", "justificado"] as const).map((est) => {
                            const cfg = ESTADO_CONFIG[est];
                            const active = estadoActual === est;
                            return (
                              <button
                                key={est}
                                type="button"
                                onClick={() => marcar(alumno.matriculaId, est)}
                                disabled={pendiente}
                                className={[
                                  "h-8 rounded-lg border px-2.5 text-xs font-semibold transition-all active:scale-95 disabled:opacity-60",
                                  active ? cfg.activBtn : cfg.btn,
                                ].join(" ")}
                              >
                                {cfg.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Material */}
            <section className="px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  Material
                </h2>
                <button
                  type="button"
                  onClick={() => setShowMaterialForm((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Subir
                </button>
              </div>

              {showMaterialForm && (
                <form
                  action={subirMaterialFormAction}
                  encType="multipart/form-data"
                  className="space-y-2 rounded-xl border border-dashed border-primary/30 p-3"
                >
                  <input type="hidden" name="asignaturaId" value={asignaturaId} />
                  <input type="hidden" name="claseId" value={clase.id} />
                  <input
                    name="nombre"
                    placeholder="Nombre del material"
                    required
                    maxLength={200}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <textarea
                    name="descripcion"
                    placeholder="Descripción (opcional)"
                    rows={2}
                    maxLength={500}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <input
                    name="archivo"
                    type="file"
                    required
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv,.mp4,.webm,.zip"
                    className="w-full text-sm text-text-secondary file:mr-2 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary"
                  />
                  <button
                    type="submit"
                    className="h-9 w-full rounded-lg bg-primary text-sm font-semibold text-white hover:bg-primary-dark"
                  >
                    Subir archivo
                  </button>
                </form>
              )}

              {clase.materiales.length === 0 && !showMaterialForm ? (
                <p className="text-xs text-text-secondary dark:text-gray-400">Sin material para esta clase aún.</p>
              ) : (
                <div className="space-y-1.5">
                  {clase.materiales.map((m) => (
                    <a
                      key={m.id}
                      href={`/api/files/download/${m.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 hover:border-primary/30 hover:bg-primary/5 dark:border-gray-800 dark:bg-gray-800/50 dark:hover:border-primary/40"
                    >
                      {iconTipo(m.tipo)}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary dark:text-white">{m.nombre}</p>
                        {m.descripcion && (
                          <p className="truncate text-xs text-text-secondary dark:text-gray-400">{m.descripcion}</p>
                        )}
                      </div>
                      {m.tamanioBytes && (
                        <span className="shrink-0 text-xs text-text-muted dark:text-gray-500">
                          {(m.tamanioBytes / 1024).toFixed(0)} KB
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </section>

            {/* Pruebas */}
            <section className="px-5 py-4">
              <Link
                href={pruebasHref}
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 hover:border-primary/30 hover:bg-primary/5 dark:border-gray-800 dark:bg-gray-800/50"
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="h-4 w-4 text-violet-500" />
                  <span className="text-sm font-semibold text-text-primary dark:text-white">Ir a Pruebas</span>
                </div>
                <ChevronRight className="h-4 w-4 text-text-secondary dark:text-gray-400" />
              </Link>
            </section>
          </div>
        )}
      </aside>
    </>
  );
}
```

- [ ] **Step 5.2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "PanelClase"
```
Esperado: sin errores.

- [ ] **Step 5.3: Commit**

```bash
git add src/components/docente/PanelClase.tsx src/actions/docente-calendario.ts
git commit -m "feat(docente): agrega PanelClase drawer con asistencia, material y link pruebas"
```

---

## Task 6: Componente CalendarioSemanalDocente

**Files:**
- Create: `src/components/docente/CalendarioSemanalDocente.tsx`

- [ ] **Step 6.1: Crear el componente**

```typescript
"use client";

import { useMemo, useState } from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";

import type { HorarioBloque } from "@/components/shared/WeeklyScheduleGrid";
import { PanelClase } from "./PanelClase";
import { normalizarTextoVisible } from "@/lib/displayText";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DIAS_CORTO = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const COLORES_BG = [
  "bg-purple-100 border-purple-300 text-purple-900 dark:bg-purple-950/60 dark:border-purple-700 dark:text-purple-100",
  "bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-100",
  "bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-700 dark:text-emerald-100",
  "bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950/60 dark:border-amber-700 dark:text-amber-100",
  "bg-rose-100 border-rose-300 text-rose-900 dark:bg-rose-950/60 dark:border-rose-700 dark:text-rose-100",
  "bg-cyan-100 border-cyan-300 text-cyan-900 dark:bg-cyan-950/60 dark:border-cyan-700 dark:text-cyan-100",
];

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDiaMes(date: Date): string {
  return new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long" }).format(date);
}

type BloqueSeleccionado = {
  asignaturaId: string;
  asignaturaNombre: string;
  fecha: string;
  diaNombre: string;
  horaInicio: string | null;
  horaFin: string | null;
  sala: string | null;
};

type Props = {
  bloques: HorarioBloque[];
};

export function CalendarioSemanalDocente({ bloques }: Props) {
  const [semanaBase, setSemanaBase] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [panelAbierto, setPanelAbierto] = useState<BloqueSeleccionado | null>(null);

  const nombresUnicos = useMemo(
    () => [...new Set(bloques.map((b) => b.asignaturaNombre))],
    [bloques],
  );

  const colorPara = (nombre: string) =>
    COLORES_BG[nombresUnicos.indexOf(nombre) % COLORES_BG.length] ?? COLORES_BG[0];

  // Días de la semana actual
  const diasSemana = useMemo(
    () => Array.from({ length: 6 }, (_, i) => addDays(semanaBase, i)),
    [semanaBase],
  );

  const hoy = toIso(new Date());

  const bloquesDelDia = (diaSemana: number) =>
    bloques
      .filter((b) => b.diaSemana === diaSemana)
      .sort((a, b) => (a.horaInicio ?? "").localeCompare(b.horaInicio ?? ""));

  const semanaLabel = useMemo(() => {
    const inicio = diasSemana[0];
    const fin = diasSemana[5];
    const fmt = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short" });
    return `${fmt.format(inicio)} – ${fmt.format(fin)} de ${inicio.getFullYear()}`;
  }, [diasSemana]);

  const irSemana = (delta: number) => {
    setSemanaBase((prev) => addDays(prev, delta * 7));
  };

  const abrirPanel = (bloque: HorarioBloque, fecha: Date) => {
    setPanelAbierto({
      asignaturaId: bloque.asignaturaId,
      asignaturaNombre: bloque.asignaturaNombre,
      fecha: toIso(fecha),
      diaNombre: formatDiaMes(fecha),
      horaInicio: bloque.horaInicio ? String(bloque.horaInicio).slice(0, 5) : null,
      horaFin: bloque.horaFin ? String(bloque.horaFin).slice(0, 5) : null,
      sala: bloque.sala ?? null,
    });
  };

  if (bloques.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
        <p className="text-base font-semibold text-text-primary dark:text-white">Sin horario configurado</p>
        <p className="max-w-sm text-sm text-text-secondary dark:text-gray-400">
          Tu horario semanal aún no está configurado. Contacta a administración para que asignen tus bloques horarios.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Controles de semana */}
      <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <button
          type="button"
          onClick={() => irSemana(-1)}
          className="rounded-lg p-2 text-text-secondary hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Semana anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-text-primary dark:text-white">{semanaLabel}</span>
        <button
          type="button"
          onClick={() => irSemana(1)}
          className="rounded-lg p-2 text-text-secondary hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Semana siguiente"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Vista desktop: grilla Lun-Sáb */}
      <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 md:block">
        <div className="grid grid-cols-6 border-b border-gray-100 dark:border-gray-800">
          {diasSemana.map((dia, i) => {
            const iso = toIso(dia);
            const esHoy = iso === hoy;
            return (
              <div
                key={i}
                className={[
                  "px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide",
                  esHoy
                    ? "bg-primary/5 text-primary dark:bg-primary/10 dark:text-primary-light"
                    : "text-text-secondary dark:text-gray-400",
                ].join(" ")}
              >
                <span className="block">{DIAS_CORTO[i]}</span>
                <span className={[
                  "mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold",
                  esHoy ? "bg-primary text-white" : "text-text-primary dark:text-white",
                ].join(" ")}>
                  {dia.getDate()}
                </span>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-6 divide-x divide-gray-100 dark:divide-gray-800">
          {diasSemana.map((dia, i) => {
            const bloquesHoy = bloquesDelDia(i); // 0=lun
            const iso = toIso(dia);
            const esHoy = iso === hoy;
            return (
              <div
                key={i}
                className={[
                  "min-h-[120px] p-2 space-y-1.5",
                  esHoy ? "bg-primary/5 dark:bg-primary/5" : "",
                ].join(" ")}
              >
                {bloquesHoy.map((bloque) => (
                  <button
                    key={bloque.id}
                    type="button"
                    onClick={() => abrirPanel(bloque, dia)}
                    className={[
                      "w-full rounded-xl border p-2 text-left text-xs font-semibold transition-all hover:opacity-80 active:scale-[0.98]",
                      colorPara(bloque.asignaturaNombre),
                    ].join(" ")}
                  >
                    <span className="block truncate">{normalizarTextoVisible(bloque.asignaturaNombre)}</span>
                    {bloque.horaInicio && (
                      <span className="mt-0.5 block font-normal opacity-80">
                        {String(bloque.horaInicio).slice(0, 5)}
                        {bloque.horaFin ? `–${String(bloque.horaFin).slice(0, 5)}` : ""}
                      </span>
                    )}
                    {bloque.sala && (
                      <span className="mt-0.5 block font-normal opacity-70">{bloque.sala}</span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Vista mobile: lista por día */}
      <div className="md:hidden space-y-2">
        {diasSemana.map((dia, i) => {
          const bloquesHoy = bloquesDelDia(i);
          const iso = toIso(dia);
          const esHoy = iso === hoy;
          if (bloquesHoy.length === 0) return null;
          return (
            <div
              key={i}
              className={[
                "rounded-2xl border bg-white dark:bg-gray-900",
                esHoy ? "border-primary/30 dark:border-primary/40" : "border-gray-200 dark:border-gray-800",
              ].join(" ")}
            >
              <div className={[
                "px-4 py-2.5 text-xs font-bold uppercase tracking-wide",
                esHoy ? "text-primary dark:text-primary-light" : "text-text-secondary dark:text-gray-400",
              ].join(" ")}>
                {DIAS[i]} {dia.getDate()}
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {bloquesHoy.map((bloque) => (
                  <button
                    key={bloque.id}
                    type="button"
                    onClick={() => abrirPanel(bloque, dia)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <span className={[
                      "h-9 w-1.5 shrink-0 rounded-full",
                      colorPara(bloque.asignaturaNombre).split(" ")[0]?.replace("bg-", "bg-").replace("100", "400") ?? "bg-gray-400",
                    ].join(" ")} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary dark:text-white">
                        {normalizarTextoVisible(bloque.asignaturaNombre)}
                      </p>
                      {bloque.horaInicio && (
                        <p className="text-xs text-text-secondary dark:text-gray-400">
                          {String(bloque.horaInicio).slice(0, 5)}
                          {bloque.horaFin ? `–${String(bloque.horaFin).slice(0, 5)}` : ""}
                          {bloque.sala ? ` · ${bloque.sala}` : ""}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary dark:text-gray-500" />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Panel lateral */}
      {panelAbierto && (
        <PanelClase
          asignaturaId={panelAbierto.asignaturaId}
          asignaturaNombre={panelAbierto.asignaturaNombre}
          fecha={panelAbierto.fecha}
          diaNombre={panelAbierto.diaNombre}
          horaInicio={panelAbierto.horaInicio}
          horaFin={panelAbierto.horaFin}
          sala={panelAbierto.sala}
          onClose={() => setPanelAbierto(null)}
          pruebasHref={`/docente/pruebas`}
        />
      )}
    </>
  );
}
```

- [ ] **Step 6.2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "CalendarioSemanalDocente"
```
Esperado: sin errores.

- [ ] **Step 6.3: Commit**

```bash
git add src/components/docente/CalendarioSemanalDocente.tsx
git commit -m "feat(docente): agrega CalendarioSemanalDocente con navegación semanal y bloques interactivos"
```

---

## Task 7: Integrar CalendarioSemanalDocente en `/docente/asignaturas`

**Files:**
- Modify: `src/app/(roles)/docente/asignaturas/page.tsx`

- [ ] **Step 7.1: Reemplazar el body de la página**

Después de hacer la limpieza del Task 3, el page debe quedar simple:

```typescript
import { obtenerHorarioDocente } from "@/actions/horarios";
import { listarAsignaturasDocente } from "@/actions/docente";
import { CalendarioSemanalDocente } from "@/components/docente/CalendarioSemanalDocente";
import { RouteStateToast } from "@/components/shared/RouteStateToast";

export const metadata = { title: "Mis Asignaturas" };

export default async function DocenteAsignaturasPage({
  searchParams,
}: {
  searchParams?: Promise<{ state?: string }>;
}) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string }));
  const bloques = await obtenerHorarioDocente();

  return (
    <section className="space-y-5">
      <RouteStateToast state={params.state} map={STATUS_MAP} />

      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Mis Asignaturas
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Toca cualquier bloque para pasar asistencia, subir material o activar pruebas.
        </p>
      </header>

      <CalendarioSemanalDocente bloques={bloques} />
    </section>
  );
}
```

Mantener solo las entradas de `STATUS_MAP` relevantes (asistencia, material — los de notas/observaciones pueden quedar para no romper redirects históricos).

- [ ] **Step 7.2: Verificar tipos y build**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Esperado: 0 errores.

- [ ] **Step 7.3: Commit**

```bash
git add src/app/\(roles\)/docente/asignaturas/page.tsx
git commit -m "feat(docente/asignaturas): reemplaza scroll monster por calendario semanal interactivo"
```

---

## Task 8: Agregar `descripcion` a materiales (form de PanelClase)

El form de `PanelClase` envía un campo `descripcion` que la action `subirMaterialFormAction` debe recibir.

**Files:**
- Modify: `src/actions/material.ts`

- [ ] **Step 8.1: Verificar si subirMaterialFormAction ya lee `descripcion`**

```bash
grep -n "descripcion" src/actions/material.ts | head -10
```

Si no existe, agregar en `subirMaterialFormAction` la lectura del campo:
```typescript
const descripcion = getStringField(formData, "descripcion") || null;
```
Y pasarla al insert de BD si el schema lo soporta. Si el campo no existe en schema, este task se puede omitir (el campo se ignora silenciosamente).

- [ ] **Step 8.2: Verificar schema**

```bash
grep -n "descripcion" src/db/schema.ts | head -5
```

Si `materiales.descripcion` existe en el schema, agregar al insert. Si no, omitir este task.

- [ ] **Step 8.3: Commit (solo si hay cambio)**

```bash
git add src/actions/material.ts
git commit -m "feat(material): lee campo descripcion en subirMaterialFormAction"
```

---

## Task 9: Mejora `/docente/horario` — colores por asignatura

**Files:**
- Modify: `src/components/shared/WeeklyScheduleGrid.tsx`

- [ ] **Step 9.1: Verificar colores actuales**

El componente ya tiene `COLORES` y `colorParaAsignatura`. Verificar que se aplica correctamente en el render de cada bloque. Si los bloques ya usan `colorPara...`, este task es verificación.

```bash
grep -n "colorPara\|COLORES\[" src/components/shared/WeeklyScheduleGrid.tsx | head -10
```

- [ ] **Step 9.2: Mejorar responsive mobile**

Buscar donde se renderiza la grilla en mobile. Si usa `overflow-x-auto` en móvil, envolver en una alternativa de lista vertical similar a `CalendarioSemanalDocente`:

Si hay un `<div className="overflow-x-auto">` que envuelve la tabla, agregar una vista alternativa para mobile con `hidden md:block` en la tabla y `md:hidden` en la lista.

Si la grilla ya es responsive, marcar como completado.

- [ ] **Step 9.3: Commit**

```bash
git add src/components/shared/WeeklyScheduleGrid.tsx
git commit -m "feat(horario): mejora responsive y colores por asignatura en WeeklyScheduleGrid"
```

---

## Task 10: Build y validación final

- [ ] **Step 10.1: Type check completo**

```bash
npx tsc --noEmit 2>&1
```
Esperado: 0 errores.

- [ ] **Step 10.2: Lint**

```bash
npm run lint 2>&1 | head -40
```
Esperado: 0 errores (warnings aceptables).

- [ ] **Step 10.3: Build local**

```bash
npm run build 2>&1 | tail -30
```
Esperado: compilación exitosa.

- [ ] **Step 10.4: Commit final de validación**

```bash
git add -A
git commit -m "chore: valida build rediseño módulo docente"
```

- [ ] **Step 10.5: Push a GitHub**

```bash
git push
```

- [ ] **Step 10.6: Deploy en VPS**

Ejecutar en tu terminal local:
```bash
sshpass -p 'TU_PASSWORD' ssh impulsate@104.248.3.67 \
  'cd /home/impulsate/intranet-otec && git pull && ~/.local/share/pnpm/pnpm build && pm2 restart otec --update-env'
```

---

## Checklist de QA post-deploy

- [ ] `/docente/asistencia` — marcar alumno presente → botón queda activo, cambio persiste al recargar
- [ ] `/docente/asistencia` — tab "Tarjetas de Asistencia" aparece y muestra datos
- [ ] `/admin/clases` — sin filtro de periodo → aparecen secciones de todos los periodos
- [ ] `/docente/asignaturas` — muestra grilla semanal con bloques coloreados
- [ ] `/docente/asignaturas` — clicar bloque → panel lateral se abre con asistencia y material
- [ ] Panel → subir archivo → material aparece listado en el panel
- [ ] Panel → "Ir a Pruebas" → redirige a `/docente/pruebas`
- [ ] Mobile: `/docente/asignaturas` muestra lista de días con clases del día
- [ ] Estado vacío: docente sin bloques → mensaje claro
- [ ] `/docente/horario` — bloques con colores distintos por asignatura
