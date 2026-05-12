# Revision flujo docente, materiales y horario - 2026-05-11

## Rutas revisadas

- `/docente/asignaturas`
- `/docente/materiales`
- `/docente/pruebas`
- `/docente/horario`
- `/docente/historial`

## Cambios aplicados

- En `Mis Asignaturas` se oculto el recuadro informativo de solicitudes porque obstruia la gestion principal.
- El selector de asignatura y anio quedo como filtro principal con labels claros y boton `Aplicar filtros`.
- En el menu lateral docente se quito `Historial`; la ruta queda sin acceso visible para no romper enlaces antiguos.
- En `Mi Horario` se aclaro el flujo: la vista depende de bloques horarios configurados por administracion. Si no hay bloques, muestra un estado vacio con acceso a Calendario y Clases.
- En `Materiales` se agrego busqueda por archivo, curso o clase, filtro por estado y acciones masivas.
- En `Pruebas` se agrego busqueda por prueba/asignatura y filtro por estado.

## Materiales

- Acciones individuales mantenidas:
  - Abrir PDF.
  - Abrir curso.
  - Editar titulo.
  - Habilitar/deshabilitar.
  - Eliminar.
- Acciones masivas nuevas para docente:
  - Habilitar todos los materiales del curso seleccionado.
  - Deshabilitar todos los materiales del curso seleccionado.
  - Habilitar todos los materiales de todos sus cursos.
  - Deshabilitar todos los materiales de todos sus cursos.
- La habilitacion solo cambia visibilidad para alumnos; no elimina archivos fisicos.

## Observacion sobre horario

`Mi Horario` usa `bloquesHorario`, que representa un patron semanal. No usa directamente las clases puntuales creadas en el calendario. Si el docente no ve datos, significa que no tiene bloques horarios semanales configurados, aunque si puede tener clases visibles en Calendario o Clases.

## Checklist de validacion

- Docente abre `Mis Asignaturas` sin ver el recuadro de solicitudes.
- Docente cambia curso/anio y la vista conserva el filtro.
- Docente abre `Materiales` y filtra por texto y estado.
- `Abrir PDF` sigue usando `/api/files/download/{materialId}`.
- `Abrir curso` lleva a `Mis Asignaturas` con la asignatura correspondiente.
- `Habilitar todo` y `Deshabilitar todo` cambian visibilidad para alumnos.
- `Eliminar` no rompe el listado de materiales.
- Menu docente ya no muestra `Historial`.
- `Mi Horario` muestra grilla si existen bloques, o mensaje claro si no existen.

