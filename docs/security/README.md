# `docs/security/` — Documentación de seguridad y compliance

## Índice

| Documento | Estado | Owner | Próxima revisión |
|-----------|--------|-------|-------------------|
| [AUDITORIA_SEGURIDAD_2026-05-16.md](./AUDITORIA_SEGURIDAD_2026-05-16.md) | ✅ borrador v1.0 | Auditor | Tras remediación P0 |
| [RISK_ACCEPTANCE_MEMO_2026-05-16.md](./RISK_ACCEPTANCE_MEMO_2026-05-16.md) | 🟡 plantilla pendiente firma | Cliente + DPO | Anual |
| [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) | 🟡 esqueleto | DPO + Seg | Trimestral |
| THREAT_MODEL.md | ❌ por crear | Seg | — |
| DATA_CLASSIFICATION.md | ❌ por crear | DPO | — |
| ASSET_INVENTORY.md | ❌ por crear | Ops | — |
| SECURITY_POLICY.md | ❌ por crear | Cliente + DPO | Anual |
| BACKUP_POLICY.md | ❌ por crear | Ops | Anual |
| RETENTION_POLICY.md | ❌ por crear | DPO | Anual |
| REGISTRO_ACTIVIDADES_TRATAMIENTO.md (RAT) | ❌ por crear (obligatorio Dic 2026) | DPO | Continuo |
| POLITICA_PRIVACIDAD_PUBLICA.md | ❌ por crear (versión pública en web) | DPO | Continuo |

## Convenciones

- Todo documento aquí es **versionado en git**, no en wiki externa
- Documentos firmados (memos, políticas) se mantienen con la firma escaneada o referencia a contrato
- Cambios significativos requieren PR con review de DPO o responsable de seguridad

## Cadencia operativa

- **Test restore backup**: mensual (`runbooks/BACKUP_RESTORE_TEST.md`)
- **Revisión accesos privilegiados**: trimestral
- **Tabletop IR exercise**: trimestral
- **Re-auditoría externa**: anual
- **CVE scan deps**: semanal (CI)
- **Rotación secrets**: anual o post-incidente
- **Re-evaluación memos aceptación riesgo**: anual

## Contactos

- **CSIRT Nacional**: `soc@csirt.gob.cl` · https://www.csirt.gob.cl (notificación incidentes Ley 21.459)
- **Agencia Protección Datos** (Dic 2026): TBD (notificación brechas Ley 21.719)
- **Responsable tratamiento**: Victor Salinas (OTEC Impulsate)
- **DPO**: _por designar_
- **Equipo dev**: Nicholas Lopetegui
