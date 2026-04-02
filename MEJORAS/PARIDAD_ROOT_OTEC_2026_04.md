# Matriz de paridad root vs otec (2026-04)

## Alcance

Este documento registra el estado de paridad funcional entre root y otec para los bloques del plan de correcciones.

## Resultado ejecutivo

- Estado general: PARIDAD OPERATIVA para notificaciones, topbar campana, push subscribe y PWA base.
- Riesgo residual: validar entrega push en staging con VAPID real y permisos del navegador.

## Matriz por bloque

1. Notificaciones admin/alumno/docente
- root: OK
- otec: OK
- evidencia otec:
  - src/actions/notificaciones.ts
  - src/app/(roles)/admin/notificaciones/page.tsx
  - src/app/(roles)/admin/notificaciones/NotificacionesAdminView.tsx
  - src/app/(roles)/alumno/notificaciones/page.tsx
  - src/app/(roles)/docente/notificaciones/page.tsx

2. Campana navbar + recientes + CTA
- root: OK
- otec: OK
- detalle:
  - admin: campana navega a /admin/notificaciones
  - alumno/docente: modal de recientes + CTA a pagina completa
- evidencia otec:
  - src/components/shared/Topbar.tsx
  - src/app/(roles)/layout.tsx

3. Navegacion a notificaciones en sidebar/mobile
- root: OK
- otec: OK
- evidencia otec:
  - src/components/shared/Sidebar.tsx
  - src/components/shared/MobileNavGrid.tsx

4. Conteo de no leidas en topbar
- root: OK
- otec: OK
- evidencia otec:
  - src/actions/notificaciones.ts (countMisNotificacionesNoLeidas)
  - src/app/(roles)/layout.tsx
  - src/components/shared/RoleShell.tsx

5. Push subscribe API
- root: OK
- otec: OK
- evidencia otec:
  - src/app/api/push/subscribe/route.ts

6. PWA base (sw, manifest, offline, icons)
- root: OK
- otec: OK
- evidencia otec:
  - public/sw.js
  - public/manifest.json
  - public/offline.html
  - public/icon-72.png ... public/icon-512.png
  - src/components/shared/ServiceWorkerRegister.tsx
  - src/app/layout.tsx

7. Politica usuarios sin hard-delete
- root: OK
- otec: OK
- detalle: eliminarUsuarioPermanenteAction ahora aplica baja logica (soft-delete), no db.delete en usuarios.
- evidencia:
  - src/actions/usuarios.ts
  - otec/src/actions/usuarios.ts

8. Politica de material (permitir amplio, bloquear ejecutables/scripts)
- root: OK
- otec: OK
- detalle: cambio de allowlist a denylist por extension/mime de riesgo.
- evidencia:
  - src/actions/material.ts
  - otec/src/actions/material.ts

## Validacion recomendada post-merge

1. npm run build (root)
2. npm run build (otec)
3. npm run security:test (root)
4. npm run security:test (otec)
5. Smoke manual:
- login admin, alumno, docente
- abrir campana en alumno/docente
- enviar notificacion admin y revisar recepcion
- validar registro de SW y push subscribe en navegador
