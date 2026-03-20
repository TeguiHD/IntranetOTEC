# ORDEN_DOCUMENTAL.md

## Propósito
Este archivo define la jerarquía documental para evitar contradicciones entre archivos de planificación, estado y progreso.

## Jerarquía oficial (de mayor a menor prioridad)

1. `project-state.md`  
   Fuente de verdad técnica y operativa vigente.

2. `PROGRESO_ITERACIONES.md`  
   Bitácora histórica cronológica de cambios (puede contener contexto legacy).

3. `Requerimientos.txt`  
   Documento de requerimientos extendido con bloques históricos.

## Regla para `Requerimientos.txt`
- El archivo contiene dos bloques de planificación (inicial + v3).
- La interpretación vigente debe alinearse con baseline v3 y con decisiones registradas en `project-state.md`.
- Si existe conflicto entre bloques de `Requerimientos.txt`, manda `project-state.md`.

## Estado funcional vigente (resumen)
- Seguridad base, auth por roles, observabilidad y quality gate: implementados.
- Operación admin (usuarios, asignaturas, matrículas, clases): implementada.
- Certificados alumno: emisión segura + plantilla con firmas + QR + verificación pública + envío de correo (API) implementado.
- Módulo docente y alumno profundo (clases/evaluaciones/notas/entregas): pendiente.

## Protocolo de actualización
1. Implementar cambios en código.
2. Registrar resumen en `PROGRESO_ITERACIONES.md`.
3. Actualizar estado consolidado en `project-state.md`.
4. Mantener `Requerimientos.txt` como referencia histórica, sin usarlo como única fuente de estado.
