# Revision cursos docentes 2026-05-10

Fuente revisada: `docentes.txt`

Base revisada: produccion VPS, tabla `asignaturas` con docentes asociados.

## Resultado

Todos los cursos indicados en `docentes.txt` existen en produccion.

Se detectaron 2 secciones cargadas con docente incorrecto y fueron corregidas en produccion:

- `Manicurista Experta - Martes 10:00`
  - Antes: Olga Rosemarie Guajardo Lizana
  - Ahora: Camila Vargas
- `Manicure Unas Acrilicas - Martes 12:30`
  - Antes: Olga Rosemarie Guajardo Lizana
  - Ahora: Camila Vargas

## Conteo final por docente

| Docente | Email | Cursos esperados | Cursos en produccion | Estado |
| --- | --- | ---: | ---: | --- |
| Olga Rosemarie Guajardo Lizana | oguajardo937@gmail.com | 12 | 12 | OK |
| Camila Andrea Vargas Merino | camil.vargas022@gmail.com | 9 | 9 | OK |
| Camila Patricia Aguilera Munoz | camila.aguilera.m17@gmail.com | 3 | 3 | OK |
| Maricel Berena Flores Cabeza | maricelcbz@gmail.com | 3 | 3 | OK |
| Patricio Benjamin Berrios Sanhueza | p.b.berriossanhueza@gmail.com | 5 | 5 | OK |
| Juan Marcelo Labra Candia | marcelolabrac@hotmail.com | 6 | 6 | OK |
| Cynthia Edith Guerrero Vasquez | cynthia.p.canina@gmail.com | 2 | 2 | OK |

## Observacion

Los bloques de horario recurrentes (`bloques_horario`) aparecen vacios para estas secciones, pero el dia y hora estan reflejados en el nombre/codigo de cada seccion. La revision solicitada de cursos cargados y docente correspondiente queda conforme.
