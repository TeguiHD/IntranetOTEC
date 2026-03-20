# PROGRESO_ITERACIONES.md

## Nota de orden documental

- Estado técnico vigente: `project-state.md`.
- Jerarquía documental oficial: `ORDEN_DOCUMENTAL.md`.
- Este archivo se mantiene como bitácora histórica de iteraciones.

---

## Iteración 21 — 2026-03-18

### Objetivo
Escalar operación admin para volumen alto (1000+ alumnos/asignaturas) con paginación real, búsqueda combobox y edición de clases en modal con mejor contraste WCAG en estados.

### Estado
Completada.

### Cambios aplicados (workspace)
- Paginación admin server-side (20 por página):
	- `otec/src/components/shared/Pagination.tsx` (componente reusable responsive).
	- `otec/src/actions/usuarios.ts` (`countUsuariosPorRol`).
	- `otec/src/actions/asignaturas.ts` (`countAsignaturasAdmin`).
	- `otec/src/actions/matriculas.ts` (`countMatriculasAdmin`).
	- `otec/src/actions/clases.ts` (`countClasesAdmin`).
	- Páginas actualizadas: alumnos, docentes, asignaturas, matrículas y clases.
- Matrículas con UX escalable:
	- `otec/src/app/(roles)/admin/matriculas/AlumnoCombobox.tsx` (búsqueda incremental alumno).
	- `otec/src/app/(roles)/admin/matriculas/AsignaturaCombobox.tsx` (búsqueda incremental asignatura).
	- `otec/src/actions/asignaturas.ts` (`buscarAsignaturasAdminAction`) + validación de query.
	- `otec/src/actions/usuarios.ts` (`buscarAlumnosAction`) endurecida con schema.
- Clases con edición en modal por fila:
	- `otec/src/app/(roles)/admin/clases/ClasesTable.tsx` con botón lápiz SVG y modal centrado.
	- `otec/src/actions/clases.ts` (`editarClaseAction`, `editarClaseFormAction`) y preservación de `page` en redirects.
- WCAG/contraste de estados:
	- Badges de estado actualizados a combinaciones de alto contraste (`green/amber/red 100-800` en light y `950-200` en dark) en alumnos, docentes, matrículas y solicitudes.
- Seguridad adicional:
	- `otec/src/lib/validations/admin.ts`: `comboboxSearchQuerySchema`.
	- `otec/security-tests/admin-validations.security.test.ts`: test de inyección/oversize para búsquedas combobox.
	- `otec/src/lib/validations/admin.ts`: endurecimiento de `rutValue` para rechazar `<`/`>` antes de normalizar.
	- `otec/package.json`: `security:test` ajustado para resolver alias `@/lib/*` en runtime de tests.
	- `otec/.eslintrc.json`: `root: true` para aislar configuración local y evitar herencia del directorio padre.

### Validación
- `npx tsc --noEmit`: OK.
- `npm run quality:gate`: OK.
- `npm run lint`: OK.
- `npm run security:test`: OK (16/16).
- `npm run build`: OK.

### Resultado funcional
- Panel admin apto para datasets grandes con paginación consistente.
- Registro de matrícula más intuitivo y escalable (sin dropdown masivo).
- Edición de clases alineada a flujo operativo solicitado (lápiz por fila + modal).
- Estados visuales con contraste reforzado para cumplimiento AA/AAA práctico.

## Iteración 20 — 2026-03-15

### Objetivo
Implementar certificados alumno de forma operativa (UI/UX + seguridad + verificación pública + correo) y normalizar orden documental.

### Estado
Completada.

### Cambios aplicados (workspace)
- Flujo de certificados:
	- `otec/src/actions/certificados.ts` (emisión segura, ownership, snapshot, listado, detalle y verificación por código).
	- `otec/src/lib/certificados.ts` (tipos, firmas, URL pública, formato, QR data URL).
	- `otec/src/lib/email.ts` (envío transaccional opcional por API).
- UI/UX certificados:
	- `otec/src/app/(roles)/alumno/certificados/page.tsx` (emisión por matrícula/tipo + listado emitidos).
	- `otec/src/app/(roles)/alumno/certificados/[codigo]/page.tsx` (template con firmas, QR, nombre, fecha, curso, duración).
	- `otec/src/components/shared/CertificatePrintButton.tsx` (impresión/guardado PDF desde navegador).
	- `otec/src/app/verificar/[codigo]/page.tsx` (verificación pública sin auth).
	- `otec/src/components/shared/Sidebar.tsx` (acceso a certificados para alumno).
- Orden documental:
	- Nuevo `ORDEN_DOCUMENTAL.md`.
	- Actualización de `project-state.md` con gobernanza documental y estado real.

### Validación
- `get_errors` en archivos modificados: sin errores de compilación TypeScript.
- Nota de entorno: ejecución de `pnpm lint` / `pnpm security:test` no disponible en esta sesión por ausencia de `node` en shell remoto.

### Resultado funcional
- Certificados disponibles para alumno con emisión por tipo (`alumno_regular` / `termino_curso`).
- Verificación pública activa por código único (`/verificar/[codigo]`).
- Template de certificado con firmas, QR, nombre, fecha, curso y duración implementado.
- Correo de notificación implementado de forma opcional por API (si variables de entorno están configuradas).

### Próxima iteración propuesta
- Completar módulo docente y módulo alumno profundo (`asignaturas/[id]`, evaluaciones, notas, entregas).

## Iteración 0 — 2026-03-15

### Objetivo
Analizar `Requerimientos.txt`, consolidar una base de decisiones y preparar trazabilidad para desarrollo incremental seguro.

### Estado
Completada.

### Hallazgos clave
- El archivo contiene dos bloques de planificación (versión inicial + versión v3).
- Se adopta **v3** como baseline recomendada por ser más reciente y más completa en seguridad y operación.
- Se detectaron conflictos entre bloques (hash de RUT, headers, tabla de rate limit, alcance de soft-delete, etc.).

### Conflictos normalizados (propuesta)
- Hash login alumno: usar `bcrypt(RUT_SALT + rut + userId, 12)`.
- Security headers: `X-Frame-Options: DENY` + CSP estricta (v3).
- Rate limiting: tabla `rate_limit_log` (v3), no `login_attempts`.
- Asistencia: mantener como histórico editable por `UPDATE` de estado, sin soft-delete.

### Riesgos relevantes
- Riesgo crítico operativo: se compartieron credenciales/sesiones en texto plano fuera del repositorio.
- Acción recomendada inmediata: rotar API keys, contraseña SSH y llaves asociadas; invalidar sesiones activas.

### Checklist Fase 1
- Ítems completados: 0
- Ítems pendientes: todos
- Bloqueo actual: requiere confirmación de baseline y alcance exacto para iniciar parte 1.

### Próxima iteración propuesta
- Parte [1/N]: Bootstrap del proyecto + dependencias permitidas + base DB (`schema`, `index`, `filters`) + `docker-compose`.
- Validación: migraciones Drizzle, app levanta, conexión DB OK.

---

## Iteración 1 — 2026-03-15

### Objetivo
Definir formalmente el Punto 4 (capa de seguridad), incluyendo skill discovery, threat modeling, pruebas de seguridad obligatorias, observabilidad base y quality gate UI/UX con subagentes.

### Estado
Completada.

### Cambios aplicados
- Se creó `CAPA_4_SEGURIDAD_UIUX_MARZO_2026.md` como guía ejecutable de la capa de seguridad.
- Se incorporó PHASE 1.3 (skills) y PHASE 1.4 (threat modeling automático) con matriz completa por operación.
- Se definió suite mínima de `*.security.test.ts` (1+ test por vector).
- Se definió baseline de observabilidad: logs JSON con `correlationId`, métricas p50/p95/p99 y alertas.
- Se incluyó protocolo de calidad UI/UX para evitar resultados genéricos y aleatorios.

### Subagentes usados
- `Explore` (UI/UX blueprint): reglas de composición, anti-patrones y checklist de revisión.
- `Explore` (security hardening): trust boundaries, vectores y pruebas por vector.

### Validación de alineación
- Alineado a requerimientos v3 y restricciones de Fase 1.
- Sin instalación de nuevas dependencias fuera de fase activa.
- Se descartaron recomendaciones de subagente que chocaban con restricciones del proyecto.

### Checklist Fase 1
- Ítems completados: 0 técnicos de implementación (esta iteración fue de definición y hardening blueprint).
- Ítems pendientes: todos los de ejecución técnica.

### Próxima iteración propuesta
- Parte [1/N]: bootstrap del proyecto + dependencias permitidas + estructura base + docker postgres.
- Parte [4.1/4] del blueprint: baseline-hardening (headers, CORS, sanitize, rate limit, audit base).

---

## Iteración 2 — 2026-03-15

### Objetivo
Aplicar cambio explícito de stack frontend para usar Tailwind CSS v4.

### Estado
Completada.

### Cambios aplicados
- Dependencias actualizadas a `tailwindcss@4.2.1` y `@tailwindcss/postcss@4.2.1`.
- `postcss.config.mjs` migrado a plugin `@tailwindcss/postcss`.
- `src/app/globals.css` migrado a sintaxis v4 (`@import "tailwindcss"`) y tokens con `@theme inline`.
- Se mantuvo compatibilidad de utilidades `bg-background` / `text-foreground` vía variables CSS.

### Decisión registrada
- WARNING DECISION CHANGE: se reemplaza Tailwind v3 por Tailwind v4 por instrucción explícita del usuario.

### Checklist Fase 1
- Ítems de implementación funcional: aún pendientes.
- Estado actual: base frontend ya alineada con Tailwind 4.

### Próxima iteración propuesta
- Continuar con Fase 1 Parte [1/N] y Punto [4.1/4]: baseline-hardening (headers, CORS, sanitize, rate limit, audit base).

---

## Iteración 3 — 2026-03-15

### Objetivo
Eliminar archivos legacy de la intranet en VPS (sin tocar registros DNS) para preparar despliegue limpio de la nueva intranet.

### Estado
Completada.

### Cambios aplicados (VPS)
- Inventario de rutas `intranet/miotec_lms` en `/home/impulsate/frappe-bench`.
- Backup previo de rutas objetivo en:
	- `/home/impulsate/preupgrade-backups-20260315/decom_20260315_090221_intranet_files_cleanup`
- Eliminación de archivos:
	- `/home/impulsate/frappe-bench/sites/intranet.miotecimpulsate.cl`
	- `/home/impulsate/frappe-bench/apps/miotec_lms`
	- `/home/impulsate/frappe-bench/sites/assets/miotec_lms`
- Limpieza de configuración residual:
	- `common_site_config.json`: removido `default_site`, `serve_default_site=false`.

### Validación
- Paths objetivo marcados como `REMOVED` tras eliminación.
- DNS no modificado en esta iteración.
- Respuesta de `https://intranet.miotecimpulsate.cl`: `HTTP/2 404` (esperado tras limpieza de archivos legacy).

### Próxima iteración propuesta
- Reanudar implementación local en `otec` con Parte [4.1/4]: headers, CORS, sanitize, rate limit y audit base.

---

## Iteración 4 — 2026-03-15

### Objetivo
Implementar la subparte [4.1/4] de seguridad base en `otec`: headers, CORS, sanitize, rate limit y audit base.

### Estado
Completada.

### Cambios aplicados (workspace)
- Nuevos archivos:
	- `otec/src/db/schema.ts` (tablas `audit_logs` y `rate_limit_log` + enums)
	- `otec/src/db/index.ts` (conexión pg/drizzle reutilizable)
	- `otec/src/lib/sanitize.ts`
	- `otec/src/lib/cors.ts`
	- `otec/src/lib/rateLimit.ts`
	- `otec/src/lib/audit.ts`
	- `otec/src/app/api/internal/rate-limit/route.ts`
	- `otec/src/middleware.ts`
- Archivo modificado:
	- `otec/next.config.mjs` (security headers + CSP)

### Validación
- `pnpm lint`: OK.
- `pnpm build`: OK (compila y genera middleware + endpoint interno).
- Nota de build: warning de compatibilidad Edge relacionado a `next-auth/jwt` (no bloqueante).

### Cobertura de objetivos [4.1/4]
- Security headers aplicados globalmente.
- Rate limiting implementado antes de auth vía middleware + endpoint interno.
- Sanitización base implementada (`sanitizeText`, `sanitizePath`, `sanitizeVideoUrl`).
- Base de auditoría implementada (`registrarAudit`).
- CORS helper implementado para route handlers externos.

### Próxima iteración propuesta
- [4.2/4] `authz-depth`: validaciones de ownership por rol en acciones y rutas críticas.

---

## Iteración 5 — 2026-03-15

### Objetivo
Implementar [4.2/4] `authz-depth` sobre la base actual del proyecto.

### Estado
Completada.

### Cambios aplicados (workspace)
- Nuevos archivos:
	- `otec/src/lib/authz.ts` (policy reusable de roles + ownership, fail-closed)
	- `otec/src/lib/requestAuth.ts` (extracción de contexto auth desde token por request)
	- `otec/src/lib/sanitizePath.ts` (sanitización server-safe para rutas/URLs)
	- `otec/src/lib/storage.ts` (interfaz base para URL firmada/upload)
	- `otec/src/db/filters.ts` (`activo()` helper)
	- `otec/src/app/api/files/[...path]/route.ts` (endpoint protegido con ownership check)
- Archivos actualizados:
	- `otec/src/middleware.ts` (usa policy central para validación de rol por ruta)
	- `otec/src/db/schema.ts` (tablas base requeridas para ownership y archivos)

### Revisión por subagente
- Se ejecutó subagente `Explore` para auditoría de authz y se aplicaron ajustes:
	- Validación estricta de `ownerId` (UUID) en path.
	- Flujo explícito por bucket (`material`/`entregas`) con fail-closed.

### Validación
- `pnpm lint`: OK.
- `pnpm build`: OK.

### Resultado de seguridad
- Control de rol por prefijo consolidado en middleware.
- Control de ownership aplicado en endpoint crítico de archivos.
- Política fail-closed implementada en helpers reutilizables.

### Pendiente técnico
- Agregar runner de pruebas para ejecutar `*.security.test.ts` de forma automática (actualmente no configurado).

### Próxima iteración propuesta
- [4.3/4] `observability-core`: correlationId, logs JSON estructurados, métricas base y alertas iniciales.

---

## Iteración 6 — 2026-03-15

### Objetivo
Implementar [4.3/4] `observability-core` con trazabilidad y alertas base sin nuevas dependencias.

### Estado
Completada.

### Cambios aplicados (workspace)
- Nuevos archivos:
	- `otec/src/lib/observability/correlation.ts`
	- `otec/src/lib/observability/logger.ts`
	- `otec/src/lib/observability/metrics.ts`
	- `otec/src/app/api/internal/metrics/route.ts`
	- `.github/workflows/security-audit.yml`
- Archivos actualizados:
	- `otec/src/middleware.ts` (propagación `x-correlation-id` + registro de métricas/logs)
	- `otec/src/app/api/internal/rate-limit/route.ts` (instrumentación observability)
	- `otec/src/app/api/files/[...path]/route.ts` (instrumentación observability)
	- `otec/src/lib/audit.ts` (fallos de auditoría en log estructurado)

### Resultado técnico
- Correlation ID propagado de middleware a handlers y respuestas.
- Logs JSON estructurados con redacción de datos sensibles.
- Métricas operativas: throughput, error rate, p50/p95/p99 por endpoint.
- Alertas base en snapshot: `5xx_spike`, `auth_anomaly`, `latency_anomaly`, `critical_cve`.
- Endpoint interno de métricas protegido por secreto.
- Workflow de auditoría de dependencias para señal de CVEs en CI.

### Validación
- `pnpm lint`: OK.
- `pnpm build`: OK.

### Pendientes
- Implementar [4.4/4] `ux-security-quality-gate`.
- Agregar runner de pruebas para ejecutar `*.security.test.ts` automáticamente.

### Próxima iteración propuesta
- [4.4/4] `ux-security-quality-gate`: checklist automatizable + validaciones de accesibilidad/foco/labels/inputMode/safe-area en rutas críticas.

---

## Iteración 7 — 2026-03-15

### Objetivo
Completar [4.4/4] `ux-security-quality-gate` y cerrar pendiente de pruebas authz críticas con runner ejecutable.

### Estado
Completada.

### Cambios aplicados (workspace)
- Quality gate automatizado:
	- `otec/scripts/quality-gate.mjs`
	- Reglas activas: `no-outline-none`, `no-transition-all`, `no-div/span-onclick`, `inputMode-required`, `icon-button-aria-label`, y validación de `100dvh` + `darkMode` en `tailwind.config.ts`.
- Runner de pruebas críticas sin dependencias nuevas:
	- `otec/tsconfig.security-tests.json`
	- `otec/security-tests/authz.security.test.ts`
	- `otec/security-tests/sanitize.security.test.ts`
	- `otec/security-tests/logger.security.test.ts`
	- Scripts en `package.json`: `quality:gate`, `security:test`, `security:validate`.
- Integración CI:
	- `.github/workflows/ux-security-quality-gate.yml`.
- Hardening adicional:
	- `sanitizePath` reforzado contra traversal/encoding malicioso.
	- `sanitize.ts` alineado a implementación segura única.
	- `tailwind.config.ts` alineado a paleta requerida + `100dvh` + dark mode class.

### Validación
- `pnpm quality:gate`: OK.
- `pnpm security:test`: OK (7/7 tests pass).
- `pnpm lint`: OK.
- `pnpm build`: OK.

### Cierre de punto
- Punto 4 completo: [4.1/4], [4.2/4], [4.3/4], [4.4/4].

### Próxima iteración propuesta
- Iniciar siguiente bloque funcional de Fase 1 (auth/login/layout/roles UI) con base de seguridad ya establecida.

---

## Iteración 2 — 2026-03-15

### Objetivo
Ejecutar limpieza operativa solicitada: ajustar subdominios en DigitalOcean, eliminar entorno existente en VPS y dejar servicio principal operativo.

### Estado
Completada.

### Cambios aplicados
- DNS en DigitalOcean:
	- Eliminado registro `A` de `prueba.miotecimpulsate.cl`.
	- Conservado `intranet.miotecimpulsate.cl` apuntando al VPS.
- VPS:
	- Backup fresco de `prueba.miotecimpulsate.cl` generado y copiado a carpeta de resguardo.
	- Sitio `prueba.miotecimpulsate.cl` retirado de `frappe-bench/sites` (movido a respaldo).
	- Directorios legacy inactivos (`staging.miotecimpulsate.cl`, `lms.miotecimpulsate.cl`) archivados fuera del runtime activo.
	- `intranet.miotecimpulsate.cl` validado operativo (HTTP 200).

### Rutas de respaldo
- `/home/impulsate/preupgrade-backups-20260315/decom_20260315_085218/`
- `/home/impulsate/preupgrade-backups-20260315/decom_20260315_085303_legacy/`

### Observaciones técnicas
- `bench drop-site` no completó vía root DB por falta de credenciales root de MariaDB en el usuario remoto.
- Se aplicó decommission seguro sin downtime del sitio `intranet`.

### Riesgo / recomendación
- Rotar credenciales sensibles compartidas en conversación (SSH/API) y revocar tokens previos tras cierre de cambios.

### Próxima iteración propuesta
- Parte [1/N]: bootstrap del proyecto Next.js + dependencias Fase 1.
- Parte [4.1/4]: implementación técnica de baseline-hardening en código.

---

## Iteración 8 — 2026-03-15

### Objetivo
Implementar la parte backend de autenticación (Auth.js v5) para habilitar login real por rol antes de construir la UI de acceso y shell de navegación.

### Estado
Completada.

### Cambios aplicados (workspace)
- Archivos nuevos:
	- `otec/src/auth.ts`
	- `otec/src/app/api/auth/[...nextauth]/route.ts`
	- `otec/src/lib/rut.ts`
	- `otec/src/types/next-auth.d.ts`
	- `otec/security-tests/rut.security.test.ts`
- Configuración de auth:
	- Provider `alumno-rut`: valida RUT chileno, normaliza entrada y verifica `bcrypt.compare(RUT_SALT + rutLimpio + usuario.id, hash)`.
	- Provider `staff-credentials`: email + contraseña solo para `admin` y `docente` (rechazo explícito de `alumno`).
	- Callbacks JWT/session con `token.id`, `token.rol`, `session.user.id`, `session.user.rol`.
	- Cookies de sesión endurecidas (`httpOnly`, `sameSite: strict`, `secure` en producción).
- Auditoría de login:
	- Registro `login_ok` / `login_fail` en `audit_logs` con `metodo`, `motivo`, IP y user-agent.
- Seguridad por input:
	- Utilidades de `RUT` con normalización, formato y validación módulo 11.

### Validación
- `pnpm security:test`: OK (10/10 tests pass).
- `pnpm lint`: OK.
- `pnpm build`: OK.

### Resultado de seguridad
- Vector `User input -> Injection/XSS`: mitigado mediante normalización y validación estricta de RUT + queries parametrizadas Drizzle.
- Vector `Auth/sessions -> token abuse`: mitigado con estrategia JWT controlada, expiración corta (1h), renovación (15m) y sesión/cookie strict.

### Próxima iteración propuesta
- Parte siguiente: login UI unificado en `/login` con tabs (`Alumno RUT` / `Docente-Admin`) y componente `RutInput` accesible, alineado al quality gate.

---

## Iteración 9 — 2026-03-15

### Objetivo
Implementar la experiencia de login unificada (`/login`) y completar su integración funcional con Auth.js sin regressiones de build/seguridad.

### Estado
Completada.

### Cambios aplicados (workspace)
- Archivos nuevos:
	- `otec/src/components/shared/RutInput.tsx`
	- `otec/src/app/(auth)/login/LoginView.tsx`
	- `otec/src/app/(auth)/login/page.tsx`
- Archivos actualizados:
	- `otec/src/middleware.ts`
- Implementación funcional:
	- Login tabulado con dos flujos: `Alumno (RUT)` y `Docente/Admin`.
	- Componente `RutInput` con `inputMode="numeric"`, formateo progresivo y validación módulo 11 en tiempo real.
	- Conexión real a providers Auth.js (`alumno-rut`, `staff-credentials`) con manejo de error legible.
	- Ajuste crítico en middleware: `/api/auth/*` queda público para evitar bloqueo del flujo de signin/signout.

### Validación
- `pnpm quality:gate`: OK.
- `pnpm lint`: OK.
- `pnpm build`: OK.

### Resultado de seguridad
- Vector `Auth boundary`: mitigado bloqueo involuntario de `/api/auth/*` por middleware (evita redirect-loop y fallos de login).
- Vector `User input`: `RUT` validado y normalizado en UI antes de envío al provider.

### Próxima iteración propuesta
- Parte siguiente: shell por roles (`(roles)/layout`, `Sidebar`, `Topbar`, placeholders `/admin`, `/docente`, `/alumno`) + dark mode funcional en navegación.

---

## Iteración 10 — 2026-03-15

### Objetivo
Validar contraste de color de la paleta y de la UI implementada (login), corrigiendo combinaciones de baja legibilidad.

### Estado
Completada.

### Cambios aplicados (workspace)
- Archivos actualizados:
	- `otec/src/app/(auth)/login/LoginView.tsx`
	- `otec/src/components/shared/RutInput.tsx`
- Ajustes realizados:
	- Reemplazo de `text-muted` en placeholders/hints sobre fondo claro por tonos con mayor contraste (`text-secondary`).
	- Mensajes de estado/error en login y `RutInput` pasan a tono oscuro legible, manteniendo señal visual de error por fondo/borde.

### Validación
- Cálculo objetivo de contraste WCAG de paleta:
	- PASS: `text-primary`/`text-secondary` en `bg-white` y `bg-light`.
	- FAIL detectado: `text-muted` en fondos claros.
	- FAIL detectado: `text-white` sobre `cta` (`#00C853`).
- `pnpm quality:gate`: OK.
- `pnpm lint`: OK.
- `pnpm build`: OK.

### Resultado de UX/Accesibilidad
- Se eliminó la condición de “texto claro sobre fondo claro” en la UI ya implementada (`/login`).
- Se documenta regla para próximas vistas: evitar texto blanco sobre `cta`; usar texto oscuro en fondos `cta` o ajustar uso del color.

### Próxima iteración propuesta
- Implementar shell por roles (`(roles)/layout`, `Sidebar`, `Topbar`) con validación de contraste en cada estado (default/hover/active/dark).

---

## Iteración 11 — 2026-03-15

### Objetivo
Implementar shell de navegación por rol (layout + sidebar + topbar + dashboards placeholder) y habilitar modo oscuro funcional con `next-themes`.

### Estado
Completada.

### Cambios aplicados (workspace)
- Archivos nuevos:
	- `otec/src/components/shared/ThemeProvider.tsx`
	- `otec/src/components/shared/Sidebar.tsx`
	- `otec/src/components/shared/Topbar.tsx`
	- `otec/src/components/shared/RoleShell.tsx`
	- `otec/src/app/(roles)/layout.tsx`
	- `otec/src/app/(roles)/admin/page.tsx`
	- `otec/src/app/(roles)/admin/asignaturas/page.tsx`
	- `otec/src/app/(roles)/docente/page.tsx`
	- `otec/src/app/(roles)/docente/asignaturas/page.tsx`
	- `otec/src/app/(roles)/alumno/page.tsx`
	- `otec/src/app/(roles)/alumno/asignaturas/page.tsx`
- Archivos actualizados:
	- `otec/src/app/layout.tsx` (ThemeProvider global + metadata)
	- `otec/src/app/globals.css` (dark mode por clase, compatible con next-themes)
	- `otec/src/auth.ts` (export correcto de helper `auth` callable)
- Funcionalidad entregada:
	- Layout protegido por sesión/rol en route group `(roles)`.
	- Sidebar colapsable desktop (256/64), drawer mobile con backdrop, estado persistido en `localStorage`.
	- Navegación diferenciada por rol.
	- Topbar con breadcrumb, toggle de sidebar, toggle de tema, identidad de usuario y logout.

### Validación
- `pnpm quality:gate`: OK.
- `pnpm lint`: OK.
- `pnpm build`: OK.

### Resultado UX/Accesibilidad
- Reglas de focus, contraste y controles táctiles aplicadas en shell.
- Sin anti-patrones bloqueados por quality gate (`transition-all`, `outline-none`, `div/span onClick`, etc.).

### Próxima iteración propuesta
- Cerrar pendiente infra de Fase 1: `docker-compose.yml` + completar `schema.ts` faltante + migraciones Drizzle + base de `src/actions/`.

---

## Iteración 12 — 2026-03-15

### Objetivo
Cerrar el bloque de infraestructura de datos de Fase 1: Docker local PostgreSQL, configuración Drizzle, schema completo y scaffold de `src/actions`.

### Estado
Completada con bloqueo operativo parcial en ejecución de migración.

### Cambios aplicados (workspace)
- Archivos nuevos:
	- `otec/docker-compose.yml`
	- `otec/drizzle.config.ts`
	- `otec/.env.example`
	- `otec/src/actions/_pagination.ts`
	- `otec/src/actions/auth.ts`
	- `otec/src/actions/asignaturas.ts`
	- `otec/src/actions/clases.ts`
	- `otec/src/actions/asistencia.ts`
	- `otec/src/actions/evaluaciones.ts`
	- `otec/src/actions/notas.ts`
	- `otec/src/actions/certificados.ts`
	- `otec/src/actions/finanzas.ts`
	- `otec/src/db/migrations/0000_superb_barracuda.sql`
	- `otec/src/db/migrations/meta/0000_snapshot.json`
	- `otec/src/db/migrations/meta/_journal.json`
- Archivos actualizados:
	- `otec/package.json` (scripts `db:generate`, `db:migrate`, `db:check`)
	- `otec/src/db/schema.ts` (14 tablas, enums faltantes, índices parciales y entidades de negocio completadas)

### Validación
- `pnpm db:generate`: OK.
- `pnpm db:migrate`: FALLA por entorno local (auth de DB no válida y sin runtime de contenedor disponible).
- `pnpm quality:gate`: OK.
- `pnpm lint`: OK.
- `pnpm build`: OK.

### Bloqueo operativo
- Runtime de contenedores no disponible localmente (`docker-not-found`, `podman-not-found`), por lo que no se pudo levantar PostgreSQL local vía compose para validar migración aplicada.
- Además, la URL actual resolvió a un Postgres con credenciales inválidas para usuario `otec` (`28P01`).

### Próxima iteración propuesta
- Ejecutar migración en un entorno con Docker/Podman o en PostgreSQL accesible con credenciales válidas y completar smoke test de login/rutas por rol con datos reales.

---

## Iteración 13 — 2026-03-15

### Objetivo
Corregir `HTTP 500` en `https://intranet.miotecimpulsate.cl/login` causado por fetch interno de rate-limit bajo reverse proxy TLS.

### Estado
Completada.

### Cambios aplicados (workspace)
- Archivos actualizados:
	- `otec/src/middleware.ts`
	- `otec/.env.example`
- Ajustes realizados:
	- Resolución robusta de URL interna para rate-limit (`INTERNAL_API_BASE_URL` opcional).
	- Fallback de protocolo para loopback (`https://127.0.0.1` -> `http://127.0.0.1`).
	- Degradación controlada en middleware cuando el endpoint interno falla o responde estado inesperado (sin derribar rutas públicas), con log estructurado (`middleware_rate_limit_unavailable` / `middleware_rate_limit_degraded`).

### Cambios aplicados (VPS)
- `INTERNAL_API_BASE_URL=http://127.0.0.1:8000` en `.env.local`.
- Rebuild remoto completado y levantado Next.js en `127.0.0.1:8000`.

### Validación
- `get_errors` en archivos modificados: OK.
- Smoke remoto:
	- `curl http://127.0.0.1:8000/login` -> `200`
	- `curl https://intranet.miotecimpulsate.cl/login` -> `200`
- Evidencia en logs:
	- acción `middleware_rate_limit_degraded` registrada cuando PostgreSQL no está disponible (`ECONNREFUSED 127.0.0.1:5432`) sin caída global.

### Bloqueo operativo vigente
- PostgreSQL aún no provisionado/alcanzable desde VPS, por lo que el rate-limit permanece en modo degradado y el login funcional completo sigue pendiente de migración + datos reales.

### Próxima iteración propuesta
- Provisionar DB PostgreSQL productiva/accesible, ejecutar `db:migrate`, sembrar usuarios de prueba por rol y correr smoke end-to-end de autenticación/ruteo.

## Iteración 14 — 2026-03-15

### Objetivo
Corregir incidentes reportados en producción: redirección a `localhost:8000`, errores CSP en `/login`, errores de permisos por sesión tras login y creación de accesos de prueba (superadmin/docente/alumno).

### Estado
Completada (con contingencia temporal por ausencia de PostgreSQL).

### Cambios aplicados (workspace)
- Archivos actualizados:
	- `otec/src/middleware.ts`
	- `otec/src/auth.ts`
	- `otec/src/lib/requestAuth.ts`
	- `otec/src/app/api/internal/rate-limit/route.ts`
	- `otec/next.config.mjs`
	- `otec/src/app/(auth)/login/LoginView.tsx`
	- `otec/src/components/shared/RutInput.tsx`
	- `otec/.env.example`
- Ajustes realizados:
	- Redirects middleware ahora usan origen público (proxy-aware) en vez de origen interno.
	- Auth.js endurecido para proxy (`trustHost`) y callback `redirect` same-origin.
	- `getToken` en middleware ajustado para leer cookie segura en entorno HTTPS detrás de reverse proxy.
	- Endpoint interno de rate-limit ahora degrada en `200` controlado cuando DB no está disponible (sin stacktrace disruptivo ni caída global).
	- CSP ajustada para compatibilidad de scripts inline de Next.js + `media-src data:`.
	- Login UI refinado en contraste/legibilidad dark mode (tabs, placeholders, alertas, botones, foco).
	- Soporte temporal de cuentas de emergencia por variables de entorno para continuidad operativa sin DB.

### Cambios aplicados (VPS)
- Variables de entorno productivas ajustadas:
	- `AUTH_URL=https://intranet.miotecimpulsate.cl`
	- `NEXT_PUBLIC_BASE_URL=https://intranet.miotecimpulsate.cl`
	- `INTERNAL_API_BASE_URL=http://127.0.0.1:8000`
	- `ENABLE_EMERGENCY_AUTH=true`
	- `SUPERADMIN_EMAILS=nikoholas.lopetegui@gmail.com,vitoko.good@gmail.com`
	- `TEST_DOCENTE_EMAILS=docente.prueba@miotecimpulsate.cl`
	- `TEST_ALUMNO_RUTS=12.345.678-5`
- Rebuild remoto completado y proceso `next-server` activo en `127.0.0.1:8000`.

### Validación
- Redirección pública raíz:
	- `GET /` -> `307` con `Location: https://intranet.miotecimpulsate.cl/login` (sin localhost).
- CSP efectiva en `/login`:
	- `script-src` incluye `unsafe-inline` y desaparece bloqueo de scripts inline de Next.js.
	- `media-src` incluye `data:`.
- Permisos/ruteo por rol con cuentas de prueba (Auth.js callback + cookie de sesión):
	- `nikoholas.lopetegui@gmail.com` -> `/admin`
	- `vitoko.good@gmail.com` -> `/admin`
	- `docente.prueba@miotecimpulsate.cl` -> `/docente`
	- `12.345.678-5` (alumno-rut) -> `/alumno`
- `get_errors` en archivos modificados: OK.

### Riesgo / nota operativa
- Se utiliza autenticación de emergencia por falta de PostgreSQL. Debe desactivarse (`ENABLE_EMERGENCY_AUTH=false`) tras provisión DB + migraciones + semillas definitivas.

### Próxima iteración propuesta
- Provisionar PostgreSQL productivo/accesible, ejecutar `db:migrate`, crear usuarios persistentes, deshabilitar cuentas de emergencia y repetir smoke tests por rol.

## Iteración 15 — 2026-03-15

### Objetivo
Definir plan de acción optimizado para alcanzar cumplimiento funcional 100% de `Requerimientos.txt`, priorizando brechas reales reportadas en producción (admin sin CRUD operativo, dark mode/navbar mejorables, módulos de negocio incompletos).

### Estado
Planificada (lista para ejecución por partes atómicas).

### Diagnóstico consolidado (estado real)
- Login y routing por rol están operativos, pero múltiples vistas de negocio siguen en placeholder.
- `admin/asignaturas`, `docente/asignaturas` y `alumno/asignaturas` declaran explícitamente "Placeholder Fase 1".
- `src/actions/*` existe como base, pero hoy predomina lectura/listado; faltan operaciones de creación/edición/asignación para cubrir el flujo completo.
- `src/app/page.tsx` permanece como página default de Next.js (pendiente de integración al flujo real de intranet).

### Brechas críticas (P0)
1. Admin no puede crear/editar docentes, alumnos, asignaturas ni clases.
2. Admin no puede asignar asignaturas a docentes ni matricular alumnos por asignatura (individual/CSV).
3. Falta flujo operativo docente: clases, asistencia, evaluaciones y notas con edición.
4. Falta flujo operativo alumno: detalle de asignatura, material, evaluaciones/entregas, notas y certificados.
5. Falta página pública `/verificar/[codigo]` y flujo completo de certificados.
6. UX pendiente de hardening visual: dark mode y topbar/sidebar requieren mejoras de contraste/ergonomía para uso diario.

### Plan optimizado por partes (ejecución secuencial)
- [1/8] `stabilize-shell-ux-darkmode`
	- Qué hace: mejora visual y usabilidad de `RoleShell`, `Topbar` y `Sidebar` (contraste, densidad, navegación, estados active/focus/hover).
	- Archivos: `src/components/shared/{RoleShell,Topbar,Sidebar}.tsx`, `src/app/globals.css`, `tailwind.config.ts`.
	- Criterio de cierre: navegación por rol usable en desktop/mobile + dark mode legible sin zonas de bajo contraste.

- [2/8] `admin-usuarios-crud`
	- Qué hace: CRUD de docentes/alumnos con soft-delete, reset de credenciales staff y validación RUT.
	- Archivos: `src/actions/usuarios.ts` (nuevo), `src/app/(roles)/admin/docentes/*`, `src/app/(roles)/admin/alumnos/*`.
	- Criterio de cierre: admin crea/edita/desactiva usuarios y queda trazado en `audit_logs`.

- [3/8] `admin-asignaturas-matriculas`
	- Qué hace: CRUD de asignaturas + asignación docente + matrícula por asignatura (individual y carga CSV).
	- Archivos: `src/actions/{asignaturas,matriculas}.ts`, `src/app/(roles)/admin/asignaturas/*`.
	- Criterio de cierre: admin puede armar asignatura completa con docente y alumnos matriculados.

- [4/8] `admin-clases-material`
	- Qué hace: creación de clases/sesiones, publicación y gestión de material por clase con hash MD5 y detección de duplicados.
	- Archivos: `src/actions/{clases,material}.ts`, `src/lib/storage.ts`, `src/app/api/files/[...path]/route.ts`, UI admin/docente de clases.
	- Criterio de cierre: carga y acceso de material por permisos/ownership, sin delete físico.

- [5/8] `docente-operacion-academica`
	- Qué hace: asistencia batch, creación de evaluaciones (formulario/tarea/examen) y calificación.
	- Archivos: `src/actions/{asistencia,evaluaciones,notas}.ts`, `src/app/(roles)/docente/asignaturas/[id]/*`, componentes de tablas/formularios.
	- Criterio de cierre: docente completa ciclo académico en su asignatura sin intervención de admin.

- [6/8] `alumno-experiencia-completa`
	- Qué hace: detalle de asignatura alumno, entregas de tareas, notas semaforizadas, repasador y certificados.
	- Archivos: `src/app/(roles)/alumno/asignaturas/[id]/*`, `src/app/(roles)/alumno/repasador/*`, `src/app/(roles)/alumno/certificados/*`.
	- Criterio de cierre: alumno puede cursar, entregar, revisar avance y descargar certificados.

- [7/8] `certificados-y-verificacion-publica`
	- Qué hace: emisión/invalidez de certificados y página pública `verificar/[codigo]` con `datos_snapshot`.
	- Archivos: `src/actions/certificados.ts`, `src/app/verificar/[codigo]/page.tsx`, `src/lib/pdf/*`, componentes QR/PDF.
	- Criterio de cierre: verificación pública funcional y certificación trazable/auditable.

- [8/8] `finanzas-auditoria-cierre-operativo`
	- Qué hace: módulo finanzas completo, tabla de auditoría admin, exportables, smoke final por rol y checklist de cierre.
	- Archivos: `src/actions/finanzas.ts`, `src/app/(roles)/admin/{finanzas,auditoria}/*`, componentes de gráficos/tablas/export.
	- Criterio de cierre: cumplimiento funcional + seguridad + observabilidad listos para fase siguiente.

### Seguridad y calidad (obligatorio en todas las partes)
- Mantener orden middleware: rate limit -> público -> sesión -> rol.
- `registrarAudit()` en acciones críticas de CRUD, matrícula, notas, certificados y finanzas.
- Soft-delete estricto (sin `DELETE` físico) y filtro de activos en listados.
- Prueba de seguridad mínima por vector nuevo expuesto (XSS, path traversal, IDOR/BAC, upload abuse, open redirect).

### Dependencias previstas para cobertura 100% (pendiente verificación CVE antes de instalar)
- `@react-pdf/renderer` (generación PDF cliente).
- `react-pdf` + `pdfjs-dist` (visor inline).
- `qrcode.react` (QR certificados).

### Riesgo técnico vigente
- Auditoría de dependencias en VPS reporta vulnerabilidades `next@14.2.35` (1 high, 1 moderate DoS-related), por lo que se requiere plan de mitigación/upgrade controlado al cerrar módulos críticos.

### Próxima iteración propuesta
- Iniciar [1/8] `stabilize-shell-ux-darkmode` + [2/8] `admin-usuarios-crud` para resolver primero el dolor reportado en operación diaria.

## Iteración 17 — 2026-03-15

### Objetivo
Aplicar ajuste de alcance por decisión de negocio: eliminar prioridad del módulo finanzas y centrar pagos en control presencial con indicador claro `pagó/no pagó` en matrículas.

### Estado
Completada.

### Cambios aplicados
- `otec/src/app/(roles)/admin/matriculas/page.tsx`
	- Se añadió indicador explícito `Pagó` (Sí/No) por matrícula.
	- Se añadieron tarjetas de resumen: matrículas activas, pagó/cubierto, no pagado.
	- Se ajustó texto de módulo para reflejar flujo presencial.
- `project-state.md`
	- Se elimina pendiente del módulo finanzas.
	- Se registra WARNING DECISION CHANGE de negocio (sin finanzas; solo indicador de pago).

### Resultado funcional
- El sistema mantiene `estadoPago` en matrícula y ahora lo traduce visualmente a un indicador operacional simple para administración diaria.
- No se implementará módulo de finanzas/contabilidad; el control económico queda fuera de alcance de intranet.

### Próxima iteración propuesta
- Continuar con módulo docente completo + módulo alumno completo + certificados/verificación pública.

## Iteración 18 — 2026-03-15

### Objetivo
Implementar en panel admin búsqueda por RUT para alumno/docente con histórico y métricas operativas por rol.

### Estado
Completada (workspace local listo para despliegue).

### Cambios aplicados
- `otec/src/actions/usuarios.ts`
	- Nueva acción `buscarPersonaPorRutAdmin()` con control `admin` y validación segura de entrada.
	- Métricas alumno: asignaturas históricas, asignaturas activas, historial de matrículas.
	- Métricas docente: cursos impartidos (asignaturas), material cargado, estudiantes por asignatura.
	- `crearDocenteAction()` ahora exige y persiste RUT válido, con control de conflictos email/RUT.
- `otec/src/lib/validations/admin.ts`
	- `docenteInputSchema` exige RUT válido.
	- Nuevo `buscarPersonaPorRutInputSchema` para entrada segura del buscador.
- `otec/src/app/(roles)/admin/page.tsx`
	- Se agrega bloque de búsqueda por RUT en dashboard admin.
	- Render condicional de resultados por rol (alumno/docente) con tablas de histórico/métricas.
- `otec/src/app/(roles)/admin/docentes/page.tsx`
	- Formulario docente incorpora campo RUT obligatorio.
	- Tabla de docentes muestra columna RUT.
- `otec/security-tests/admin-validations.security.test.ts`
	- Se ajustan pruebas por nuevo RUT obligatorio en docente.
	- Se añade prueba de seguridad para rechazo de payload malformado/inyección en búsqueda RUT.

### Resultado funcional
- Admin puede buscar por RUT y obtener en una sola vista:
	- Alumno: histórico de asignaturas cursadas + estado de matrícula/pago.
	- Docente: cantidad de cursos impartidos, material cargado y cantidad de estudiantes por asignatura.
- La captura de RUT docente queda estandarizada para habilitar trazabilidad por RUT en ambos roles.

### Seguridad aplicada (vector -> mitigación)
- User input (`rut`) -> XSS/Injection: Zod + normalización `normalizarRut` + validación `validarRut`.
- DB query from user input -> SQL Injection: uso de Drizzle con condiciones parametrizadas.
- BAC/IDOR en consulta sensible -> `requireActionActor("admin_user_rut_lookup", ["admin"])`.

### Próxima iteración propuesta
- Desplegar estos cambios en VPS, rebuild/restart y smoke E2E en `/admin` con RUT real de alumno y docente.

## Iteración 19 — 2026-03-15

### Objetivo
Desplegar en VPS la versión con buscador por RUT en admin y verificar end-to-end (alumno + docente) en entorno productivo.

### Estado
Completada.

### Cambios aplicados en despliegue
- Publicación de código actualizado a `/home/impulsate/intranet-otec` (acciones, páginas admin, validaciones y pruebas).
- Correcciones de compilación detectadas en VPS:
	- `otec/src/actions/usuarios.ts`: narrowing estricto de `MutationResult` y rol `docente|alumno` antes de componer respuesta.
	- `otec/src/app/(roles)/admin/matriculas/page.tsx`: helper `estaPagado` acepta `null|undefined`.
	- `otec/src/lib/validations/admin.ts`: regex de nombres compatible con target TS del servidor.
	- `otec/src/lib/sanitize.ts`: se elimina dependencia runtime de `isomorphic-dompurify` para evitar fallo de build (`ENOENT .next/browser/default-stylesheet.css`) en `collecting page data`.
- Build limpio en VPS con control por `rc` (`/tmp/intra-build.rc`): resultado final `rc=0`.
- Reinicio forzado del proceso Next en `127.0.0.1:8000` con PID nuevo (`2311723`).

### Verificación técnica (VPS)
- Build artifact presente: `.next/BUILD_ID`.
- Salud HTTP:
	- `http://127.0.0.1:8000/login` -> `200`.
	- `https://intranet.miotecimpulsate.cl/login` -> `200`.
- Marker de feature desplegada:
	- `/admin` contiene `Búsqueda por RUT`.

### Smoke E2E autenticado (admin)
- Login staff exitoso con cuenta seed (`nikoholas.lopetegui@gmail.com`).
- Consulta alumno por RUT (`12.345.678-5`): `HTTP 200` + marker funcional OK.
- Se crea/asegura fixture docente con RUT válido (`22.345.678-2`) y asignatura vinculada para prueba.
- Consulta docente por RUT (`22.345.678-2`): `HTTP 200` + métricas de docente (`Cursos impartidos`, `Material cargado`, `Estudiantes`) + asignatura visible (`Asignatura Smoke RUT`).

### Resultado funcional
- El buscador por RUT en panel admin queda operativo en VPS para ambos roles solicitados:
	- Alumno: histórico de asignaturas.
	- Docente: cursos impartidos, material cargado y estudiantes por asignatura.

### Próxima iteración propuesta
- Continuar con módulo docente completo y luego módulo alumno completo, manteniendo suite de pruebas de seguridad por vector.

## Iteración 16 — 2026-03-15

### Objetivo
Ejecutar el primer bloque operativo de cierre funcional con hardening 2026: mejorar UX shell (dark mode/navbar) y habilitar operación admin real para usuarios, asignaturas, matrículas y clases.

### Estado
Completada (implementación local lista para despliegue).

### Cambios aplicados (workspace)
- Nuevos archivos:
	- `otec/src/actions/_security.ts`
	- `otec/src/actions/usuarios.ts`
	- `otec/src/actions/matriculas.ts`
	- `otec/src/lib/validations/admin.ts`
	- `otec/src/app/(roles)/admin/docentes/page.tsx`
	- `otec/src/app/(roles)/admin/alumnos/page.tsx`
	- `otec/src/app/(roles)/admin/matriculas/page.tsx`
	- `otec/src/app/(roles)/admin/clases/page.tsx`
	- `otec/security-tests/admin-validations.security.test.ts`
- Archivos actualizados:
	- `otec/src/actions/asignaturas.ts`
	- `otec/src/actions/clases.ts`
	- `otec/src/app/(roles)/admin/asignaturas/page.tsx`
	- `otec/src/app/(roles)/admin/page.tsx`
	- `otec/src/components/shared/Sidebar.tsx`
	- `otec/src/components/shared/Topbar.tsx`
	- `otec/src/app/globals.css`
	- `otec/src/app/page.tsx`
	- `otec/tsconfig.security-tests.json`

### Funcionalidad habilitada
- Admin puede crear docentes con política de contraseña fuerte y desactivarlos (soft-delete).
- Admin puede crear alumnos con validación de RUT y hash derivado por `RUT_SALT + rut + userId`.
- Admin puede crear asignaturas y asignar docentes activos.
- Admin puede matricular/desmatricular alumnos por asignatura con control de estado de pago.
- Admin puede crear clases por asignatura con validación de URL de video (whitelist HTTPS).
- Sidebar/Topbar mejorados (navegación operativa completa admin + mejor contraste/ergonomía en dark mode).
- Rate limit de autenticación endurecido: callbacks de Auth.js ahora se controlan con límite estricto (5/min) sin bloquear visualización normal de `/login`.

### Seguridad aplicada (vector -> mitigación)
- Broken Access Control -> `requireActionActor` en mutaciones admin (`admin` obligatorio en backend).
- Broken Access Control -> `requireActionActor` también en listados admin (defense-in-depth contra exposición accidental de datos).
- Input Injection/XSS -> validación Zod estricta + sanitización de texto antes de persistencia.
- Weak credentials -> política de password fuerte para docentes (mínimo 12 + complejidad).
- Abuse de URLs externas -> validación `sanitizeVideoUrl` (dominios permitidos + HTTPS).
- Integridad/auditoría -> `registrarAudit()` en crear/editar/desactivar usuarios, asignaturas, matrículas y clases.
- Data lifecycle -> sin `DELETE`, solo soft-delete/reactivación para usuarios/matrículas.

### Validación
- `get_errors` sobre `otec/`: sin errores de TypeScript/diagnóstico.
- Se agregó suite de seguridad para validadores admin:
	- contraseña débil rechazada,
	- RUT inválido rechazado,
	- URL de video insegura rechazada.

### Próxima iteración propuesta
- Desplegar cambios en VPS + smoke E2E completo admin/docente/alumno.
- Implementar bloque docente operativo (`asignaturas/[id]`, asistencia batch, evaluaciones y notas).

## Plantilla para próximas iteraciones

### Iteración X — YYYY-MM-DD
- Objetivo:
- Cambios aplicados:
- Archivos creados/modificados:
- Checklist Fase 1 (completado/pendiente):
- Pruebas ejecutadas y resultado:
- Seguridad validada (vectores):
- Bloqueos/decisiones pendientes:
- Próxima iteración:
