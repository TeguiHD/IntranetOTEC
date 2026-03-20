# CAPA 4 — Seguridad + UI/UX (Actualizado Marzo 2026)

## 1) Alcance
Este documento define la ejecución de la **capa de seguridad (Punto 4)** para Fase 1, integrando:
- PHASE 1.3 Skill Discovery
- PHASE 1.4 Threat Modeling automático
- Security tests obligatorios por vector
- Observability baseline obligatorio
- Uso de subagentes para asegurar UI/UX pulida (no genérica)

Se alinea con `Requerimientos.txt` (bloque v3), inmutabilidad de datos, `strict` TypeScript, y sin romper restricciones de dependencias de Fase 1.

---

## 2) PHASE 1.3 — Skill Discovery (Before Coding)

### Skills evaluadas
- `anthropics/skills@pdf`
- `anthropics/skills@docx`
- `vercel-labs/skills@find-skills`
- `vercel-labs/agent-skills@web-design-guidelines`
- `anthropics/skills@frontend-design`
- `obra/superpowers` (metodología)

### Skills activas para este punto
1. **`web-design-guidelines`**
   - Uso: checklist de accesibilidad, foco, formularios, interacción, layout seguro, anti-patrones UI.
2. **`frontend-design`**
   - Uso: calidad visual intencional y coherente para evitar aspecto “plantilla IA”.
3. **`find-skills`**
   - Uso: búsqueda de skills complementarias antes de nuevas fases (si hay gaps).
4. **`superpowers` (referencial)**
   - Uso: flujo en partes atómicas + revisión + subagentes por especialidad.

### Skills no activas en Punto 4 (pero registradas)
- `pdf` y `docx`: quedan para fases funcionales de certificados/reportes, no para hardening base de Fase 1.

---

## 3) Subagentes usados (UI/UX + Security)

### Delegación ejecutada
- **Subagente `Explore` (UI/UX blueprint):** reglas visuales concretas por componente (sidebar/topbar/forms/tables/modals), anti-patrones y checklist de revisión.
- **Subagente `Explore` (security hardening):** trust boundaries, vectores de amenaza, pruebas por vector, observabilidad y plan incremental.

### Criterio de adopción
Se adoptan solo recomendaciones compatibles con las restricciones del proyecto:
- No dependencias fuera de Fase 1 sin confirmación.
- No romper `darkMode`, `inputMode`, `100dvh`, rutas limpias, roles granulares.
- No contradicciones con stack obligatorio ni con inmutabilidad de datos.

---

## 4) PHASE 1.4 — Automatic Threat Modeling

Para cada cruce de frontera se evalúa siempre:
1. Nivel de confianza de la entrada
2. Cruce de frontera de confianza
3. Tipo de operación
4. Mitigación requerida antes de código
5. Prueba de seguridad requerida

### 4.1 Matriz obligatoria por operación

| Operación | Trust level | Frontera | Mitigación previa | Security test mínimo |
|---|---|---|---|---|
| User input (forms/login) | No confiable | Cliente -> Server Action | Zod server-side + sanitización + límites de longitud | Payload XSS/SQLi/SSTI no debe ejecutarse |
| Template rendering | Mixto | Data -> JSX/UI | Escape por defecto + no render HTML crudo | Payload `<script>` debe neutralizarse |
| File uploads (PDF) | No confiable | Cliente -> Storage/DB | MIME real + magic bytes + tamaño + nombre seguro | MIME falso debe rechazarse |
| Shell/CLI execution | Alto riesgo | App -> OS | Prohibido input usuario en comandos; sin `child_process` con input no confiable | Intento de inyección de comandos debe fallar |
| XML parsing | Alto riesgo | Archivo externo -> parser | No parsear XML en Fase 1; si existe luego: XXE deshabilitado | Payload XXE no debe resolver entidades |
| External JSON parsing | No confiable | API externa -> app | Validación Zod + freeze/deep clone seguro | Prototype pollution no debe mutar prototipos |
| DB queries | Crítico | App -> PostgreSQL | Solo Drizzle tipado, sin SQL raw sin parámetros | SQLi payload debe fallar seguro |
| External redirects | No confiable | App -> navegador | Allowlist de dominios y rutas internas | Open redirect a dominio externo debe rechazarse |
| External API calls | No confiable | App -> Internet | Allowlist DNS/protocol + timeout + bloqueo IP privada | SSRF a `127.0.0.1`/RFC1918 debe rechazarse |
| File path handling | Crítico | URL/path -> filesystem/storage | `sanitizePath` + allowlist buckets + normalización | Path traversal `../` debe rechazarse |
| Auth/sessions | Crítico | Usuario -> recursos | Middleware + check de ownership en action + cookies seguras | IDOR/token abuse debe ser bloqueado |
| Third-party deps | Crítico | Supply chain -> build/runtime | Pin versiones + audit CI + CVE gate | Dependencia con CVE high/critical debe bloquear CI |
| LLM features | N/A en Fase 1 | (No aplica) | No exponer tools/secretos; si aparece en fase futura, guardrails | Prompt injection test (fase futura) |
| Plugins/scripts | N/A runtime | Build/dev -> app | Ejecutar solo scripts propios/versionados | Script no autorizado debe fallar en pipeline |
| Config/env usage | Crítico | Secrets -> runtime | `.env.local` + no logs de secretos + validación de env | Secret scanning y test de no-exposición |

---

## 5) Security Tests (Mandatory)

> Convención de ubicación (cuando aplique): `*.security.test.ts`

### 5.1 Suite mínima obligatoria por vector
1. `auth.security.test.ts`
   - Brute force login: bloqueo tras 5 intentos/60s.
   - Cookie/session flags: `HttpOnly`, `Secure` (prod), `SameSite=Strict`.
   - IDOR: usuario no accede a rutas de otro rol.
2. `sanitize.security.test.ts`
   - XSS: payload HTML/JS neutralizado por `sanitizeText`.
   - Path traversal: `../`, `%2e%2e/`, `..\\` rechazados.
   - URL de video: dominio no permitido rechazado.
3. `db.security.test.ts`
   - SQL injection payload en filtros no altera query ni extrae datos.
   - Query en tablas soft-delete exige filtro activo por defecto.
4. `upload.security.test.ts`
   - MIME bypass: archivo no-PDF con extensión `.pdf` rechazado.
   - Archivo >5MB rechazado.
5. `redirect.security.test.ts`
   - Open redirect externo denegado.
6. `deps.security.test.ts` (o CI check)
   - Falla pipeline con CVE `high`/`critical`.
7. `config.security.test.ts`
   - `RUT_SALT`, `AUTH_SECRET`, `DATABASE_URL` no aparecen en respuestas ni logs.
8. `prototype.security.test.ts`
   - JSON malicioso con `__proto__` no contamina objetos globales.
9. `xxe.security.test.ts` (guardrail)
   - Si no hay XML parser en Fase 1: test debe verificar “feature deshabilitada/no expuesta”.
10. `command-injection.security.test.ts` (guardrail)
    - Verificar ausencia de ejecución shell con input usuario.

### 5.2 Cobertura de seguridad objetivo (Fase 1)
- 100% de vectores detectados con al menos 1 test.
- 100% de acciones críticas (`login`, `desactivar`, `cerrar_ciclo`, `emitir_certificado`) con audit log verificable.

---

## 6) Observability Baseline (Mandatory)

## 6.1 Structured logs (JSON)
Cada evento debe registrar:
- `timestamp`
- `correlationId`
- `action`
- `result`
- `role`
- `userId` (cuando corresponda)
- `endpoint`
- `latencyMs`
- `statusCode`

Reglas:
- No loggear passwords, tokens, secrets, ni PII completa.
- Masking obligatorio para RUT/email en logs operativos (mostrar parcial).

## 6.2 Tracing
- Propagar `correlationId` por middleware (`x-correlation-id`).
- Reusar el mismo ID en logs de middleware + server actions + route handlers.

## 6.3 Metrics
Mínimas en Fase 1:
- Latencia `p50/p95/p99` por endpoint.
- Tasa de error total y por endpoint.
- Throughput (req/min).
- Contador de `429` por rate limit.
- Contador de `401/403` para anomalías auth.

## 6.4 Alertas mínimas
- Spike de `5xx` (> umbral por 5 min).
- Anomalías auth (`401/403/429`).
- Latencia p95/p99 fuera de SLO.
- Aparición de CVE críticas (pipeline/audit).

## 6.5 Dependencias para observabilidad
- **Fase 1 sin dependencias nuevas**: logs JSON por `console` estructurado + agregación posterior.
- Cualquier librería adicional (p.ej. logger dedicado, tracing SDK) requiere confirmación explícita.

---

## 7) Quality Gate UI/UX (para que no se sienta “hecha por IA”)

### 7.1 Reglas obligatorias
- Layout con ritmo consistente (spacing scale fija, sin valores arbitrarios).
- Jerarquía visual estable: color de marca solo para acciones/estado activo, no decoración excesiva.
- Formularios accesibles: label real + `inputMode` correcto + foco visible.
- Sidebar/topbar/tables/modals con patrones consistentes en todas las vistas.
- Estados vacíos, error y loading con copy accionable (no genérico).
- Mobile-first real (`100dvh`, safe areas, targets táctiles >= 44px).

### 7.2 Anti-patrones prohibidos
- `transition: all`
- `outline-none` sin reemplazo `focus-visible`
- navegación con `div onClick`
- icon-only buttons sin `aria-label`
- input sin label
- acciones destructivas sin confirmación
- diseño “ornamental” sin relación funcional

### 7.3 Checklist PR UI/UX
- Accesibilidad y foco visible aprobados.
- Copy y jerarquía visual consistentes.
- Responsive y safe-area verificados.
- Estados de error/carga no ambiguos.
- No hardcode de colores/fuentes fuera del sistema definido.

---

## 8) Plan atómico del Punto 4 (Capa de Seguridad)

### [4.1/4] baseline-hardening
- Configurar headers, CORS, sanitización, rate limit, audit base.
- Tests: XSS, path traversal, brute force.

### [4.2/4] authz-depth
- Verificación de ownership en todas las acciones críticas.
- Tests: IDOR/BAC por rol.

### [4.3/4] observability-core
- Correlation ID + logs JSON + métricas mínimas + alertas base.
- Tests: presencia de correlationId y ausencia de secretos en logs.

### [4.4/4] ux-security-quality-gate
- Aplicar checklist UI/UX + revisión por subagente en rutas críticas.
- Tests: accesibilidad/foco/labels/inputMode/safe-area.

---

## 9) Criterios de cierre de Punto 4
- Matriz de amenazas completa y sin vacíos.
- 1+ test de seguridad por vector detectado.
- Observabilidad mínima funcionando con trazabilidad por `correlationId`.
- Cero exposición de secretos en respuestas y logs.
- UI/UX revisada con checklist formal y sin anti-patrones críticos.

---

## 10) Nota operacional
Este documento prioriza controles viables en Fase 1 (infraestructura) y evita agregar complejidad no autorizada. La profundización (WAF avanzado, SIEM, OTel completo, SAST/DAST extendido, sandboxing L3) queda para fases posteriores o aprobación explícita.
