# Plan de cambios cliente - 2026-05-09

Fuente revisada: `C:\Users\victo\Downloads\cambios cliente.docx`.

## Resumen ejecutivo

El documento del cliente contiene una nueva tanda de ajustes visuales y de flujo para alumno, docente y administrador. La sesion ya desplegada del commit `3a4760d` resolvio el flujo de pruebas/calendario docente, pero no cubre la mayoria de los puntos nuevos del Word.

Estado al cierre de implementacion:

1. Limpieza de navegacion y duplicidades del alumno: implementada en `6e5bc04`.
2. Correccion de textos/acentos y nombres visibles: implementada para las pantallas observadas y se agrego normalizacion visual para nombres con `S?bado`/`Mi?rcoles`.
3. Reubicacion funcional de cursos, certificado automatizado, asistencia y recompensas: implementada en `6e5bc04`.

## Implementado desde este plan

### Ajustes cliente Word - 2026-05-09

- Commit `6e5bc04`: `Implementa ajustes solicitados por cliente`.
- Se elimino `Solicitud manual` del menu lateral alumno.
- La ruta antigua `/alumno/solicitudes/alumno-regular` ahora redirige a `/alumno/certificados`.
- El panel alumno reemplazo `Cert. Alumno Reg.` por `Mis Certificados`.
- El panel alumno ahora incluye accesos centrales equivalentes a la barra lateral: `Mi Horario`, `Calendario`, `Historial` y `Mis Encuestas`.
- Se retiro del panel principal el listado duplicado `Mis Cursos Inscritos`; los cursos quedan concentrados en `Mis Cursos`.
- La pagina de asistencia ya no muestra el titulo `Tarjeta de asistencia`; usa `Asistencia`.
- La pagina `Tarjeta de Beneficio` ahora muestra debajo una `Tarjeta de Recompensas` con la misma logica visual de 8 asistencias.
- La solicitud de credencial vuelve a su propia pantalla de credencial despues del envio, en lugar de mandar a la vista general de solicitudes.
- Se agrego `SessionActivityGuard`: alumnos cierran sesion tras 30 minutos de inactividad; staff queda con sesion extendida.
- Se agrego boton `Volver` inteligente en la barra superior con fallback al panel del rol.
- Se corrigieron textos visibles sin tilde en navegacion y pantallas admin/alumno/docente observadas.
- Se agrego `normalizarTextoVisible` para mostrar nombres de secciones/clases con correcciones como `Sábado` y `Miércoles` cuando vienen guardadas con caracteres rotos desde datos existentes.

### Validacion y despliegue de `6e5bc04`

- Local: `npx tsc --noEmit` OK.
- Local: `npm run lint` OK.
- Local: `npx next build` compilo, pero se detuvo por variables `.env` faltantes locales.
- VPS: pull fast-forward en `/root/IntranetOTEC`.
- VPS: pull fast-forward en `/home/impulsate/intranet-otec`.
- VPS: `pnpm run build` completo correctamente.
- VPS: `pnpm run postbuild` OK.
- VPS: `pm2 reload otec --update-env` OK.
- VPS: `otec` online en 2 instancias.
- VPS: `http://127.0.0.1:3000/login` respondio `200 OK`.

## Cambios ya realizados y desplegados

### Beneficios, credenciales y solicitudes

- Commit/documentacion inicial: gestion de beneficios y credenciales.
- Nueva pantalla admin `/admin/beneficios-credenciales`.
- Control individual por alumno para tarjeta de beneficio y credencial.
- Control masivo por curso/seccion para alumnos activos.
- Tabla `alumno_accesos_documentos`.
- Migracion `0025_alumno_accesos_documentos.sql`.
- Bloqueos en alumno para solicitudes de credencial y tarjeta cuando no tiene acceso.
- Validacion server-side para impedir solicitudes no autorizadas.

### Asistencia, historial y bajas de alumnos

- Commit `9dceaaf`: `completa ajustes de asistencia e historial`.
- Asistencia docente como nomina completa por clase.
- Tarjeta visual de 8 sesiones para alumno.
- Calendario e historial reforzados para evitar errores por fechas/consultas.
- Baja individual y baja masiva logica de alumnos en administrador.
- Creacion/edicion de clases retirada del flujo visible del docente.

### Acciones masivas de alumnos

- Commit `865d579`: `mejora acciones masivas de alumnos`.
- Seleccion por filas con checkbox.
- Acciones visibles para desactivar seleccionados y aplicar baja seleccionados.
- Seleccion de alumnos visibles.
- Accion masiva server-side para desactivacion.

### Certificado de alumno regular autonomo

- Commit `869f98c`: emision autonoma de certificado de alumno regular con QR y verificador publico.
- Ruta de alumno `/alumno/certificados`.
- Historial de certificados emitidos.
- Descarga PDF con codigo de verificacion.
- Ruta publica `/verificar/[codigo]`.

### Flujo docente de pruebas y calendario

- Commit `3a4760d`: `Implementar flujo docente de pruebas y calendario`.
- Migracion `0026_pruebas_destinatarios_calendario_docente.sql`.
- Tablas `evaluacion_destinatarios` y `calendario_docente_eventos`.
- Alumno solo ve/responde pruebas publicadas si aplica a su matricula.
- Admin y docente pueden asignar prueba a toda la seccion o alumnos especificos.
- Docente puede publicar/deshabilitar pruebas.
- Calendario docente permite eventos personales persistentes con tipo, color y relevancia.
- Mis asignaturas docente muestra acceso visual por bloques y boton `Pruebas`.
- Chat retirado de la UI docente/asignatura.
- Asistencia docente abre directo en clases de hoy si existen.

### Proteccion de archivos locales sensibles

- Commit `54fbbd2`: `Protege archivos locales sensibles`.
- Se agregaron a `.gitignore` archivos locales y material operativo:
  - `instrucciones.md`
  - `docentes.txt`
  - `pnpm-lock.zip`
  - `cambios/`

## Revision contra el Word del cliente

| Pedido del cliente | Estado actual | Evidencia / comentario | Accion recomendada |
| --- | --- | --- | --- |
| Corregir palabras con signos, acentos y caracteres especiales en alumno/docente/admin. | Implementado parcial | Se corrigieron labels visibles y se agrego normalizacion para nombres de clases/secciones con `S?bado`/`Mi?rcoles`. | Revisar datos historicos de BD si se quiere corregir el origen, no solo la visualizacion. |
| Todos los cuadros de las 3 rayitas deben ir en el panel central. En alumno deben estar las mismas secciones que la barra lateral. | Implementado | Panel alumno ahora incluye accesos centrales a horario, calendario, historial y encuestas, ademas de los ya existentes. | QA responsive en celular/tablet. |
| Mantener seccion indicada y eliminar solicitud manual. | Implementado | `Solicitud manual` fue retirada del menu alumno. | Ninguna. |
| Borrar boton de alumno regular y dejar el automatizado. | Implementado | El panel usa `Mis Certificados` y la ruta manual redirige al certificado automatico. | Ninguna. |
| Mantener sesion abierta; permanente para administradores y docentes, 30 min de inactividad para alumnos. | Implementado | JWT extendido a 30 dias y guard cliente cierra alumnos tras 30 min de inactividad. | QA manual de inactividad real en navegador. |
| Cursos deben estar en boton Cursos, no listado en panel central ni en perfil/asignatura/panel principal. | Implementado en panel | Se retiro el listado duplicado `Mis Cursos Inscritos` del panel alumno. | Revisar perfil si el cliente vuelve a reportar duplicidad ahi. |
| Tarjeta de Recompensas debe copiar logica de asistencia y mostrarse en Tarjeta Beneficio. | Implementado | `Tarjeta de Beneficio` muestra `Tarjeta de Recompensas` con grilla de 8 asistencias. | Definir catalogo real de descuentos/beneficios si se requiere contenido comercial especifico. |
| En asistencia no debe decir `Tarjeta de asistencia`; titulo solo `Asistencia`. | Implementado | Tarjetas de `/alumno/asistencias` muestran `Asistencia`. | Ninguna. |
| Tarjeta de recompensas va abajo de la de beneficios. | Implementado | Recompensas aparece bajo la tarjeta visual del beneficio. | Ninguna. |
| Revisar por que lleva a otra parte cuando solicita la credencial. | Implementado | El form redirige a `/alumno/solicitudes/credencial?state=...`. | QA con cuenta alumno habilitada/no habilitada. |
| Retroceder interactivo sin que se cierre la sesion. | Implementado parcial | Se agrego boton `Volver` inteligente en topbar con fallback al panel del rol. | El boton nativo del navegador depende del historial del navegador; seguir observando si el cliente reporta un caso especifico. |

## Plan de implementacion ejecutado

### Fase 1 - Limpieza rapida de navegacion alumno

Objetivo: eliminar confusiones visibles del Word sin tocar datos criticos.

- Quitar `Solicitud manual` del menu alumno.
- Cambiar/eliminar `Cert. Alumno Reg.` del panel central para dejar solo el flujo automatizado `/alumno/certificados`.
- Alinear los bloques del panel alumno con las secciones reales de la barra lateral.
- Retirar listados extensos de cursos del panel principal si duplican `Mis Cursos`.
- Ajustar breadcrumbs/labels: `Academico` a `Academico` con acento si el archivo admite UTF-8, `Gestiones`, `Gestion` a `Gestion` con acento donde corresponda.

### Fase 2 - Asistencia y recompensas

Objetivo: conservar asistencia actual y crear la vista de beneficios pedida.

- Renombrar visualmente `Tarjeta de asistencia` a `Asistencia`.
- Extraer o reutilizar el componente/logica de 8 sesiones.
- Agregar `Tarjeta de Recompensas` debajo de `Tarjeta de Beneficio`.
- En recompensas, mostrar beneficios/descuentos asociados a asistencia completa.
- No modificar el comportamiento actual de la pagina de asistencia, salvo textos.

### Fase 3 - Sesiones y navegacion atras

Objetivo: resolver los problemas que sacan al usuario o lo devuelven a lugares incoherentes.

- Auditar `src/auth.ts`, `src/middleware.ts`, `Topbar` y rutas protegidas.
- Definir expiracion por rol:
  - administrador/docente: sesion extendida.
  - alumno: cierre tras 30 minutos de inactividad.
- Implementar fallback contextual para boton atras:
  - alumno: volver a la seccion anterior o panel alumno.
  - docente: volver a asignatura/calendario/asistencia segun origen.
  - admin: volver al modulo padre.
- Probar comportamiento con boton del navegador y boton de la app.

### Fase 4 - Credencial y QA end-to-end

Objetivo: confirmar que el flujo no redirige a una pantalla incorrecta.

- Probar solicitud de credencial con alumno habilitado.
- Probar alumno sin acceso a credencial.
- Revisar redirects despues de submit y mensajes de estado.
- Corregir destino final para que quede en credencial/historial o vuelva a solicitudes con mensaje claro.

## Validaciones requeridas

- `pnpm lint` o lint por archivos modificados.
- `npx tsc --noEmit`.
- Build en VPS/Linux para evitar el problema local de `cp` en postbuild.
- QA manual con:
  - administrador
  - docente
  - alumno
- Revision responsive en mobile y desktop para panel alumno, asistencia y tarjeta beneficio.

## Notas de seguridad y repositorio

- No subir `instrucciones.md`, `docentes.txt`, `cambios/`, archivos `.docx` con datos de cliente ni capturas locales.
- Todo cambio de codigo debe quedar en GitHub y luego desplegarse en VPS.
- El cambio local pendiente `CAMBIOS_BENEFICIOS_CREDENCIALES.md` no se debe mezclar con esta tanda salvo confirmacion.
