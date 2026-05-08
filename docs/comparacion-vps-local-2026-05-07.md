# Comparacion VPS vs local - 2026-05-07

## Alcance

Revision de solo lectura del VPS `104.248.3.67`. No se ejecutaron `pull`, `build`, `restart`, ediciones de archivos ni comandos de despliegue en el servidor.

## Ruta activa en VPS

- Host: `Intranet-Mi-Otec`
- App activa: `/home/impulsate/intranet-otec`
- Proceso: `next-server` bajo PM2, usuario `impulsate`
- Configuracion PM2: `/home/impulsate/intranet-otec/ecosystem.config.cjs`

## Resultado Git

VPS:

- Branch: `feat/alumnos-credencial-extranjera-solicitudes`
- HEAD: `631c556fedf2e7c014a979ae11aacc042612ede0`
- `origin/feat/alumnos-credencial-extranjera-solicitudes`: `303d783482f08d93d98213653245f540218019e5`
- Estado: `ahead 4`
- Hash de arbol de HEAD: `07f779e03c6ada92f1cf6c869640779c6340d44a`
- Hash de arbol de origin: `07f779e03c6ada92f1cf6c869640779c6340d44a`
- Diferencia de archivos entre `origin..HEAD`: `0`

Local, repo raiz:

- Branch: `feat/alumnos-credencial-extranjera-solicitudes`
- HEAD: `303d783482f08d93d98213653245f540218019e5`
- `origin/feat/alumnos-credencial-extranjera-solicitudes`: `303d783482f08d93d98213653245f540218019e5`
- Hash de arbol de HEAD/origin: `07f779e03c6ada92f1cf6c869640779c6340d44a`

## Conclusion

El VPS esta `ahead 4` por commits de merge/locales, pero el contenido fuente trackeado es identico al `origin` de GitHub y al `HEAD` limpio local. Por eso, antes de las correcciones locales posteriores, el entorno local si estaba actualizado fielmente al contenido fuente activo del VPS.

## Diferencias actuales

El working tree local actual no es identico al VPS porque ya contiene correcciones locales aplicadas despues de la sincronizacion:

- 81 archivos trackeados modificados localmente.
- Archivos locales no trackeados: `6Mayo2026.txt`, `Mejoras ADMINISTRACIÓN(1).docx`, `docs/`, `intranetotec.zip`.

En el VPS hay archivos no trackeados que no forman parte del arbol fuente versionado:

- `logs/pm2-error.log`
- `logs/pm2-out.log`
- `scripts/add-admins.mjs`
- `seed-marzo-2026.mjs`

## Nota operativa

La comparacion fuerte para decidir si local estaba al dia es el hash de arbol Git: `07f779e03c6ada92f1cf6c869640779c6340d44a` en VPS, GitHub origin y local limpio.
