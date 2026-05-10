# Plan pruebas docente y archivo de respuestas

## Estado funcional

- Las pruebas se cargan como evaluaciones tipo formulario en borrador.
- Docente y administrador pueden publicar o deshabilitar cada prueba.
- Alumno solo ve pruebas publicadas y asignadas a su matricula.
- Si una prueba se deshabilita, deja de aparecer en el panel del alumno.
- Las respuestas ya enviadas se mantienen visibles para docente y administrador.
- Admin puede revisar resultados, corregir notas de evaluaciones y rehabilitar intentos.

## Cambios a realizar en esta iteracion

1. Importar `pruebas docente para alumnos con activac.txt` leyendo encabezados de curso.
2. Enviar `Peluqueria Canina` a secciones activas de Peluqueria Canina.
3. Enviar `Podologia` a secciones activas de Podologia.
4. Crear cada prueba como formulario con preguntas de seleccion multiple y verdadero/falso.
5. Mantenerlas en borrador para que docente/admin las habiliten cuando corresponda.
6. Agregar archivo de respuestas ordenado por alumno en docente y admin.
7. Permitir que admin ajuste asistencia desde `/admin/asistencias`.
8. Permitir que admin ajuste notas docentes desde `/admin/notas`.

## Verificacion esperada

- Docente ve las pruebas desde `Mis asignaturas > Pruebas`.
- Admin ve las pruebas desde `/admin/evaluaciones`.
- Alumno no ve pruebas en borrador.
- Alumno ve pruebas publicadas si esta matriculado en la seccion.
- Respuestas quedan visibles en el archivo aunque la prueba vuelva a borrador/deshabilitada.
- Admin puede guardar cambios de asistencia y notas sin salir del panel.
