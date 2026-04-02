# Checklist de release root + otec (2026-04)

## 1) Pre-release

- [ ] Confirmar variables de entorno:
  - DATABASE_URL
  - AUTH_SECRET
  - NEXT_PUBLIC_BASE_URL
  - NEXT_PUBLIC_VAPID_PUBLIC_KEY
  - VAPID_PUBLIC_KEY
  - VAPID_PRIVATE_KEY
- [ ] Confirmar conectividad a DB y permisos de migracion.
- [ ] Confirmar backups recientes.

## 2) Migraciones

- [ ] Ejecutar migraciones en root.
- [ ] Ejecutar migraciones en otec.
- [ ] Verificar tablas usadas por notificaciones/push:
  - notificaciones
  - notificaciones_destinatarios
  - push_subscriptions

## 3) Calidad tecnica

- [ ] npm run build (root)
- [ ] npm run security:test (root)
- [ ] npm run build (otec)
- [ ] npm run security:test (otec)

## 4) Smoke funcional (obligatorio)

- [ ] Admin:
  - login
  - enviar notificacion general/curso/individual
  - abrir /admin/notificaciones y eliminar notificacion (soft)
- [ ] Alumno:
  - login
  - ver campana con recientes
  - abrir /alumno/notificaciones
- [ ] Docente:
  - login
  - ver campana con recientes
  - abrir /docente/notificaciones
- [ ] Usuarios:
  - probar accion de baja definitiva logica en admin (sin borrado fisico)
- [ ] Material:
  - subir archivo comun (pdf/img/video) -> permitido
  - subir script/ejecutable (ej: .sh/.exe/.js) -> bloqueado

## 5) PWA/push

- [ ] Verificar registro de Service Worker en root y otec.
- [ ] Verificar manifest e instalacion web app.
- [ ] Verificar permiso de notificaciones en navegador.
- [ ] Verificar suscripcion POST /api/push/subscribe.
- [ ] Verificar recepcion foreground/background.

## 6) Observabilidad

- [ ] Revisar logs de:
  - push_subscribe
  - envio de notificaciones
  - errores de push expirado
- [ ] Confirmar ausencia de errores criticos post-deploy (15-30 min).

## 7) Cierre

- [ ] Publicar nota de despliegue con cambios y riesgos residuales.
- [ ] Adjuntar evidencia (build/tests/smoke) en ticket interno.
- [ ] Confirmar paridad con matriz:
  - MEJORAS/PARIDAD_ROOT_OTEC_2026_04.md
