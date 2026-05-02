# Cambios - Gestión de Beneficios y Credenciales

Fecha: 2026-05-01

## Objetivo

Se agregó una sección administrativa para controlar el acceso de alumnos a:

- Tarjeta de beneficio
- Credencial de alumno

## Implementado

- Nueva ruta admin: `/admin/beneficios-credenciales`.
- Control individual por alumno para habilitar/deshabilitar beneficio y credencial.
- Control masivo por curso/sección para aplicar cambios a todos los alumnos matriculados activos.
- Nueva tabla `alumno_accesos_documentos`.
- Migración `0025_alumno_accesos_documentos.sql`.
- La migración inicializa los alumnos existentes con ambos accesos habilitados para no cortar accesos actuales.
- Bloqueo visual y funcional en alumno:
  - `/alumno/solicitudes`
  - `/alumno/solicitudes/credencial`
  - `/alumno/solicitudes/tarjeta-beneficio`
- Validación server-side para impedir solicitudes de credencial/tarjeta si el acceso está deshabilitado.
- Acceso agregado al menú lateral y al panel principal de administrador.

## Validación Local

- `npx tsc --noEmit`: correcto.
- `npm run build`: la compilación de Next.js fue correcta y generó las rutas.
- En Windows falló solo el `postbuild` porque el script usa `cp`, comando disponible en Linux/VPS pero no en PowerShell.

## Notas de Despliegue

Antes de usar la nueva pantalla en producción se debe ejecutar la migración:

```bash
npm run db:migrate
```

Después, construir y reiniciar el servicio de la app en el VPS según el flujo actual del proyecto.
