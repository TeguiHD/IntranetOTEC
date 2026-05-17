# Memo de Aceptación de Riesgo de Seguridad

**Fecha**: 2026-05-16
**Documento base**: [AUDITORIA_SEGURIDAD_2026-05-16.md](./AUDITORIA_SEGURIDAD_2026-05-16.md)
**Versión**: 1.0 (plantilla pendiente de firma)

---

## Objeto

Este documento formaliza las decisiones del **responsable del tratamiento** (OTEC Impulsate, representado por Victor Salinas) respecto a riesgos de seguridad identificados en la auditoría del 2026-05-16, que el cliente decide **aceptar conscientemente** por razones comerciales/operacionales.

La responsabilidad regulatoria y civil derivada de los riesgos aquí aceptados recae en el **responsable del tratamiento**, según Ley 19.628 art. 23 y Ley 21.719 art. 67, **no en el desarrollador** que ha notificado los riesgos por escrito mediante este documento y la auditoría base.

---

## Riesgos sometidos a decisión

### Riesgo 1 — CRIT-1: PIN inicial derivado del RUT, sin forzar cambio

**Origen**:
- `src/lib/rut.ts:99-117` función `derivarPinPredeterminado()` retorna últimos 4 dígitos del cuerpo del RUT
- `src/app/api/internal/import-alumnos/route.ts:904` aplicado en bulk import
- `pinCambiado=false` por defecto, no enforzado en middleware
- Memoria del proyecto (`feedback_cliente_otec.md`) registra: cliente rechaza "fricción al login"

**Probabilidad**: ALTA
RUT chileno es PII de baja confidencialidad: aparece impreso en carnet de identidad, listas de cursos, certificados, redes sociales, registros públicos. Con un listado de RUTs (incluido el Excel "Listado Mayo - Junio.xlsx" que el cliente compartió por canal informal), cualquier atacante con conocimiento técnico básico puede iterar:

```bash
for rut in $(cat ruts.txt); do
  pin=${rut: -5:4}
  curl -s "$URL/api/auth/callback/alumno-rut" -d "rut=$rut&pin=$pin"
done
```

→ **acceso a 324 cuentas alumno** del periodo Mayo-Junio 2026.

**Impacto**: ALTO
- Exposición de datos académicos (notas, asistencia, observaciones docentes, encuestas) de 324+ alumnos
- Capacidad de auto-emitir certificados de "alumno regular" (CRIT-1 + HIGH-3) presentables a terceros (asignaciones familiares, milicia, empleadores, bancos) → **fraude documental**
- Compromiso de datos sensibles (mensajería, datos de contacto, dirección si registrada)
- Daño reputacional al OTEC y al cliente
- Riesgo de multa regulatoria bajo Ley 21.719 art. 14 (medidas de seguridad apropiadas al riesgo): **hasta 20 000 UTM (≈ CLP 1.300 millones)**

**Mitigación técnica disponible** (que el cliente rechaza implementar):
1. Generar PIN aleatorio criptográfico (`crypto.randomInt(100000, 1000000)`, 6 dígitos)
2. Entrega out-of-band por email/SMS (Brevo ya integrado en el sistema)
3. Forzar cambio en primer login mediante middleware (redirect a `/alumno/cambiar-pin`)
4. Bloquear PINs triviales (`123456`, fecha-nacimiento, últimos-4-RUT)

**Esfuerzo de implementación**: ~1 día de desarrollo, sin impacto en flujos existentes.

**Justificación comercial del cliente para aceptar el riesgo**:

```
[A completar por el cliente Victor Salinas con justificación específica.
 Ejemplos posibles —no exhaustivos—:
 - "El perfil del usuario alumno (adulto mayor / con baja alfabetización digital)
    hace que el cambio obligatorio de PIN incremente solicitudes de soporte
    técnico a un nivel inmanejable para el OTEC."
 - "El periodo de capacitación es corto (8 semanas) y el costo operativo de
    onboarding seguro supera el riesgo proyectado."
 - "Acepto el riesgo regulatorio en mi calidad de responsable del tratamiento."]

________________________________________________________________________________
________________________________________________________________________________
________________________________________________________________________________
________________________________________________________________________________
```

**Compensaciones que el cliente se compromete a implementar**:

- [ ] **C1**: Comunicar el riesgo a los titulares de datos en política de privacidad pública (REG-1)
- [ ] **C2**: Implementar MFA TOTP obligatorio para todo staff con rol admin o docente (HIGH-11) — limita el blast radius
- [ ] **C3**: Notificar al CSIRT Nacional (`soc@csirt.gob.cl`) y a los titulares afectados dentro de 72 horas ante cualquier brecha derivada de este riesgo (Ley 21.459 art. 9, Ley 21.719 art. 17)
- [ ] **C4**: Implementar las mitigaciones técnicas CRIT-2 (rate-limit + lockout cuenta) y CRIT-6 (audit log con IP/UA) para reducir probabilidad y aumentar detección
- [ ] **C5**: Mantener un proceso de **revisión anual** de esta decisión: si las circunstancias cambian o se materializa un incidente, re-evaluar
- [ ] **C6**: Asumir responsabilidad civil y administrativa derivada (Ley 19.628 art. 23, Ley 21.719 art. 67)

---

### Riesgo 2 — *(añadir otros riesgos aceptados por decisión del cliente)*

```
[Espacio para futuras decisiones del cliente sobre otros findings de la auditoría]
```

---

## Firma del memo

Al firmar este documento, las partes:

1. **Reconocen** haber leído y comprendido la auditoría base (AUDITORIA_SEGURIDAD_2026-05-16.md) y los riesgos descritos.
2. **Aceptan** los riesgos listados con las compensaciones acordadas.
3. **Asignan** la responsabilidad regulatoria y civil al responsable del tratamiento (cliente OTEC).
4. **Se comprometen** a re-evaluar este memo anualmente o ante cambios materiales (nueva regulación, incidente, escalación de datos tratados).

| Rol | Nombre | Fecha | Firma |
|-----|--------|-------|-------|
| **Responsable del tratamiento** (Cliente OTEC Impulsate) | Victor Salinas | __________ | __________________ |
| **Encargado de Protección de Datos (DPO)** | _(a designar — obligatorio Dic 2026 Ley 21.719 art. 49)_ | __________ | __________________ |
| **Desarrollador / Asesor técnico** | Nicholas Lopetegui | __________ | __________________ |

---

## Cláusula de transparencia con titulares

El responsable del tratamiento se compromete a incluir en la política de privacidad pública del sistema (REG-1) una declaración explícita del nivel de seguridad implementado, en términos comprensibles para los titulares:

> *"El acceso a su cuenta está protegido por un PIN inicial de 4 dígitos generado a partir de su RUT. Recomendamos cambiarlo inmediatamente en su primer ingreso desde la sección 'Cambiar PIN'. El OTEC no obliga el cambio para facilitar el acceso a usuarios con menor familiaridad digital, pero esto reduce el nivel de seguridad de su cuenta. Si sospecha que alguien más conoce su RUT, cambie su PIN cuanto antes."*

(o equivalente aprobado por el DPO)

---

## Anexo legal

- **Ley 19.628 art. 11**: "El responsable del registro o banco de datos personales deberá cuidar de ellos con la debida diligencia"
- **Ley 19.628 art. 23**: responsabilidad por daño moral y patrimonial por tratamiento indebido
- **Ley 21.719 art. 14**: medidas técnicas y organizativas apropiadas al nivel de riesgo
- **Ley 21.719 art. 67**: sanciones administrativas — infracción gravísima hasta 20 000 UTM
- **Ley 21.459 art. 9**: obligación de notificación de incidentes
