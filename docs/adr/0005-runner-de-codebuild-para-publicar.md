# ADR 0005 — Runner de CodeBuild para publicar desde GitHub Actions

- **Estado**: aceptado (2026-11-25)
- **Contexto**: la SCP del proyecto en la nueva experiencia de AWS bloquea la federación OIDC de
  GitHub, y la constitución prohíbe las llaves de larga duración. Además, el repositorio es público
  y cualquiera puede abrir un PR.

## Decisión

- **Compilar en GitHub:** en `ubuntu-24.04-arm`, gratis en repositorios públicos.
- **Publicar en un runner de CodeBuild:** el proyecto `viajacol-deploy` usa cómputo Lambda arm64 de
  2 GB y entra por la etiqueta `codebuild-viajacol-deploy-<run>-<intento>`. Las credenciales salen del
  rol del proyecto: son temporales y no salen de AWS.
- **Filtrar el webhook:** `WORKFLOW_JOB_QUEUED` + `ACTOR_ACCOUNT_ID` anclado (`^<id>$`), por el
  boletín 2026-002-AWS sobre filtros sin anclar.
- **Aprobar la publicación:** el job usa el entorno `production`, que exige la aprobación del
  responsable. Sus secretos (`DEPLOY_*`) se enmascaran en los registros públicos.

## Alternativas descartadas

- **Llaves de IAM en secretos de GitHub:** viola el principio V.
- **Publicar siempre desde el PC del responsable:** sin trazabilidad y con riesgo de errores. Queda
  como respaldo documentado en el quickstart.
- **CodePipeline:** duplica la canalización fuera de GitHub y cuesta US$1 al mes por pipeline V1.

## Consecuencias

- ✅ Ni un fork ni un tercero pueden usar el runner.
- ✅ La evidencia de cada publicación queda en Actions: el resumen, el artefacto y la prueba de humo.
- ⚠️ El primer `apply` puede fallar por la propagación de IAM del rol (*«User is not authorized to
  access connection»*). Repetirlo lo resuelve.
- ⚠️ El webhook es una integración en el repositorio: se activa con `enable_deploy_runner` y con la
  aprobación del dueño.
