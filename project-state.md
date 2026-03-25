# project-state.md

## Document governance

- Fuente de verdad técnica vigente: `project-state.md`.
- Bitácora histórica: `PROGRESO_ITERACIONES.md`.
- Requerimientos extendidos/históricos: `Requerimientos.txt`.
- Orden documental oficial: `ORDEN_DOCUMENTAL.md`.

## Stack

- Next.js 15.5.14 (App Router) + TypeScript (strict)
- PostgreSQL 16
- Drizzle ORM + Drizzle Kit
- Auth.js v5 beta (`next-auth`)
- Tailwind CSS v4 + PostCSS plugin v4

## Fixed versions

- Next.js: `15.5.14`
- eslint-config-next: `15.5.14`
- Auth.js (`next-auth`): `5.0.0-beta.30`
- Tailwind CSS: `4.2.1`
- `@tailwindcss/postcss`: `4.2.1`
- bcrypt cost factor: 12
- Timezone operativa: America/Santiago (`timestamp` con `withTimezone: true`)

## Active patterns

- Arquitectura por dominio siguiendo baseline v3
- Inmutabilidad de negocio: prohibido `DELETE` (soft-delete/estado)
- Sin `onDelete: 'cascade'` en relaciones
- Filtro obligatorio de activos en entidades con soft-delete (`activo()`)
- Protección por rol en prefijos `/admin`, `/docente`, `/alumno`
- `inputMode` obligatorio en todos los `<input>`
- `100dvh` para layouts (vía `h-screen` / `min-h-screen`)
- Threat modeling por cruce de frontera + test de seguridad por vector
- Observabilidad mínima: JSON logs + `correlationId` + p50/p95/p99 + alertas
- Quality gate UI/UX en CI con reglas de accesibilidad/interacción

## Active skills

- `vercel-labs/agent-skills@web-design-guidelines` (activo)
- `anthropics/skills@frontend-design` (activo)
- `vercel-labs/skills@find-skills` (discovery incremental)
- `obra/superpowers` (metodología de entrega por partes)

## Active dependencies

- Runtime (root): `next`, `react`, `react-dom`, `next-auth`, `drizzle-orm`, `pg`, `bcryptjs`, `isomorphic-dompurify`, `validator`, `next-themes`, `react-hook-form`, `@hookform/resolvers`, `zod`, `swr`, `@radix-ui/react-slot`, `class-variance-authority`, `clsx`, `tailwind-merge`, `sonner`, `exceljs@4.4.0`
- Runtime (otec/): `next`, `react`, `react-dom`, `next-auth`, `drizzle-orm`, `pg`, `bcryptjs`, `isomorphic-dompurify`, `validator`, `next-themes`, `react-hook-form`, `@hookform/resolvers`, `zod`, `swr`, `@radix-ui/react-slot`, `class-variance-authority`, `clsx`, `tailwind-merge`, `sonner`, `@react-pdf/renderer@4.3.2`
- Dev: `typescript`, `eslint`, `eslint-config-next`, `drizzle-kit`, `tailwindcss`, `@tailwindcss/postcss`, `postcss`, `@types/node`, `@types/react`, `@types/react-dom`, `@types/pg`, `@types/bcryptjs`, `@types/validator`

## Completed parts

1. [Iteración 0] Análisis integral de `Requerimientos.txt` y baseline v3.
2. [Iteración 1] Definición ejecutable del Punto 4 en `CAPA_4_SEGURIDAD_UIUX_MARZO_2026.md`.
3. [Iteración 2] Migración frontend a Tailwind CSS v4.
4. [Iteración 3] Limpieza de artefactos legacy en VPS (con backup, sin tocar DNS en cleanup de intranet).
5. [Iteración 4] [4.1/4] baseline-hardening (headers, rate-limit, sanitize/cors/audit, DB base).
6. [Iteración 5] [4.2/4] authz-depth (roles/ownership centralizados + endpoint protegido de archivos).
7. [Iteración 6] [4.3/4] observability-core (`correlationId`, logs JSON, métricas y alertas base).
8. [Iteración 7] [4.4/4] quality gate UI/UX + suite crítica de security tests + workflows CI.
9. [Iteración 8] Auth backend base (Auth.js v5 providers `alumno-rut` y `staff-credentials`, callbacks JWT/session, auditoría de login, cookies de sesión strict y utilidades RUT).
10. [Iteración 9] Login UI unificado en `/login` (tabs alumno/staff, `RutInput` con validación en tiempo real, manejo de errores) + ajuste middleware para dejar pública la ruta `/api/auth/*`.
11. [Iteración 10] Auditoría y ajuste de contraste UI en login (evitar `text-muted` sobre fondos claros y reforzar legibilidad de mensajes de estado/error).
12. [Iteración 11] Shell por roles completado (`(roles)/layout`, `Sidebar`, `Topbar`, placeholders por rol y subruta de asignaturas) + integración global de `next-themes`.
13. [Iteración 12] Infraestructura DB completada para Fase 1 (`docker-compose.yml`, `drizzle.config.ts`, schema extendido, migración SQL generada y scaffold inicial `src/actions`).
14. [Iteración 13] Hardening de middleware para rate-limit interno en entorno con reverse proxy TLS (`INTERNAL_API_BASE_URL` + degradación controlada ante fallo interno) y validación pública de `/login` con `HTTP 200`.
15. [Iteración 14] Corrección de redirecciones/host en proxy (`AUTH_URL` + origin externo en middleware + `trustHost`), ajuste CSP para scripts inline de Next.js, lectura de cookie segura en middleware (`secureCookie`) y habilitación temporal de cuentas de emergencia (superadmin/docente/alumno) con validación de redirects por rol en dominio público.
16. [Iteración 15] Plan de cierre funcional 100% por partes atómicas, priorizando UX dark mode/navbar + operación admin con enfoque security-first.
17. [Iteración 16] Implementación operativa admin segura: CRUD docente/alumno (create + soft-delete), creación de asignaturas, asignación de docente, matrículas por asignatura, creación de clases y mejora UX shell (topbar/sidebar/dark mode) con validaciones defensivas y pruebas de seguridad de inputs.
18. [Iteración 18] Buscador admin por RUT en dashboard con historial académico por rol (alumno/docente), métricas operativas (asignaturas históricas, cursos impartidos, material cargado, estudiantes por asignatura) y obligatoriedad de RUT para alta/edición de docentes.
19. [Iteración 19] Despliegue VPS de búsqueda por RUT + smoke E2E autenticado (admin) para alumno/docente y correcciones de build (typing estricto + sanitización server-safe sin `isomorphic-dompurify` en `sanitizeText`).
20. [Iteración 20] Certificados alumno implementados end-to-end en baseline actual: emisión segura por matrícula/tipo, snapshot con firmas, plantilla visual imprimible (PDF vía impresión del navegador), QR de verificación (data URL), ruta pública `/verificar/[codigo]`, correo transaccional opcional por API y navegación dedicada en `/alumno/certificados`.
21. [Iteración 21] Escalabilidad admin aplicada: paginación server-side (20 por página) en alumnos/docentes/asignaturas/matrículas/clases, combobox de búsqueda para matrícula (alumno + asignatura), edición de clases en modal centrado con botón lápiz por fila y refuerzo de contraste WCAG en badges de estado.
22. [Iteración 22] Cierre de calidad y testability local: `quality:gate`, `lint`, `tsc`, `security:test` y `build` en verde; aislamiento de ESLint local (`root: true`) y corrección de runtime de tests de seguridad para alias `@/lib/*`; endurecimiento de `rutValue` para rechazar payloads HTML antes de normalización.
23. [Iteración 23] Cierre de brechas operativas solicitadas: eliminación docente de notas/observaciones con ownership check y auditoría, botones de borrado en tablas históricas de docente, unificación de logo móvil con login/sidebar, y ajuste de campo de búsqueda admin para credenciales extranjeras (`EXT-*`).
24. [Iteración 24] Plantillas de encuestas requeridas implementadas: creación rápida en admin de “Evaluacion Docente y OTEC” (escala 1-7) y “Test de Estilos de Aprendizaje” (escala 1-5), render de respuesta con cuadrados numéricos en alumno, cálculo de nota/promedio para respuestas Likert y pruebas de seguridad dedicadas para parser de escala.
25. [Iteración 25] Ciclo obligatorio automatizado: generación automática de encuestas obligatorias al pasar asignaturas a estado `finalizado`, toggle admin para habilitar/deshabilitar publicación de encuestas, enforcement de intentos máximos por RUT en encuestas obligatorias y pruebas de seguridad de whitelist para títulos de encuestas en ciclo de vida.
26. [Iteración 26] Cierre de auditoría de eliminación en admin/docente: cobertura UI de eliminación para clases en admin (móvil/escritorio), `formAction` con estado de retorno y filtrado de soft-delete (`activo(clases)`) en listados y conteos para evitar persistencia visual de clases eliminadas.
27. [Iteración 27] Certificados PDF programáticos: migración en `otec/` a `@react-pdf/renderer` con endpoint seguro de descarga (`/api/certificados/[codigo]/pdf`) restringido a `admin`, validación estricta de código de certificado, sanitización de snapshot JSON y botón de descarga PDF en la gestión admin de certificados.
28. [Iteración 28] Cierre de deuda supply-chain en root+otec: actualización de `next`/`eslint-config-next` a `15.5.14`, reemplazo de `xlsx` por `exceljs@4.4.0` en importaciones de alumnos/notas, parser seguro central de planillas (`src/lib/spreadsheet.ts`) con mitigación de prototype pollution y test de seguridad dedicado.

## Pending parts

- Sin pendientes activos de seguridad conocidos en auditoría local al cierre de esta iteración.

## Mitigated vulnerabilities

- XSS/inyección de entrada: sanitización base + normalización/validación de RUT.
- BAC/IDOR: control de rol por prefijo y ownership fail-closed en rutas críticas.
- Brute force/base abuse: rate-limit central antes de auth en middleware.
- Brute force en callbacks Auth.js: control dedicado de `/api/auth/callback/*` (5/min) para limitar intentos de login sin degradar visualización de `/login`.
- Riesgo de caída por mismatch TLS interno (`https://127.0.0.1`): mitigado con `INTERNAL_API_BASE_URL` + degradación controlada con observabilidad.
- Open redirect / host poisoning en proxy: mitigado con resolución explícita de origen público y callback `redirect` con mismo origen (`AUTH_URL`/`NEXT_PUBLIC_BASE_URL`).
- Pérdida de sesión en proxy HTTPS por cookie segura no leída: mitigado con `getToken(... secureCookie)` condicionado por `x-forwarded-proto`/`AUTH_URL`.
- Falta de trazabilidad: auditoría (`audit_logs`) + `correlationId` + logging estructurado.
- Exposición operacional de legacy: decommission de activos no vigentes con respaldos.
- Elevación de privilegios en operaciones administrativas: mitigada con `requireActionActor` (`admin` obligatorio) en listados y mutaciones críticas.
- Input abuse en flujos admin (usuarios/asignaturas/matrículas/clases): mitigado con schemas Zod estrictos + validación de dominio (RUT, password fuerte, URL de video whitelist HTTPS).
- Input abuse en búsqueda administrativa por RUT: mitigado con `buscarPersonaPorRutInputSchema` + normalización/validación estricta + consultas parametrizadas Drizzle.
- Build/runtime instability por sanitización isomórfica en server build: mitigada reemplazando `sanitizeText` por sanitización determinista server-safe sin dependencia de `isomorphic-dompurify` en render estático.
- Falsificación de certificados: mitigada con `codigoUnico` + ruta pública de verificación y estado de validez por certificado.
- Exposición de certificados entre alumnos (IDOR): mitigada con validación de ownership al acceder a `/alumno/certificados/[codigo]`.
- Input abuse en combobox admin (búsquedas de alumno/asignatura): mitigado con `comboboxSearchQuerySchema` (longitud + caracteres permitidos) y consultas limitadas (`limit 15`) en acciones server.
- Riesgo de degradación por listados masivos en admin: mitigado con paginación server-side fija (`PAGE_SIZE=20`) y conteos dedicados por módulo.
- Bypass por payload HTML en entrada de RUT (normalización permisiva): mitigado con rechazo explícito de `<`/`>` antes de `normalizarRut` en `rutValue`.
- Inestabilidad de ejecución en suite de seguridad por alias `@/lib/*` en build CommonJS temporal: mitigada con resolución controlada del alias en script `security:test`.
- Inconsistencia de credenciales extranjeras en búsqueda/login y visualización: mitigada con aceptación de formato `EXT-*`, normalización defensiva y render seguro de identificadores extranjeros.
- Manipulación de payload de escala y respuestas fuera de rango en encuestas: mitigada con parser estricto de opciones Likert, validación de rangos y test de seguridad dedicado (`security-tests/evaluaciones.security.test.ts`).
- Abuso de intentos en encuestas obligatorias: mitigado con enforcement por identidad RUT (no solo matrícula) para cálculo de intentos máximos.
- Manipulación de estado de publicación en encuestas: mitigada con toggle de publicación restringido a rol `admin` y auditoría de cambios de estado.
- Persistencia visual de entidades soft-delete en clases admin: mitigada con filtro `activo(clases)` en listados/conteos y cobertura UI de eliminación con `eliminarClaseFormAction`.
- Descarga no autorizada de certificados PDF: mitigada con control backend por sesión (`admin` obligatorio) en endpoint de descarga.
- Inyección/manipulación de parámetro de código de certificado: mitigada con validación estricta UUID + sanitización defensiva (`sanitizeCertificadoText`) antes de consulta.
- Prototype pollution / JSON abuse en `datosSnapshot` de certificados: mitigada con coerción a objeto plano y extracción sanitizada de campos (`coerceCertificadoSnapshot`).
- CVEs conocidos en `next@14.2.35` (`GHSA-h25m-26qc-wcjf`, `GHSA-9g9p-9gw9-jx7f`, `GHSA-ggv3-7p47-pfv8`, `GHSA-3x4c-7xq6-9pq8`): mitigados mediante upgrade a `next@15.5.14` + `eslint-config-next@15.5.14`.
- Supply-chain risk por `xlsx` sin fix de severidad alta: mitigado con remoción de dependencia y migración a `exceljs@4.4.0`.
- Prototype pollution en carga de planillas (headers maliciosos): mitigado con saneamiento estricto de encabezados (`__proto__`, `constructor`, `prototype`) y objetos `Object.create(null)` en parser de planillas.
- Input abuse por tipo de archivo no permitido en importaciones internas: mitigado con rechazo explícito de extensiones no soportadas en parser central (`.csv`/`.xlsx` únicamente).

## Non-negotiable decisions

- WARNING DECISION CHANGE: Tailwind v3 reemplazado por Tailwind v4 por instrucción explícita del usuario.
- WARNING DECISION CHANGE: módulo finanzas descartado por decisión de negocio; pagos se gestionan presencialmente con indicador de estado `pagado/no pagado` en matrículas.
- Nunca exponer `RUT_SALT` al cliente.
- Nunca borrar físicamente registros de negocio.
- `rateLimit` se ejecuta antes de autenticación en middleware.
- Auditoría obligatoria para acciones críticas (`audit_logs`).
- CORS restrictivo al origen oficial.
- Sanitización obligatoria de texto, rutas y URLs de video.
- Baseline de seguridad/observabilidad según `CAPA_4_SEGURIDAD_UIUX_MARZO_2026.md`.
- En despliegues detrás de proxy TLS, `INTERNAL_API_BASE_URL` debe apuntar al origen interno HTTP real del proceso (`127.0.0.1:<puerto>`).
- Cuentas de emergencia solo para contingencia sin DB: requieren `ENABLE_EMERGENCY_AUTH=true` y deben deshabilitarse al completar provisión de PostgreSQL.
- Todas las mutaciones de operación admin deben validar rol de sesión en backend (defense-in-depth, no solo protección de ruta).
- Cuando existan conflictos documentales, prevalece `project-state.md` sobre `Requerimientos.txt`.
- Paginación administrativa estándar: 20 registros por página para listados de operación.

## SBOM summary

- Lockfiles presentes: `pnpm-lock.yaml` (root) y `otec/pnpm-lock.yaml`.
- SBOM formal pendiente de exportación dedicada; estado de dependencias validado vía CI/workflow de auditoría y `pnpm audit` en pipeline.
- Auditoría local (2026-03-25): sin vulnerabilidades conocidas en root y `otec/` (`pnpm audit --prod`).
