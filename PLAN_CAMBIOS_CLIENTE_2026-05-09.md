# Plan de cambios cliente - 2026-05-09

Fuente revisada: `C:\Users\victo\Downloads\cambios cliente.docx`.

## Resumen ejecutivo

El documento del cliente contiene una nueva tanda de ajustes visuales y de flujo para alumno, docente y administrador. La sesion ya desplegada del commit `3a4760d` resolvio el flujo de pruebas/calendario docente, pero no cubre la mayoria de los puntos nuevos del Word.

Se deben priorizar tres frentes:

1. Limpieza de navegacion y duplicidades del alumno.
2. Correccion de textos/acentos y nombres visibles.
3. Reubicacion funcional de cursos, certificado automatizado, asistencia y recompensas.

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
| Corregir palabras con signos, acentos y caracteres especiales en alumno/docente/admin. | Pendiente parcial | Hay textos correctos en codigo, pero capturas muestran `S?bado`, `Mi?rcoles`. Tambien existen labels sin acento como `Academico`, `Gestion de Alumnos`, `Gestion de Docentes`. | Normalizar textos visibles, revisar origen de datos con mojibake y agregar sanitizacion/normalizacion en render cuando venga desde BD. |
| Todos los cuadros de las 3 rayitas deben ir en el panel central. En alumno deben estar las mismas secciones que la barra lateral. | Parcial | Panel alumno ya tiene bloques centrales, pero no replica todo el menu lateral: falta horario/calendario/historial y sobran duplicidades segun nuevo criterio. | Sincronizar el panel central con `navigationConfig` o definir una matriz unica por rol. |
| Mantener seccion indicada y eliminar solicitud manual. | Pendiente | `navigationConfig.ts` aun contiene `/alumno/solicitudes/alumno-regular` como `Solicitud manual`. | Retirar entrada de barra lateral y panel, manteniendo solo certificado automatizado. Evaluar redireccion 301/soft hacia `/alumno/certificados`. |
| Borrar boton de alumno regular y dejar el automatizado. | Pendiente | Panel alumno aun muestra `Cert. Alumno Reg.` apuntando a solicitud manual; existe automatizado en `/alumno/certificados`. | Cambiar boton del panel a `Mis Certificados` o eliminarlo si queda en barra lateral. |
| Mantener sesion abierta; permanente para administradores y docentes, 30 min de inactividad para alumnos. | Pendiente | `src/auth.ts` usa `maxAge: 12 horas` global para JWT. | Implementar expiracion por rol o estrategia de actividad: admin/docente larga, alumno 30 min inactivo. Revisar middleware y refresh de sesion. |
| Cursos deben estar en boton Cursos, no listado en panel central ni en perfil/asignatura/panel principal. | Pendiente | Panel alumno muestra `Mis Cursos Inscritos`; tambien existen vistas de asignaturas/cursos. | Dejar cursos concentrados en `/alumno/asignaturas` y limpiar listados duplicados del panel/perfil si no son resumen necesario. |
| Tarjeta de Recompensas debe copiar logica de asistencia y mostrarse en Tarjeta Beneficio. | Pendiente | La logica de 8 bloques existe en `/alumno/asistencias`; tarjeta beneficio solo muestra credencial visual. | Crear seccion `Tarjeta de Recompensas` debajo de beneficio, reutilizando datos de asistencia sin cambiar la pagina de asistencia. |
| En asistencia no debe decir `Tarjeta de asistencia`; titulo solo `Asistencia`. | Pendiente | `/alumno/asistencias/page.tsx` muestra `Tarjeta de asistencia`. | Renombrar tarjetas a `Asistencia` y ajustar textos/aria/metadata relacionados. |
| Tarjeta de recompensas va abajo de la de beneficios. | Pendiente | No existe aun en la pagina de beneficio. | Agregar bloque debajo de la tarjeta visual en `/alumno/solicitudes/tarjeta-beneficio`. |
| Revisar por que lleva a otra parte cuando solicita la credencial. | Pendiente de QA | Existe flujo de credencial y control de acceso, pero falta reproducir navegacion exacta del cliente. | Probar con cuenta alumno, revisar redirects/state toast y corregir destino post-submit. |
| Retroceder interactivo sin cerrar sesion ni mandar al panel sin coherencia. | Pendiente | Hay boton back global en `Topbar`; debe revisarse comportamiento con historial del navegador y rutas protegidas. | Implementar back inteligente: si hay historial interno volver; si no, fallback contextual por rol/seccion. Evitar logout por navegacion atras. |

## Plan de implementacion propuesto

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
