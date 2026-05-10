# Checking Intranet Alumno / Docente / Admin - 2026-05-10

## Alumno

- Mis Cursos usa las matriculas activas del alumno, no la asistencia, para mostrar cursos.
- Los PDF/materiales se listan dentro de cada curso y clase cuando el alumno esta matriculado.
- El chat en vivo de los PDF fue eliminado de la vista de cursos del alumno.
- Evaluaciones muestra solo pruebas publicadas y asignadas a la matricula del alumno.
- Si docente/admin deshabilita una prueba, deja de aparecer en el panel del alumno.
- Las respuestas ya enviadas no se eliminan al deshabilitar una prueba.

## Docente

- Panel docente ahora muestra boton directo `Pruebas`.
- Menu lateral docente ahora incluye `Pruebas`.
- `/docente/pruebas` resume pruebas por asignatura, estado publicado/deshabilitado y respuestas.
- Cada asignatura tiene acceso a crear/editar pruebas en `/docente/asignaturas/[asigId]/evaluaciones`.
- Docente puede crear prueba tipo formulario, agregar preguntas, publicar y deshabilitar.
- Docente puede asignar prueba a toda la seccion o a alumnos especificos.
- Docente ve respuestas en formato de archivo ordenado por alumno.
- Docente mantiene carga de material en `Mis Asignaturas`.

## Admin

- Menu lateral admin ahora incluye `Materiales`.
- `/admin/materiales` permite filtrar por periodo y seccion.
- Admin puede subir material de apoyo a clases existentes por docente/seccion.
- Admin ve el material que quedara visible para alumnos y puede eliminarlo.
- Admin mantiene facultad de crear, publicar, deshabilitar y revisar evaluaciones.
- Admin ve respuestas aunque la prueba este deshabilitada.
- Admin mantiene edicion de asistencias y notas por alumno.

## Datos Ya Cargados

- Pruebas importadas desde `pruebas docente para alumnos con activac.txt`.
- Pruebas publicadas en produccion para que alumnos asignados puedan verlas.
- Material PDF importado a cursos existentes y visible para alumnos matriculados.

## Verificacion En Produccion

- Build de Next.js: OK.
- Recarga PM2: `otec` online en 2 instancias.
- HTTP `/login`: 200 OK.
- Conteos produccion despues del despliegue:
  - Evaluaciones total: 239.
  - Evaluaciones publicadas: 153.
  - Preguntas total: 7280.
  - Materiales activos: 141.
  - Respuestas guardadas: 3.
- Alumna de referencia Javiera (`rut=293004560`):
  - Materiales visibles: 66.
  - Evaluaciones visibles publicadas: 16.
