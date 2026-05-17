# Auditoría de Seguridad — IntranetOTEC

**Versión**: 1.0
**Fecha**: 2026-05-16
**Auditor**: Claude Code (Anthropic) — revisión multi-agente
**Cliente**: OTEC Impulsate (responsable del tratamiento: Victor Salinas)
**Aplicación**: Intranet OTEC (Next.js 15 · NextAuth 5 beta · Drizzle · Postgres · PM2 cluster)
**Branch**: `feat/alumnos-credencial-extranjera-solicitudes` · HEAD `e0f3b35`
**URL prod**: `https://intranet.miotecimpulsate.cl`
**VPS**: `104.248.3.67` · `/home/impulsate/intranet-otec` · PM2 cluster, nginx, Postgres nativo
**Estado del documento**: Borrador para revisión del responsable del tratamiento

---

## 0. Tabla de contenidos

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Metodología](#2-metodología)
3. [Frameworks de referencia](#3-frameworks-de-referencia)
4. [Findings consolidados](#4-findings-consolidados)
   - 4.1 CRITICAL (7)
   - 4.2 HIGH técnico (13)
   - 4.3 HIGH regulatorio (7)
   - 4.4 MEDIUM (11)
5. [Plan de remediación priorizado](#5-plan-de-remediación-priorizado)
6. [Matriz de compliance Chile](#6-matriz-de-compliance-chile)
7. [Mapping a frameworks internacionales](#7-mapping-a-frameworks-internacionales)
8. [Riesgos aceptados / decisiones del cliente](#8-riesgos-aceptados--decisiones-del-cliente)
9. [Recomendaciones de gobierno](#9-recomendaciones-de-gobierno)
10. [Anexos](#10-anexos)

---

## 1. Resumen ejecutivo

### 1.1 Veredicto

**No apto para producción en su estado actual** sin mitigaciones P0 (semana 1) o memo formal de aceptación de riesgo firmado por el responsable del tratamiento (cliente OTEC) y Encargado de Protección de Datos (DPO, no designado a la fecha).

### 1.2 Hallazgos por severidad

| Severidad | Cantidad | SLA recomendado | Impacto si no se mitiga |
|-----------|----------|-----------------|--------------------------|
| 🔴 **CRITICAL** | **7** | **7 días** | Compromiso masivo de cuentas, exfiltración PII de 324+ alumnos, pérdida total de datos, multa regulatoria gravísima |
| 🟠 **HIGH técnico** | **13** | 30 días | Bypass de controles, persistencia de atacante, escalación lateral |
| 🟠 **HIGH regulatorio** | **7** | Antes Dic 2026 | Multas hasta 20 000 UTM (≈ CLP 1.300 M) Ley 21.719 |
| 🟡 **MEDIUM** | **11** | 60 días | Reducción de superficie de ataque |
| **Total únicos** | **38** | | (61 findings brutos deduplicados) |

### 1.3 Cadena de exploit más crítica (sin OSINT externo)

```
Foto de certificado (WhatsApp familia / LinkedIn / empleador)
        ↓
URL pública /verificar/{codigo} (sin auth)  [CRIT-4]
        ↓ leak
RUT + nombre + curso del alumno
        ↓
PIN = últimos 4 dígitos del RUT  [CRIT-1]
        ↓
Login alumno completo (sin MFA)  [CRIT-2 facilita brute-force si PIN cambiado]
        ↓
Acceso a notas, asistencia, mensajes, capacidad de auto-emitir más certificados [HIGH-3]
```

**Probabilidad: alta** (vector trivial, código público, RUT chileno es PII de bajo secreto)
**Impacto: alto** (PII directa de menores y adultos, datos académicos, finanzas)

### 1.4 Top 5 acciones P0 (esta semana)

1. **PIN aleatorio + force change** o memo formal aceptación de riesgo
2. **`Math.random()` → `crypto.randomInt`** en `resetearPasswordAdminAction`
3. **Enmascarar RUT** en `/verificar/{codigo}`
4. **Audit log con IP/UA** + revoke UPDATE/DELETE sobre tabla
5. **Hard-block `ENABLE_EMERGENCY_AUTH` en producción**

---

## 2. Metodología

### 2.1 Auditoría multi-agente en paralelo

Cuatro auditores AI independientes con dominios disjuntos para minimizar sesgo y maximizar cobertura. Cada uno produjo reporte separado; los hallazgos se cruzan en este documento (campo "Confluencia").

| Agente | Foco | Standard primario |
|--------|------|-------------------|
| **A1** OWASP / ASVS | Vulnerabilidades aplicación web | OWASP Top 10 2021 + ASVS 4.0 L2 + OWASP API Top 10 |
| **A2** Compliance Chile | Cumplimiento regulatorio | Ley 19.628 + 21.096 + 21.459 + 21.719 + SENCE |
| **A3** NIST/CIS/MITRE | Arquitectura, infra, governance | NIST CSF 2.0 + SP 800-53 r5 + CIS Controls v8 + MITRE ATT&CK/D3FEND |
| **A4** Auth/Cripto | Autenticación, sesiones, claves | OWASP ASVS V2/V6 + NIST SP 800-63B + RFC 6238 |

### 2.2 Criterios de inclusión

- Solo findings con **confianza ≥ 7/10**
- Solo vulnerabilidades **comprobables** por lectura de código (no especulativas)
- Cada finding cita **archivo:línea** + código relevante
- Cada finding incluye **exploit scenario concreto** + **fix recomendado**
- Deduplicación: hallazgos coincidentes entre agentes consolidados en un solo CRIT/HIGH/MED

### 2.3 Alcance

✅ Incluido:
- Código aplicación completo (`src/`)
- Schema BD (`src/db/schema.ts`, migraciones)
- Scripts ops (`scripts/*.mjs`)
- Config infra (`next.config.mjs`, `ecosystem.config.cjs`, `package.json`)
- Estado runtime (DB en VPS, PM2 cluster, backups, headers HTTP)
- Compliance regulatorio Chile

❌ Excluido (declarado):
- Pentesting activo / explotación real
- Análisis del binario de Postgres / sistema operativo Ubuntu
- Configuración nginx no versionada en repo (no auditada directamente, solo deducida)
- Decisiones comerciales del cliente (documentadas como riesgo aceptado, sección 8)
- Auditoría de procesos humanos (entrenamiento usuarios, gestión accesos físicos)

---

## 3. Frameworks de referencia

### 3.1 Estándares aplicados

| Framework | Versión | Uso |
|-----------|---------|-----|
| **OWASP Top 10** | 2021 | Categorización vulnerabilidades web (A01-A10) |
| **OWASP ASVS** | 4.0 Level 2 | Verificación arquitectura segura (V1-V14) |
| **OWASP API Security** | 2023 | API-specific (BOLA, BFLA, BOPLA) |
| **NIST CSF** | 2.0 | Funciones GV, ID, PR, DE, RS, RC |
| **NIST SP 800-53** | Rev. 5 | Controles técnicos (AC, AU, IA, SC, SI, CP) |
| **NIST SP 800-63B** | Rev. 3 | Autenticadores y gestión credenciales |
| **CIS Controls** | v8 | 18 controles, prioridad IG1-IG3 |
| **MITRE ATT&CK** | v15 | TTPs adversarios (T1110, T1078, T1190…) |
| **MITRE D3FEND** | v1.0 | Contramedidas defensivas |
| **CISA KEV** | continuo | Vulnerabilidades explotadas conocidas |

### 3.2 Normativa Chile aplicable

| Norma | Año | Aplicabilidad | Impacto multa |
|-------|-----|---------------|----------------|
| **Ley 19.628** Protección Vida Privada | 1999 (mod. 2018) | ✅ obligatoria, vigente | Indemnización civil + sanciones administrativas |
| **Ley 21.096** Protección Datos como derecho constitucional | 2018 | ✅ rango constitucional | Acción de protección |
| **Ley 21.459** Marco Ciberseguridad e Infra Crítica | 2024 | ⚠️ aplicable si OTEC clasifica como operador esencial — probable que NO directamente, pero obligación notificación CSIRT al detectar incidente | Multas + obligaciones reporte |
| **Ley 21.180** Transformación Digital del Estado | 2019 | ⚠️ si OTEC integra con SENCE/MINEDUC online | Variable |
| **Ley 21.719** Nueva Ley Datos Personales | promulgada 2024, **vigencia plena Dic 2026** | ✅ obligatoria sujeto: OTEC trata >100 alumnos = "gran escala" → DPO obligatorio, RAT obligatorio | Hasta 20 000 UTM (≈ **CLP 1.300 millones**) infracción gravísima |
| **Reglamento SENCE Ley 19.518** | continuo | ✅ obligatoria | Suspensión registro OTEC |

---

## 4. Findings consolidados

> Cada finding incluye: ID, severidad, confianza, confluencia entre agentes, código afectado, exploit, mapping, fix, esfuerzo estimado.

---

### 4.1 🔴 CRITICAL (P0 — esta semana)

#### CRIT-1. PIN inicial = últimos 4 dígitos del RUT (takeover masivo trivial)

- **Severidad**: CRITICAL · **Confianza**: 10/10
- **Confluencia**: OWASP C-1 · Compliance F1 · NIST F-01 · Auth F-1
- **Archivos**:
  - `src/lib/rut.ts:99-117` — función `derivarPinPredeterminado()`
  - `src/app/api/internal/import-alumnos/route.ts:904`
  - `src/actions/usuarios.ts:824, 878`
- **Código**:
  ```ts
  export function derivarPinPredeterminado(identificadorLogin: string): string {
    // ... toma los últimos 4 dígitos del cuerpo del RUT
    return rutBody.length >= 4 ? rutBody.slice(-4) : rutBody.padStart(4, "0");
  }
  ```
- **Exploit**: RUT chileno es PII de baja confidencialidad (carnet, listas, redes). Con el Excel "Listado Mayo - Junio.xlsx" ya filtrado de 324 RUTs, cualquier persona puede iterar:
  ```bash
  for rut in $(cat ruts.txt); do
    pin=${rut: -5:4}  # últimos 4 del cuerpo
    curl -s "$URL/api/auth/callback/alumno-rut" -d "rut=$rut&pin=$pin"
  done
  ```
  → todas las cuentas que no cambiaron PIN comprometidas.
- **Estado**: `pinCambiado=false` por defecto, no enforzado en middleware. Cliente OTEC documenta en memoria del proyecto que **rechaza forzar cambio** (`feedback_cliente_otec.md`). Esta decisión es comercial; la responsabilidad regulatoria por el riesgo persiste.
- **Mapping**:
  - OWASP A07:2021 (Identification & Auth Failures)
  - ASVS V2.1.1 (passwords), V6.2.3 (low entropy)
  - NIST SP 800-53 IA-5(1) (autenticadores), IA-5(6) (passwords iniciales)
  - NIST SP 800-63B §5.1.1.2 (memorized secrets)
  - MITRE ATT&CK T1078.003 (Valid Accounts), T1110.001 (Password Guessing)
  - Ley 19.628 art. 11 (deber de cuidado)
  - Ley 21.719 art. 14 (medidas técnicas apropiadas) — multa hasta 20 000 UTM
- **Fix recomendado**:
  1. Generar PIN aleatorio: `crypto.randomInt(100000, 1000000)` (6 dígitos, ~20 bits)
  2. Entrega out-of-band (email/SMS) — nunca en pantalla del admin
  3. Forzar `pinCambiado=false` en middleware: redirect a `/alumno/cambiar-pin` mientras false
  4. Bloquear PINs triviales (`123456`, fecha-nacimiento, últimos-4-RUT)
- **Esfuerzo**: 1 día dev + emails configurados (Brevo ya integrado)
- **Alternativa si cliente rechaza**: ver sección 8 (memo formal de aceptación de riesgo)

---

#### CRIT-2. Brute force trivial: rate-limit `Map` en memoria × PM2 cluster + sin lockout por cuenta

- **Severidad**: CRITICAL · **Confianza**: 10/10
- **Confluencia**: OWASP M-2 · Compliance F2 · NIST F-02 · Auth F-2
- **Archivos**:
  - `src/lib/rateLimitMemory.ts:15, 22` — `/login: max 120, windowMs 60_000` · `store = new Map()`
  - `ecosystem.config.cjs:38` — `instances: "max"` en `exec_mode: "cluster"`
  - `src/lib/rateLimit.ts` — implementación Postgres existe pero **NO conectada** (código muerto)
- **Exploit**: con 4 cores PM2, cada worker tiene Map propio → 120/min × 4 = 480/min efectivos por IP. Espacio PIN = 10⁴. Crackeo exhaustivo de 1 cuenta = ~21 minutos desde 1 IP. Con botnet o IPs residenciales = segundos. Rate-limit es por **IP, no por cuenta** → atacar múltiples RUTs en paralelo desde misma IP.
- **Mapping**:
  - OWASP A07:2021
  - ASVS V11.1.4 (anti-automation)
  - NIST SP 800-53 AC-7 (unsuccessful logon attempts), SC-5
  - MITRE ATT&CK T1110 (Brute Force)
  - D3FEND D3-AL (Account Locking)
- **Fix**:
  1. Conectar `src/lib/rateLimit.ts` (Postgres) al middleware — código ya existe
  2. Lockout por cuenta: tras 5 fallos en 15 min → bloqueo cuenta 15 min, registrar audit `account_locked`
  3. Bajar `/login` a `max: 10, windowMs: 60_000`
  4. CAPTCHA (hCaptcha o Cloudflare Turnstile) tras 3 fallos
- **Esfuerzo**: 1-2 días dev

---

#### CRIT-3. `Math.random()` para passwords admin/docente — predecible

- **Severidad**: CRITICAL · **Confianza**: 10/10
- **Confluencia**: OWASP C-2 · Compliance F8 · Auth F-6
- **Archivo**: `src/actions/usuarios.ts:2066-2068`
- **Código**:
  ```ts
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
  nuevaPassword = Array.from({ length: 10 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
  ```
- **Exploit**: V8 implementa `Math.random()` con xorshift128+ (no CSPRNG). Su estado interno es reversible observando ~5 outputs consecutivos. Patrón de bulk-reset (admin resetea N cuentas seguidas) expone outputs vía response payload `{ nuevaPassword }`. Atacante predice siguientes resets.
- **Mapping**:
  - OWASP A02:2021 (Cryptographic Failures)
  - ASVS V6.3.3 (CSPRNG mandatory)
  - NIST SP 800-90A (DRBG)
- **Fix**:
  ```ts
  import { randomInt } from "node:crypto";
  const len = chars.length;
  // rejection sampling para evitar bias
  nuevaPassword = Array.from({ length: 10 }, () => chars[randomInt(0, len)]).join("");
  ```
- **Esfuerzo**: 10 LOC, 30 min

---

#### CRIT-4. `/verificar/{codigo}` filtra RUT completo + códigos AR-YYYY de ~40 bits

- **Severidad**: CRITICAL · **Confianza**: 10/10
- **Confluencia**: OWASP C-3 · Auth F-14
- **Archivos**:
  - `src/app/verificar/[codigo]/page.tsx:128-143` — muestra `formatRutDisplay(snapshot?.alumnoRut)`
  - `src/lib/certificados.ts:87-105` — códigos formato `AR-YYYY-XXXXXXXX`, alphabet 32 chars × 8 chars ≈ 2⁴⁰ combinaciones
- **Exploit (cadena)**:
  1. Cualquier foto/screenshot de certificado contiene código verificador
  2. `https://intranet.miotecimpulsate.cl/verificar/AR-2026-XXXXXXXX` es PÚBLICA, sin auth
  3. Muestra: `RUT completo + nombre + curso + fecha`
  4. RUT → PIN derivable (CRIT-1) → login alumno
- **Mapping**:
  - OWASP A01 (Broken Access Control) + A04 (Insecure Design)
  - OWASP API3:2023 BOPLA (Broken Object Property Level Auth)
  - Ley 19.628 art. 4 (consentimiento), art. 10 (datos en contexto público)
- **Fix**:
  1. En `/verificar` mostrar solo: `valid/invalid · tipo certificado · curso · fecha emisión · nombre OTEC`
  2. Para confirmar titular: input "últimos 4 RUT" como challenge antes de mostrar nombre
  3. Aumentar entropía: códigos UUID v4 (128 bits) o HMAC firmados
- **Esfuerzo**: 4 horas

---

#### CRIT-5. Backdoor `ENABLE_EMERGENCY_AUTH` con llave maestra compartida + auto-activación en DB-down

- **Severidad**: CRITICAL · **Confianza**: 9/10
- **Confluencia**: OWASP H-3 · Compliance F3 · NIST F-06 · Auth F-3
- **Archivos**:
  - `src/auth.ts:72-160` — define cuentas emergency
  - `src/auth.ts:322-345, 458-481` — uso staff/alumno
  - `src/auth.ts:383-407, 514-539` — **fallback automático cuando DB falla**
  - `.env.example:13` — `EMERGENCY_AUTH_PASSWORD` en plano (junto al hash)
- **Exploit doble**:
  - (a) **Sin no-repudio**: `SUPERADMIN_EMAILS` comparten UN solo `EMERGENCY_AUTH_PASSWORD_HASH`. Imposible distinguir qué admin actuó. Sin rotación. Sin MFA.
  - (b) **DoS = backdoor**: si Postgres timeout/conexión cae, el `catch` bypassa al modo emergency. Atacante puede provocar DoS Postgres (saturar pool) → login emergency abierto.
- **Estado actual**: `.env.local` tiene `ENABLE_EMERGENCY_AUTH=false` y `EMERGENCY_AUTH_PASSWORD_HASH=` vacío. OK por ahora, pero el código existe en prod-build y un cambio en `.env` (descuido, leak, restore antiguo) lo reactiva.
- **Mapping**:
  - OWASP A07 (Auth failures), A04 (Insecure design)
  - NIST SP 800-53 AC-2(7) (privileged accounts), IA-2
  - MITRE ATT&CK T1078.001 (Default accounts), T1556 (Modify Authentication Process)
- **Fix**:
  1. Hard-block en build prod:
     ```ts
     const emergencyAuthEnabled = () =>
       process.env.NODE_ENV !== "production" &&
       process.env.ENABLE_EMERGENCY_AUTH === "true";
     ```
  2. Eliminar fallback DB-down (un DB down debe **denegar**, no abrir)
  3. Per-account hash (sin clave maestra compartida)
  4. Audit-alert SEVERITY=HIGH en cada uso
  5. Eliminar `EMERGENCY_AUTH_PASSWORD` plano de `.env.example`
- **Esfuerzo**: 2-4 horas

---

#### CRIT-6. Audit log sin IP/User-Agent + sin tamper-evidence + sin eventos críticos

- **Severidad**: CRITICAL · **Confianza**: 10/10
- **Confluencia**: OWASP C-4 + M-7 · Compliance F9 · NIST F-05
- **Archivos**:
  - `src/lib/audit.ts:18-32` — `registrarAudit()` acepta `ip`/`userAgent` pero `requireActionActor` **nunca los propaga**
  - `src/db/schema.ts:705-727` — `auditLogs` sin hash chain; app DB role tiene `DELETE` por defecto
  - `src/db/schema.ts:45-61` — `auditAccionEnum` **NO incluye**: `eliminar`, `eliminar_masivo`, `escalacion_privilegio`, `cambio_rol`, `acceso_denegado`, `rate_limit_block`, `account_lockout`, `export_masivo_datos_personales`, `emergency_auth_used`, `auditoria_consultada`, `backup_creado/restaurado`
- **Exploit**: forense post-incidente imposible. Tras compromiso (CRIT-1 + CRIT-3), atacante con sesión admin de 90 días (HIGH-2) realiza acciones sin IP/UA registrados → atribución imposible. Si compromete DB, borra rastros con `DELETE FROM audit_logs WHERE user_id = ...`.
- **Mapping**:
  - OWASP A09:2021 (Security Logging & Monitoring Failures)
  - ASVS V7.1.3, V7.2.1, V7.3.3
  - NIST SP 800-53 AU-2 (event logging), AU-3 (content), AU-9 (protection)
  - MITRE ATT&CK T1070.002 (Indicator Removal: Clear Logs)
  - Ley 21.459 art. 9 (notificación CSIRT con evidencia)
- **Fix**:
  1. Propagar headers desde server actions:
     ```ts
     import { headers } from "next/headers";
     const h = await headers();
     const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
     const ua = h.get("user-agent") ?? null;
     await registrarAudit({ ..., ip, userAgent: ua });
     ```
  2. Agregar acciones faltantes al enum
  3. Hash chain: trigger Postgres que calcula `SHA256(prev_hash || row)` o append-only sink (S3 Object Lock, Loki)
  4. Permisos Postgres:
     ```sql
     REVOKE UPDATE, DELETE ON audit_logs FROM otec_app_role;
     ```
  5. Shipper out-of-band (Loki, Better Stack, CloudWatch)
- **Esfuerzo**: 3-4 días

---

#### CRIT-7. Backups VPS rotos (0 bytes) sin alerta + sin cifrado + sin offsite

- **Severidad**: CRITICAL · **Confianza**: 9/10
- **Confluencia**: NIST F-03
- **Evidencia**:
  ```
  backups/backup_pre_marcha_20260516_0402.dump   484K  (válido, único)
  backups/pre-marcha-blanca-2026-05-16-1459.dump   0   ← FALLO silencioso
  backups/dump.err                                  0   ← log vacío
  ```
- **Estado actual**:
  - No hay cron de backup automatizado
  - Sin cifrado (`gpg`, `openssl enc`)
  - Sin offsite (S3, Backblaze) — single VPS = single point of failure
  - Sin test de restore documentado
  - RPO/RTO no definidos
- **Exploit**: ransomware en VPS, drop accidental por admin, escalación desde web → **pérdida total irreversible**. Sin backups offsite, el cliente OTEC pierde 324 alumnos, historial académico, certificados, finanzas.
- **Mapping**:
  - NIST CSF RC.RP-01, PR.IP-04, PR.DS-01
  - NIST SP 800-53 CP-9 (backups), CP-10 (recovery), SC-28 (protection at rest)
  - CIS Controls 11.1, 11.2, 11.3, 11.4, 11.5
  - MITRE ATT&CK T1530, T1486 (Data Encrypted for Impact)
- **Fix** — `/etc/cron.d/otec-backup`:
  ```bash
  0 3 * * * impulsate /usr/local/bin/backup-otec.sh
  ```
  Script `backup-otec.sh`:
  ```bash
  #!/usr/bin/env bash
  set -euo pipefail
  STAMP=$(date +%F-%H%M)
  DEST=/home/impulsate/intranet-otec/backups/otec-${STAMP}.dump.gpg
  PGPASSWORD=$DB_PASS pg_dump -h 127.0.0.1 -p 5432 -U otec -d otec_db -F c \
    | gpg --batch --yes --encrypt --recipient backup@miotec.cl \
    > "$DEST"
  SIZE=$(stat -c %s "$DEST")
  if [ "$SIZE" -lt 100000 ]; then
    curl -X POST "$ALERT_WEBHOOK" -d "{\"text\":\"⚠ Backup OTEC < 100KB: $DEST\"}"
    exit 1
  fi
  # Upload S3 con versionado + object lock
  rclone copy "$DEST" s3:otec-backups/daily/ --immutable
  # Rotar: retención 7d local, 30d S3 estándar, 365d Glacier
  find /home/impulsate/intranet-otec/backups -name 'otec-*.dump.gpg' -mtime +7 -delete
  ```
- **Test restore mensual** documentado en runbook.
- **Esfuerzo**: 1 día (script + S3 setup + key GPG + test)

---

### 4.2 🟠 HIGH técnico (P1 — 30 días)

#### HIGH-1. Bulk import bcrypt cost 10 (degradado del 12 normal)

- **Archivo**: `src/app/api/internal/import-alumnos/route.ts:905` (`bcrypt.hash(pin, 10)`)
- **Inconsistencia**: 8 ocurrencias `cost 12` en `usuarios.ts`, una excepción en bulk import (commit `0b4f186`)
- **Fix**: revertir a cost 12; si bulk lento → worker batched fuera del request
- **Esfuerzo**: 1 LOC + test latencia

#### HIGH-2. Sesión JWT 90 días sin revocación

- **Archivo**: `src/auth.ts:242` (`SESSION_MAX_AGE_SECONDS = 90 * 24 * 60 * 60`)
- **Impacto**: usuario desactivado, RUT cambiado, rol degradado → sesión válida 3 meses. `jwt()` callback (líneas 587-622) no relee DB.
- **Fix**:
  - `maxAge: 28800` (8h) staff, `2592000` (30d) alumno
  - Columna `usuarios.tokenVersion int default 0`
  - `jwt()` callback: si `token.tokenVersion !== user.tokenVersion` → invalidar
  - Bumpear `tokenVersion` en: `desactivarUsuario`, `resetearPassword`, `cambiarRol`, `cambiarPin`
- **Esfuerzo**: 1 día (migración + callback + actions)

#### HIGH-3. Self-issued cert "alumno regular" no valida `estado_pago`

- **Archivo**: `src/actions/certificados.ts:586-758` (`emitirCertificadoAlumnoRegular`)
- **Falta**: gate `estadoPago ∈ ('pagado', 'becado')` que sí tiene el admin path (`solicitudes-documentos.ts:130-148`)
- **Exploit**: alumno en mora auto-emite certificado → lo presenta a tercero (asignación familiar, milicia, banco) → fraude documental
- **Fix**: reutilizar `evaluarElegibilidadAlumnoRegular()` que ya existe; rate-limit 3/día por alumno
- **Esfuerzo**: 2 horas

#### HIGH-4. Open redirect vía `x-forwarded-host` + callback `//evil.com`

- **Archivos**: `src/middleware.ts:81-95`, `src/auth.ts:557-586`
- **Vulnerabilidad**: `if (url.startsWith("/"))` acepta `//attacker.com/phish` que el navegador interpreta como protocol-relative
- **Fix**:
  ```ts
  if (url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\")) {
    return `${safeBaseUrl}${url}`;
  }
  // o mejor:
  try {
    const target = new URL(url, safeBaseUrl);
    if (target.origin === safeBaseUrl) return target.toString();
    return safeBaseUrl;
  } catch { return safeBaseUrl; }
  ```
  Hacer `AUTH_URL` mandatorio en prod.
- **Esfuerzo**: 2 horas

#### HIGH-5. `iniciarSesionAlumnoAction(rut)` sin PIN + enumeración

- **Archivo**: `src/actions/auth.ts:5-10` (`signIn("alumno-rut", { rut })` sin PIN)
- **Adicional**: `src/auth.ts:351` motivos distintos `pin_invalido` vs `usuario_no_encontrado` → enumeración via audit. Timing: `bcrypt.compare` solo si RUT existe (~100ms gap)
- **Fix**:
  - Eliminar `iniciarSesionAlumnoAction` (no usado)
  - Simular `bcrypt.compare` contra hash dummy si RUT no existe (constant-time)
  - Unificar motivo audit a `login_fail` para externos
- **Esfuerzo**: 3 horas

#### HIGH-6. `actualizarAccesosCursoAction` raw `db.execute(sql\`\`)` interpola input

- **Archivo**: `src/actions/accesos-documentos.ts:326-358`
- **Riesgo actual**: bajo (Drizzle parametriza), pero `actor.userId` interpolado sin validar UUID; refactor futuro puede agregar campo string → SQL injection
- **Fix**: refactor a `db.insert(...).onConflictDoUpdate(...)` como el sibling action
- **Esfuerzo**: 1 hora

#### HIGH-7. CSP con `'unsafe-inline'` permanente

- **Archivo**: `next.config.mjs:4-5`
- **Vulnerabilidad**: cualquier XSS futuro = bypass directo del CSP. `httpOnly` cookie no protege contra DOM scraping
- **Fix**: nonce per-request en middleware + `'strict-dynamic'`:
  ```ts
  // middleware.ts
  const nonce = crypto.randomBytes(16).toString("base64");
  const csp = `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; style-src 'self' 'unsafe-inline'`;
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("x-nonce", nonce);
  ```
- **Esfuerzo**: 1 día (config + remoción inline scripts existentes)

#### HIGH-8. Puerto 3000 expuesto sin firewall

- **Archivo**: `ecosystem.config.cjs:38` — `PORT: 3000` sin `HOST: 127.0.0.1`
- **Verificación**: `ss -ltn | grep 3000` mostró `LISTEN 0.0.0.0:3000` → accesible desde internet
- **Fix**:
  - `ecosystem.config.cjs`: añadir `env: { ..., HOST: "127.0.0.1" }`
  - UFW: `ufw default deny incoming; ufw allow 22,80,443/tcp; ufw deny 3000`
  - fail2ban: jail `nginx-noscript`, `sshd`, custom para `/login`
- **Esfuerzo**: 2 horas

#### HIGH-9. Secrets en `.env.local` propagados a env de PM2

- **Archivo**: `ecosystem.config.cjs:4-23` (parser custom inyecta todo `.env.local`)
- **Visibilidad**: `pm2 env <id>` y `/proc/<pid>/environ` accesible por mismo UID
- **Secrets afectados**: `AUTH_SECRET`, `EMERGENCY_AUTH_PASSWORD_HASH`, `SMTP_PASS` (Brevo), `RUT_SALT`, `DATABASE_URL` (creds `otec:otec` por default)
- **Exploit**: RCE de bajo privilegio en mismo UID → lee todos los secrets. `AUTH_SECRET` filtrado → forge JWT admin × 90 días.
- **Fix**:
  - `chmod 600 .env.local`, owner = user de PM2, no world-readable
  - Migrar a sops+age, doppler, infisical, o `systemd LoadCredential`
  - Rotar `AUTH_SECRET`, password Postgres (eliminar `otec:otec`), `SMTP_PASS`
- **Esfuerzo**: 1-2 días (setup vault + migración + rotación)

#### HIGH-10. PII sin cifrar at-rest + Postgres SSL `rejectUnauthorized: false`

- **Archivos**:
  - `src/db/schema.ts:135-158` — RUT/email/teléfono en `text` plano
  - `src/db/index.ts:34` — `ssl: { rejectUnauthorized: false }` → MITM trivial si Postgres no es localhost
- **Fix**:
  - LUKS disco del VPS (cifrado de disco completo)
  - `pgcrypto PGP_SYM_ENCRYPT` para email/teléfono (campos no usados como clave de búsqueda)
  - `ssl: { rejectUnauthorized: true, ca: fs.readFileSync(...) }`
  - Tokenizar RUT en logs (`12.***.678-5`)
- **Esfuerzo**: 3 días (LUKS requiere downtime planificado)

#### HIGH-11. Sin MFA/2FA para admin

- **Riesgo**: `SUPERADMIN_EMAILS` acceden a PII de 324+ alumnos, capacidad reset passwords, generar certificados, exportar datos. Un solo password comprometido = takeover completo.
- **Fix**: TOTP (`otplib`) obligatorio rol `admin`; opcional `docente`; QR setup en primer login admin
- **Esfuerzo**: 2 días (tabla `usuarios.totp_secret`, UI setup, validación en signIn)

#### HIGH-12. NextAuth `5.0.0-beta.30` en producción

- **Archivo**: `package.json:31`
- **Riesgo**: beta con CVE-class issues durante ciclo (cookie/CSRF handling). ASVS V14.2.1 violado.
- **Fix**: pin exacto `"next-auth": "5.0.0-beta.30"` (sin caret); upgrade GA cuando esté disponible; Dependabot/Renovate activo
- **Esfuerzo**: 1 hora pin, upgrade a GA cuando salga

#### HIGH-13. Hard-delete `eliminarSolicitudesResueltasAction`

- **Archivo**: `src/actions/solicitudes-documentos.ts:688-721`
- **Riesgo**: misclick o atacante hide tracks → cero recuperación
- **Fix**: soft-delete (`eliminadoAt`/`eliminadoPor`) + confirmación typed (escribir "ELIMINAR")
- **Esfuerzo**: 2 horas

---

### 4.3 🟠 HIGH regulatorio — Compliance Chile (vigencia Ley 21.719 Dic 2026)

#### REG-1. Sin consentimiento informado (Ley 19.628 art. 4 · Ley 21.719 art. 12)

- **Evidencia**: no existe `/politica-privacidad`, no hay checkbox en `crearAlumnoAction`, no hay columna `usuarios.consentimientoAt`
- **Riesgo**: bajo Ley 21.719 los titulares pueden exigir prueba documental → base legal anulable → multa hasta 20 000 UTM
- **Fix**:
  1. Crear página pública `/politica-privacidad` con: responsable (OTEC), finalidad, base legal, categorías destinatarios (SENCE, OTIC), plazo conservación, derechos ARCO, contacto DPO
  2. Schema: `usuarios.consentimientoAt timestamptz`, `consentimientoVersion text`
  3. Forzar aceptación en primer login (modal bloqueante)
- **Esfuerzo**: 2-3 días

#### REG-2. Sin derechos ARCO ni portabilidad (Ley 19.628 art. 12-15 · Ley 21.719 art. 4-9)

- **Evidencia**: `/alumno/perfil` solo lectura; sin endpoint export JSON; sin flujo solicitud eliminación
- **Fix**:
  1. `/alumno/perfil`: permitir editar `email`, `telefono`, `avatarUrl` (audit)
  2. `GET /api/alumno/mis-datos/export` JSON con todas las tablas asociadas al alumno
  3. Flujo "Solicitar eliminación": crear `solicitudes_documentos.tipo='eliminacion_datos'` → handle admin
- **Esfuerzo**: 3-4 días

#### REG-3. DPO no designado (Ley 21.719 art. 49)

- **Riesgo**: sujeto obligado (OTEC > 100 alumnos = "gran escala"). Sin DPO = infracción gravísima. Multa hasta 20 000 UTM ≈ **CLP 1.300 millones**.
- **Fix**:
  1. Designar DPO (puede ser externo contratado, ~CLP 500 K/mes)
  2. `docs/REGISTRO_ACTIVIDADES_TRATAMIENTO.md` (RAT obligatorio art. 15)
  3. Publicar email DPO en footer + en política privacidad
- **Esfuerzo**: 1 semana setup + contratación

#### REG-4. Sin política de retención (Ley 19.628 art. 6 · SENCE 5 años)

- **Evidencia**: `audit_logs`, `finanzas`, `usuarios.eliminadoAt` indefinidos
- **Fix** — matriz de retención:

  | Entidad | Retención | Acción |
  |---------|-----------|--------|
  | `usuarios` alumno | 5 años post-egreso (SENCE) | Anonimizar |
  | `audit_logs` | 6 años (contabilidad) | Append-only sink |
  | `finanzas` | 6 años (SII) | Archive cold storage |
  | `encuestas` | Cierre del periodo | Anonimizar respuestas |
  | `matriculas` finalizadas | 5 años | Mantener para historial |

  Cron `scripts/retention-purge.ts`; columna `purgadoAt`; REDACT a `[REDACTED-AAAA]` en PII directa.
- **Esfuerzo**: 3-4 días

#### REG-5. Pseudo-eliminación incumple derecho cancelación (Ley 21.719 art. 6)

- **Archivo**: `src/actions/usuarios.ts:1657-1740` — comment explícito "baja definitiva logica (sin hard-delete)"
- **Riesgo**: alumno ejerce derecho cancelación, OTEC no puede honrarlo (preserva RUT/nombre/email/teléfono permanentemente)
- **Fix**: separar:
  - `desactivarUsuario` (mantiene historial académico — defendible por obligación SENCE)
  - `anonimizarUsuario` (sustituye PII por placeholder, mantiene FKs) — ejecutar 5 años post-`eliminadoAt`
- **Esfuerzo**: 2 días

#### REG-6. Sin runbook notificación incidentes (Ley 21.459 art. 9 · Ley 21.719 art. 17)

- **Obligación**: notificar Agencia + titular en **72 horas** tras brecha
- **Fix**: crear `docs/security/INCIDENT_RESPONSE.md` con:
  - Flujo: detección → contención → evaluación impacto → notificación
  - Contactos: CSIRT Nacional `soc@csirt.gob.cl`, Agencia Protección Datos (cuando se constituya 2026), DPO interno
  - Plantilla notificación brecha (Ley 21.719 art. 17 contenido mínimo)
  - Ejercicio anual (tabletop exercise)
- **Esfuerzo**: 1 semana

#### REG-7. Sin GOVERN (NIST CSF 2.0)

- **Faltantes**: threat model, security policy, data classification, asset inventory, designated security owner
- **Memoria del proyecto** documenta `feedback_cliente_otec.md` "no forzar cambio PIN" — riesgo no aceptado documentalmente
- **Fix**: crear `docs/security/`:
  - `THREAT_MODEL.md` (STRIDE sobre login, server actions, import)
  - `DATA_CLASSIFICATION.md` (Confidencial / Restringido / Interno / Público)
  - `SECURITY_POLICY.md`
  - `ASSET_INVENTORY.md`
  - `RISK_ACCEPTANCE_MEMO_2026-05-16.md` firmado por cliente + DPO (ver sección 8)
- **Esfuerzo**: 1 semana

---

### 4.4 🟡 MEDIUM (P2 — 60 días)

| ID | Finding | Archivo | Fix | Esfuerzo |
|----|---------|---------|-----|----------|
| MED-1 | `X-Forwarded-For` sin proxy trust → IP spoofing rate-limit + audit | `src/middleware.ts:28-36` | Trust solo último (o N-th) en XFF; Apache overwrite | 1h |
| MED-2 | Push subscribe acepta endpoint arbitrario (SSRF parcial vía web-push) | `src/app/api/push/subscribe/route.ts` | Whitelist `fcm.googleapis.com`, `*.push.apple.com`, `updates.push.services.mozilla.com` | 2h |
| MED-3 | UUID no validado en `obtenerHistorialEstadoAlumno`, `cambiarEstadoAlumno` | `src/actions/usuarios.ts:2177-2255` | `z.string().uuid()` parse al top de cada action | 2h |
| MED-4 | Cambio PIN sin notif email + sin invalidar sesiones | `src/actions/usuarios.ts:1970-2030` | Enviar email "tu PIN cambió", bump `tokenVersion` (depende HIGH-2) | 2h |
| MED-5 | Reset password retorna cleartext en response + sin email al titular | `src/actions/usuarios.ts:2102` | Email al usuario con OTP/token; no mostrar password al admin | 4h |
| MED-6 | Cookie `__Secure-` no `__Host-` + sameSite `lax` para acciones críticas | `src/auth.ts:255-264` | `__Host-` prefix; `sameSite: "strict"` para staff | 1h |
| MED-7 | Sin `serverActions.allowedOrigins` configurado | `next.config.mjs` | `experimental: { serverActions: { allowedOrigins: ['intranet.miotecimpulsate.cl'] } }` | 30min |
| MED-8 | `comprobanteUrl` finanzas + `archivoUrl` entregas sin garantía control acceso | `src/db/schema.ts:638, 859, 881` | Servir vía `/api/files/[...path]` con verificación rol/matrícula | 1d |
| MED-9 | `DATABASE_URL` fallback `otec:otec` hardcoded en scripts | `scripts/*.mjs` | Throw si env vacío; placeholder `CHANGE_ME` en `.env.example` | 1h |
| MED-10 | Sin pipeline CVE scan | `.github/workflows/` ausente | `pnpm audit --audit-level=high` + `osv-scanner` + Dependabot/Renovate en CI | 4h |
| MED-11 | Dos lockfiles (`package-lock.json` + `pnpm-lock.yaml`) → drift | repo root | Eliminar `package-lock.json` (proyecto usa pnpm) | 5min |

---

## 5. Plan de remediación priorizado

### 5.1 Semana 1 — Hotfixes CRITICAL (bloquean producción "segura")

| # | Task | ID | Owner | Esfuerzo | Verificación |
|---|------|----|----|----------|---------------|
| 1 | PIN aleatorio + force change **OR** memo aceptación riesgo firmado | CRIT-1 | Dev + Cliente | 1d | Test: alumno nuevo recibe PIN OOB, no puede entrar a `/alumno` sin cambiarlo |
| 2 | `Math.random()` → `crypto.randomInt` | CRIT-3 | Dev | 30min | Code review, generar 1000 passwords y verificar distribución estadística |
| 3 | Enmascarar RUT en `/verificar` | CRIT-4 | Dev | 4h | Pentest: certificado válido no muestra RUT completo sin challenge |
| 4 | Audit log IP/UA + revoke UPDATE/DELETE | CRIT-6 | Dev + DBA | 1d | SQL `SELECT ip, user_agent FROM audit_logs LIMIT 10` — no NULL |
| 5 | Hard-block emergency auth en prod | CRIT-5 | Dev | 2h | `NODE_ENV=production` + `ENABLE_EMERGENCY_AUTH=true` → emergency deshabilitado |
| 6 | Cron backup `pg_dump \| gpg` + alerta tamaño + S3 offsite | CRIT-7 | Ops | 1d | Test restore en staging desde S3 |
| 7 | Conectar `rateLimit.ts` (Postgres) + lockout por cuenta | CRIT-2 | Dev | 2d | Test: 6 fallos consecutivos → cuenta bloqueada 15 min |

**Total semana 1**: ~6 días-dev. Bloquea release segura. Si el cliente acepta CRIT-1 vía memo, baja a ~5 días.

### 5.2 Semanas 2-4 — HIGH técnico

| # | Task | ID | Esfuerzo |
|---|------|----|----|
| 8 | JWT 90d → 8h staff + `tokenVersion` invalidation | HIGH-2 | 1d |
| 9 | Eliminar `iniciarSesionAlumnoAction` sin PIN + constant-time auth | HIGH-5 | 3h |
| 10 | Self-issued cert valida `estadoPago` + rate-limit 3/día | HIGH-3 | 2h |
| 11 | Open redirect fix middleware + auth.ts callback | HIGH-4 | 2h |
| 12 | Bulk import bcrypt cost 12 + worker batched | HIGH-1 | 4h |
| 13 | `HOST=127.0.0.1` + UFW + fail2ban | HIGH-8 | 2h |
| 14 | CSP nonce-based, eliminar `unsafe-inline` | HIGH-7 | 1d |
| 15 | Secrets de PM2 env → vault (sops+age) + rotar AUTH_SECRET | HIGH-9 | 2d |
| 16 | MFA TOTP obligatorio admin | HIGH-11 | 2d |
| 17 | Reset password vía email/OTP, no return cleartext | MED-5 | 4h |
| 18 | Hard-delete → soft-delete en `eliminarSolicitudesResueltas` | HIGH-13 | 2h |
| 19 | `actualizarAccesosCursoAction` refactor a query builder | HIGH-6 | 1h |
| 20 | Pin NextAuth exacto + Dependabot | HIGH-12 | 1h |

**Total semanas 2-4**: ~8-10 días-dev.

### 5.3 Mes 2-3 — Hardening + Compliance Chile

| # | Task | ID | Esfuerzo |
|---|------|----|----|
| 21 | DPO contratado (puede externo) | REG-3 | 1 semana setup |
| 22 | Política privacidad pública + checkbox consentimiento + columna `consentimientoAt` | REG-1 | 3d |
| 23 | RAT (`docs/REGISTRO_ACTIVIDADES_TRATAMIENTO.md`) | REG-3 | 2d |
| 24 | Endpoint `/api/alumno/mis-datos/export` + edición perfil autoservicio | REG-2 | 4d |
| 25 | `anonimizarUsuarioAction` + cron retención 5a | REG-4, REG-5 | 3d |
| 26 | IR runbook (`docs/security/INCIDENT_RESPONSE.md`) + ejercicio | REG-6 | 1 semana |
| 27 | `docs/security/` completo (threat model STRIDE, política, asset inventory, data classification, memo aceptación riesgos firmado) | REG-7 | 1 semana |
| 28 | pgcrypto email/teléfono + LUKS disco VPS | HIGH-10 | 3d |
| 29 | `pgSSL: { rejectUnauthorized: true, ca: ... }` | HIGH-10 | 2h |
| 30 | CI: `pnpm audit` + OSV scanner + Dependabot + branch protection | MED-10 | 4h |
| 31 | Refactor MED-1 (XFF trust), MED-2 (SSRF push), MED-3 (UUID validate), MED-4 (notif cambio PIN), MED-6 (`__Host-`), MED-7 (allowedOrigins), MED-8 (file ACL), MED-9 (DB_URL fallback), MED-11 (lockfile) | MED-* | 2d total |

**Total mes 2-3**: ~5-6 semanas trabajo (compliance + hardening en paralelo).

### 5.4 Continuo

- Test restore backup **mensual**
- `pnpm audit` + escaneo CVE **semanal** (Dependabot/Renovate)
- Tabletop exercise IR **trimestral**
- Revisión accesos privilegiados **trimestral**
- Re-auditoría externa **anual**

---

## 6. Matriz de compliance Chile

| Norma | Requisito | Estado actual | Acción requerida |
|-------|-----------|----------------|-------------------|
| **Ley 19.628 art. 4** | Consentimiento expreso para tratar PII | ❌ ausente | REG-1 |
| **Ley 19.628 art. 6** | Cancelación cuando finalidad cumplida | ❌ ausente | REG-4, REG-5 |
| **Ley 19.628 art. 9** | Finalidad declarada al titular | ❌ ausente | REG-1 |
| **Ley 19.628 art. 11** | Deber de cuidado, medidas técnicas | ⚠️ parcial (HTTPS sí, bcrypt sí pero cost variable, PIN derivado RUT) | CRIT-1, CRIT-2, HIGH-1, HIGH-10 |
| **Ley 19.628 art. 12-15** | Derechos ARCO | ❌ ausente | REG-2 |
| **Ley 19.628 art. 16** | Plazo 2 días hábiles para responder ARCO | ❌ sin proceso | REG-2 + REG-6 |
| **Ley 21.096 (CPR art. 19)** | Datos personales como derecho constitucional | ✅ no se vulnera directo | — |
| **Ley 21.459 art. 9** | Notificación incidentes a CSIRT Nacional | ❌ sin runbook | REG-6 |
| **Ley 21.719 art. 12** | Consentimiento libre, específico, informado | ❌ ausente | REG-1 |
| **Ley 21.719 art. 14** | Medidas de seguridad apropiadas al riesgo | ⚠️ múltiples gaps | CRIT-1, CRIT-2, CRIT-3, CRIT-6 |
| **Ley 21.719 art. 15** | Registro Actividades Tratamiento (RAT) | ❌ ausente | REG-3 |
| **Ley 21.719 art. 17** | Notificación brechas en 72h | ❌ sin proceso | REG-6 |
| **Ley 21.719 art. 49** | DPO obligatorio (gran escala) | ❌ no designado | REG-3 |
| **Ley 21.719 art. 4-9** | Portabilidad, supresión | ❌ ausente | REG-2 |
| **Reglamento SENCE 19.518** | Custodia registros académicos 5 años | ✅ DB persiste indefinida (defendible) — pero falta política formal | REG-4 |
| **Ley 21.180** Transformación Digital | ⚠️ aplica si OTEC integra con SENCE online | a evaluar | Pendiente |

**Estimación multa potencial Ley 21.719 (infracciones acumuladas)**: hasta **20 000 UTM = ~CLP 1.300 millones** por infracción gravísima. Sin DPO + sin consentimiento + sin RAT + brecha por CRIT-1 = riesgo agregado considerable.

---

## 7. Mapping a frameworks internacionales

### 7.1 OWASP Top 10 2021 cobertura

| Categoría | Findings |
|-----------|----------|
| **A01** Broken Access Control | CRIT-4, HIGH-4, HIGH-5, MED-3, MED-8 |
| **A02** Cryptographic Failures | CRIT-3, HIGH-1, HIGH-9, HIGH-10 |
| **A03** Injection | HIGH-6 (defense-in-depth) |
| **A04** Insecure Design | CRIT-5, HIGH-3 |
| **A05** Security Misconfiguration | HIGH-7, HIGH-8, MED-7 |
| **A06** Vulnerable Components | HIGH-12, MED-10 |
| **A07** ID & Auth Failures | CRIT-1, CRIT-2, HIGH-2, HIGH-11, MED-4 |
| **A08** Data Integrity Failures | HIGH-13, CRIT-7 |
| **A09** Security Logging Failures | CRIT-6 |
| **A10** SSRF | MED-2 |

### 7.2 NIST CSF 2.0 funciones

| Función | Estado | Gaps |
|---------|--------|------|
| **GV** Govern | ❌ ausente | REG-7, REG-3, sin threat model |
| **ID** Identify | ❌ parcial | sin asset inventory, sin RAT, sin data classification |
| **PR** Protect | ⚠️ parcial | CRIT-1/2/3, HIGH-1/2/8/9/10/11 |
| **DE** Detect | ❌ ausente | CRIT-6, sin SIEM, sin alertas |
| **RS** Respond | ❌ ausente | REG-6, sin IR plan |
| **RC** Recover | ❌ crítico | CRIT-7, RPO/RTO indefinidos |

### 7.3 CIS Controls v8 (IG1 mínimo)

| Control | Estado | Gap |
|---------|--------|-----|
| CIS 3 Data Protection | ❌ | HIGH-10 (no encryption at rest) |
| CIS 4 Secure Config | ⚠️ | HIGH-7, HIGH-8, MED-6/7 |
| CIS 5 Account Mgmt | ⚠️ | HIGH-2 (90d sin revocación) |
| CIS 6 Access Control | ⚠️ | HIGH-11 (sin MFA) |
| CIS 8 Audit Logs | ❌ | CRIT-6 |
| CIS 11 Data Recovery | ❌ | CRIT-7 |
| CIS 12 Network | ⚠️ | HIGH-8 (puerto 3000) |
| CIS 13 Monitoring | ❌ | sin IDS, sin SIEM |
| CIS 16 Application Security | ⚠️ | MED-10 (sin CVE scan CI) |
| CIS 17 IR Mgmt | ❌ | REG-6 |

### 7.4 MITRE ATT&CK — TTPs en superficie de ataque

| Técnica | Aplicable | Mitigación |
|---------|-----------|-------------|
| **T1078** Valid Accounts | ✅ CRIT-1, CRIT-5 | MFA, PIN random, eliminar backdoor |
| **T1078.003** Local Accounts | ✅ CRIT-1 | force change PIN |
| **T1110** Brute Force | ✅ CRIT-2 | rate-limit Postgres + lockout |
| **T1110.001** Password Guessing | ✅ CRIT-1+2 | combinado arriba |
| **T1190** Exploit Public-Facing App | ✅ HIGH-7/8/12 | CSP, firewall, deps actualizadas |
| **T1530** Data from Cloud Storage | ✅ CRIT-7 | backups cifrados offsite |
| **T1539** Steal Web Session Cookie | ✅ HIGH-2 | JWT corto + revocación |
| **T1556** Modify Authentication | ✅ CRIT-5 | eliminar emergency fallback |
| **T1486** Data Encrypted for Impact (ransomware) | ✅ CRIT-7 | backups offsite + cifrados |
| **T1070.002** Indicator Removal: Clear Logs | ✅ CRIT-6 | revoke DELETE + hash chain |
| **T1185** Browser Session Hijacking | ⚠️ HIGH-7 | CSP nonce |
| **T1552.001** Unsecured Credentials: Files | ✅ HIGH-9 | vault, permisos `.env.local` |
| **T1195.002** Software Supply Chain Compromise | ✅ HIGH-12, MED-10 | Dependabot, CVE scan |

---

## 8. Riesgos aceptados / decisiones del cliente

Esta sección documenta riesgos que el responsable del tratamiento (OTEC Impulsate, representado por Victor Salinas) **decide aceptar conscientemente** por razones comerciales/operacionales. La responsabilidad regulatoria y civil derivada de estos riesgos recae en el responsable del tratamiento, **no en el desarrollador**.

### 8.1 Memo de aceptación de riesgo — Plantilla

**Por incluir en `docs/security/RISK_ACCEPTANCE_MEMO_2026-05-16.md` firmado por cliente + DPO antes de cualquier release:**

> **Riesgo CRIT-1**: PIN inicial derivado del RUT, sin forzar cambio
>
> **Probabilidad**: ALTA. RUT chileno es público (carnet identidad, listas, redes sociales). Cualquier atacante con un listado de RUTs OTEC tiene acceso a todas las cuentas alumno que no hayan cambiado PIN voluntariamente.
>
> **Impacto**: ALTO. Compromiso masivo de cuentas alumno (324 en periodo Mayo-Junio 2026), exposición de datos académicos, posibilidad de auto-emitir certificados fraudulentos, fraude documental ante terceros (asignaciones familiares, milicia, empleadores).
>
> **Mitigación técnica disponible**: PIN aleatorio 6 dígitos generado con CSPRNG, entrega out-of-band por email/SMS (Brevo ya integrado), cambio obligatorio en primer login enforzado por middleware.
>
> **Decisión del cliente**: ____________________________________________________________
> ____________________________________________________________________________________
>
> **Justificación comercial**: ___________________________________________________________
> ____________________________________________________________________________________
>
> **Compensación**: el cliente se compromete a:
> - [ ] Comunicar el riesgo a los titulares de datos (alumnos) en política de privacidad
> - [ ] Implementar MFA TOTP para staff (HIGH-11) que mantiene acceso completo
> - [ ] Notificar al CSIRT Nacional dentro de 72h cualquier brecha derivada
> - [ ] Asumir responsabilidad civil y administrativa derivada (Ley 19.628 art. 23, Ley 21.719 art. 67)
>
> **Firma cliente** (Victor Salinas): __________________  Fecha: __________
> **Firma DPO**: __________________________  Fecha: __________
> **Firma desarrollador** (asesor): __________________  Fecha: __________

### 8.2 Política recomendada para decisiones futuras

Cualquier decisión del cliente que reduzca controles de seguridad documentados en esta auditoría debe:
1. Quedar registrada en `docs/security/RISK_ACCEPTANCE_*.md`
2. Firmada por cliente + DPO + desarrollador
3. Re-evaluada anualmente
4. Documentada en política de privacidad pública si afecta a titulares

---

## 9. Recomendaciones de gobierno

### 9.1 Roles y responsabilidades sugeridos

| Rol | Responsable | Funciones |
|-----|-------------|-----------|
| **Responsable del tratamiento** | Victor Salinas (cliente OTEC) | Decisiones sobre datos, aceptación riesgos |
| **Encargado de Protección de Datos (DPO)** | A contratar | Cumplimiento Ley 21.719, contacto con titulares y Agencia |
| **Responsable de Seguridad de la Información** | A designar (puede ser DPO inicialmente) | Operación controles técnicos, IR coord |
| **Desarrollador** | Nicholas Lopetegui | Implementación técnica, documentación |
| **Administrador VPS / DBA** | A asignar (puede ser dev) | Backups, parches OS, accesos |

### 9.2 Documentos a crear en `docs/security/`

```
docs/security/
├── AUDITORIA_SEGURIDAD_2026-05-16.md     ← este archivo
├── THREAT_MODEL.md                        ← STRIDE sobre login, server actions, import
├── DATA_CLASSIFICATION.md                 ← Confidencial/Restringido/Interno/Público
├── ASSET_INVENTORY.md                     ← inventario sistemas + datos + flujos
├── SECURITY_POLICY.md                     ← política maestra
├── INCIDENT_RESPONSE.md                   ← runbook detección→notif 72h
├── BACKUP_POLICY.md                       ← RPO/RTO/retención/test restore
├── ACCESS_CONTROL_POLICY.md               ← roles, capabilities, RBAC review
├── RETENTION_POLICY.md                    ← matriz REG-4
├── REGISTRO_ACTIVIDADES_TRATAMIENTO.md    ← RAT Ley 21.719 art. 15
├── POLITICA_PRIVACIDAD_PUBLICA.md         ← versión que se publica en web
├── RISK_ACCEPTANCE_MEMO_*.md              ← memos firmados por decisión
└── runbooks/
    ├── BACKUP_RESTORE_TEST.md
    ├── KEY_ROTATION.md
    ├── INCIDENT_NOTIFICATION_TEMPLATE.md
    └── ONBOARDING_OFFBOARDING.md
```

### 9.3 Cadencia operativa propuesta

| Actividad | Frecuencia | Owner |
|-----------|-----------|-------|
| Test restore backup | Mensual | Ops |
| Revisión accesos privilegiados | Trimestral | DPO + Seg |
| Tabletop exercise IR | Trimestral | DPO + Seg |
| Re-auditoría externa | Anual | Cliente |
| `pnpm audit` + CVE review | Semanal (CI) | Dev |
| Rotación AUTH_SECRET, SMTP_PASS | Anual o post-incidente | Ops |
| Revisión memos aceptación riesgo | Anual | Cliente + DPO |

---

## 10. Anexos

### 10.1 Glosario

- **PII** (Personally Identifiable Information): datos personales que identifican a una persona
- **RUT** (Rol Único Tributario): identificador único chileno, considerado PII de baja confidencialidad
- **DPO** (Data Protection Officer): Encargado de Protección de Datos, art. 49 Ley 21.719
- **RAT**: Registro de Actividades de Tratamiento, art. 15 Ley 21.719
- **ARCO**: Acceso, Rectificación, Cancelación, Oposición — derechos del titular
- **CSPRNG**: Cryptographically Secure Pseudo-Random Number Generator
- **CSIRT**: Computer Security Incident Response Team (CSIRT Nacional Chile)
- **OTEC**: Organismo Técnico de Capacitación reconocido por SENCE
- **SENCE**: Servicio Nacional de Capacitación y Empleo
- **STRIDE**: framework threat modeling (Spoofing, Tampering, Repudiation, Information disclosure, DoS, Elevation)
- **TOTP** (Time-based One-Time Password): RFC 6238, 2FA estándar
- **BOLA** (Broken Object Level Auth): OWASP API #1 — falta validar ownership recurso
- **BOPLA** (Broken Object Property Level Auth): OWASP API #3 — leak de propiedades sensibles
- **IDOR** (Insecure Direct Object Reference): subcategoría de BOLA

### 10.2 Contactos regulatorios Chile

| Entidad | Email/URL | Contexto |
|---------|-----------|----------|
| **CSIRT Nacional** | `soc@csirt.gob.cl` · https://www.csirt.gob.cl | Notificación incidentes Ley 21.459 |
| **Agencia Protección Datos** (a constituirse Dic 2026) | TBD | Notificación brechas Ley 21.719 |
| **SENCE** | https://www.sence.gob.cl | OTEC registro, fiscalización |
| **Consejo Transparencia** | https://www.consejotransparencia.cl | Solo si OTEC público (no aplica) |

### 10.3 Comandos útiles para verificación

```bash
# Verificar headers seguridad producción
curl -sI https://intranet.miotecimpulsate.cl | grep -iE 'csp|strict-transport|x-frame|x-content|referrer-policy'

# Verificar puerto 3000 expuesto
nmap -p 3000 104.248.3.67

# Auditar deps
pnpm audit --audit-level=high

# Buscar usos de Math.random en codebase
grep -rn "Math\.random" src/

# Buscar SQL raw
grep -rn "db\.execute" src/

# Backup size check
find backups/ -name '*.dump*' -size +100k

# Test restore
gpg --decrypt backups/otec-latest.dump.gpg | pg_restore -d otec_test_restore -c

# Verificar audit logs con IP
psql -d otec_db -c "SELECT count(*) FROM audit_logs WHERE ip IS NULL;"

# Listar usuarios con pinCambiado=false (impacto CRIT-1)
psql -d otec_db -c "SELECT count(*) FROM usuarios WHERE rol='alumno' AND pin_cambiado=false AND activo=true;"
```

### 10.4 Referencias

- OWASP Top 10 2021: https://owasp.org/Top10/
- OWASP ASVS 4.0: https://github.com/OWASP/ASVS
- OWASP API Security 2023: https://owasp.org/API-Security/
- NIST CSF 2.0: https://www.nist.gov/cyberframework
- NIST SP 800-53 Rev. 5: https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final
- NIST SP 800-63B: https://pages.nist.gov/800-63-3/sp800-63b.html
- CIS Controls v8: https://www.cisecurity.org/controls/v8
- MITRE ATT&CK: https://attack.mitre.org/
- MITRE D3FEND: https://d3fend.mitre.org/
- CISA KEV Catalog: https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- Ley 19.628: https://www.bcn.cl/leychile/navegar?idNorma=141599
- Ley 21.719: https://www.bcn.cl/leychile/navegar?idNorma=1212306
- Ley 21.459: https://www.bcn.cl/leychile/navegar?idNorma=1177743

### 10.5 Historial de cambios

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-05-16 | Versión inicial auditoría multi-agente | Claude Code |
| 1.x | TBD | Tras remediación P0, re-validar findings | TBD |

---

## Firma de aceptación del informe

| Rol | Nombre | Fecha | Firma |
|-----|--------|-------|-------|
| Cliente (responsable del tratamiento) | Victor Salinas | __________ | __________ |
| Desarrollador / Asesor técnico | Nicholas Lopetegui | __________ | __________ |
| DPO designado (cuando aplique) | __________________ | __________ | __________ |

---

**FIN DEL DOCUMENTO**
