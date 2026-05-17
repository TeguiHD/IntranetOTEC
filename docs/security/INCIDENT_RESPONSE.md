# Runbook de Respuesta a Incidentes — IntranetOTEC

**Versión**: 0.1 (esqueleto inicial, requiere revisión + ejercicio)
**Fecha**: 2026-05-16
**Owner**: DPO + Responsable Seguridad
**Próxima revisión**: trimestral
**Base normativa**: Ley 21.459 art. 9, Ley 21.719 art. 17

---

## 1. Definiciones

- **Incidente de seguridad**: evento o serie de eventos que comprometen la confidencialidad, integridad o disponibilidad de información o sistemas.
- **Brecha de datos personales** (Ley 21.719 art. 17): violación de seguridad que produce destrucción, pérdida, alteración, comunicación o acceso no autorizado a datos personales.
- **Plazo notificación brecha**: **72 horas** desde detección.

## 2. Severidades

| Nivel | Criterio | Ejemplo |
|-------|----------|---------|
| **SEV-1** Crítico | Compromiso confirmado, datos personales expuestos, sistema inoperante | Exfiltración tabla `usuarios`, ransomware activo |
| **SEV-2** Alto | Compromiso parcial, datos sensibles afectados, sistema degradado | Compromiso cuenta admin, brute-force exitoso N cuentas |
| **SEV-3** Medio | Anomalía con indicios de compromiso, sin confirmación | Alertas múltiples login_fail, IPs sospechosas |
| **SEV-4** Bajo | Vulnerabilidad detectada, sin explotación observada | CVE alta en dep, hallazgo de auditoría |

## 3. Roles del equipo de respuesta

| Rol | Responsabilidad | Persona |
|-----|------------------|---------|
| **Incident Commander** | Coordina respuesta, decisiones | _(por designar)_ |
| **DPO** | Comunicación regulatoria, notificación titulares | _(por designar)_ |
| **Responsable Técnico** | Contención, evidencia, fix | Nicholas Lopetegui |
| **Responsable Comunicaciones** | Comunicación externa, prensa | _(por designar)_ |
| **Responsable Legal** | Asesoría regulatoria, civil | _(por designar)_ |

## 4. Flujo de respuesta

```
DETECCIÓN
   ↓
TRIAGE (clasificar severidad, < 1h)
   ↓
CONTENCIÓN (aislar, limitar daño, < 4h SEV-1/2)
   ↓
ERRADICACIÓN (eliminar causa raíz)
   ↓
RECUPERACIÓN (restaurar servicio)
   ↓
NOTIFICACIÓN (72h regulatorias si aplica)
   ↓
POST-MORTEM (lecciones aprendidas, sin culpas)
```

### 4.1 Detección — fuentes

- Alertas SIEM/Loki (a implementar)
- Logs `audit_logs` con eventos críticos (post CRIT-6 fix)
- Reportes de usuarios (formulario `/reportar-incidente` — a crear)
- Monitoring uptime
- Notificación de terceros (CERT-Cl, investigador externo)

### 4.2 Triage — preguntas iniciales

1. ¿Está activa la amenaza?
2. ¿Qué datos están afectados? (PII directa? finanzas? credenciales?)
3. ¿Cuántos titulares afectados?
4. ¿Es brecha de datos personales bajo Ley 21.719 art. 17?
5. ¿Severidad? (tabla §2)

### 4.3 Contención

- **Para compromiso de cuenta**: invalidar todas las sesiones del usuario (bumpear `tokenVersion` cuando HIGH-2 implementado)
- **Para acceso BD no autorizado**: rotar credenciales DB, revisar `audit_logs` (cuando CRIT-6 implementado), aislar VPS si necesario
- **Para ransomware**: aislar VPS (UFW deny ALL), preservar imagen para forense, restaurar desde backup offsite cifrado (cuando CRIT-7 implementado)
- **Para secret leak (`AUTH_SECRET`, SMTP, etc.)**: rotar inmediatamente, forzar logout de todos los usuarios (bumpear `tokenVersion`)

### 4.4 Notificación regulatoria

**Plazo: 72 horas desde detección de brecha de datos personales.**

Contenido mínimo (Ley 21.719 art. 17):
- Naturaleza de la brecha
- Categorías y número aproximado de titulares afectados
- Categorías y número aproximado de registros afectados
- Consecuencias probables
- Medidas adoptadas o propuestas
- Datos de contacto del DPO

#### Plantilla de notificación

```
Para: soc@csirt.gob.cl (Ley 21.459)
CC: [Agencia Protección Datos cuando se constituya - Ley 21.719]
Asunto: Notificación de incidente de seguridad — OTEC Impulsate — [SEV-X] — [fecha]

Identificación del responsable:
- Razón social: [OTEC Impulsate / razón social formal]
- RUT: [RUT empresa]
- Contacto DPO: [email DPO]
- Persona reportante: [nombre, cargo, contacto]

Fecha y hora de detección: [YYYY-MM-DD HH:MM]
Fecha y hora estimada de inicio: [YYYY-MM-DD HH:MM]

Naturaleza del incidente:
[Descripción técnica concisa: vector, sistema afectado, tipo de compromiso]

Datos personales afectados:
- Categorías: [RUT, nombre, email, datos académicos, finanzas, ...]
- Titulares afectados (estimado): [N alumnos / N docentes / N admin]
- Registros afectados (estimado): [N filas / N MB]

Consecuencias probables para los titulares:
[Riesgo de suplantación, fraude, daño reputacional, acceso a info académica/financiera]

Medidas de contención adoptadas:
[Cierre cuenta, rotación secrets, restore backup, parche, ...]

Medidas de mitigación a futuro:
[Acciones para prevenir recurrencia]

Notificación a titulares:
[ ] Realizada por: [canal] el [fecha]
[ ] Pendiente — programada: [fecha]
[ ] No requerida porque: [justificación]

Documentación adjunta:
- Logs relevantes
- Timeline detallado
- Plan de remediación
```

#### Notificación a titulares (alumnos/docentes afectados)

Si el riesgo es alto (Ley 21.719 art. 17 inc. 2°), notificación directa por email/SMS:

```
Asunto: [Importante] Notificación de seguridad — Intranet OTEC

Estimado(a) [nombre]:

Le informamos que el [fecha] detectamos un incidente de seguridad que pudo
haber afectado [datos específicos: su cuenta / sus datos académicos / ...].

Qué pasó: [descripción no técnica]
Qué hicimos: [contención, restauración]
Qué le recomendamos hacer:
  1. Cambiar su PIN ingresando a [URL]/cambiar-pin
  2. Revisar movimientos recientes en su cuenta
  3. Si detecta algo extraño, contactar a [email DPO]

Estamos a su disposición en [email DPO].

[OTEC Impulsate]
```

### 4.5 Post-mortem

Plantilla en `runbooks/POST_MORTEM_TEMPLATE.md` (a crear). Sin culpas. Foco en:
- Línea temporal
- Causa raíz (5 whys)
- Por qué la detección tomó X tiempo
- Acciones para reducir MTTD/MTTR
- Cambios en runbook

## 5. Ejercicios

### 5.1 Tabletop trimestral

Escenarios a rotar:
- **Q1**: Brute force exitoso sobre cuenta alumno
- **Q2**: Compromiso cuenta admin → exfiltración
- **Q3**: Ransomware VPS
- **Q4**: Leak `.env.local` en repo público

### 5.2 Restore test mensual

Documentado en `runbooks/BACKUP_RESTORE_TEST.md` (a crear).

## 6. Comunicación interna

Canal: _(definir — Slack, WhatsApp, email)_
Escalación: _(definir cadena)_

## 7. Lecciones aprendidas → backlog

Acciones derivadas de post-mortems se agregan a `docs/security/AUDITORIA_SEGURIDAD_*.md` próxima versión.

---

**TODO al implementar**:
- [ ] Definir Incident Commander y backup
- [ ] Definir DPO formal
- [ ] Crear formulario `/reportar-incidente`
- [ ] Configurar SIEM/alertas
- [ ] Ejecutar primer tabletop exercise
- [ ] Definir canal de comunicación interna
- [ ] Crear plantilla post-mortem
