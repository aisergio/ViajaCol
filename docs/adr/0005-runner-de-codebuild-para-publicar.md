# ADR 0005 — Runner de CodeBuild para publicar desde GitHub Actions

- **Estado**: aceptado (2026-11-25); actualizado el 2026-11-26 (la aprobación en su propio job)
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
- **Aprobar la publicación:** un job propio, `aprobar`, usa el entorno `production`, que exige la
  aprobación del responsable. Corre en un runner de GitHub, y los jobs de CodeBuild dependen de él
  (ver la actualización).
- **Secretos de despliegue:** los `DEPLOY_*` son nombres de recursos, no credenciales. Van como
  secretos del repositorio para que se enmascaren en los registros públicos.

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

## Actualización (2026-11-26): la aprobación en su propio job

### Incidente

En la primera publicación (ejecución 45760538715), el job de CodeBuild declaraba el entorno
`production`:

1. GitHub envió `workflow_job.queued` unos segundos antes de registrar que el job esperaba
   aprobación. CodeBuild arrancó el runner de inmediato.
2. El runner esperó sin trabajo hasta el límite del cómputo Lambda (15 minutos) y terminó por tiempo
   un minuto antes de la aprobación.
3. Al aprobar, GitHub envió otro `queued`. CodeBuild lo asoció al build ya terminado y no lanzó otro,
   así que el job quedó en cola sin runner.

Se resolvió cancelando y relanzando el job. En el segundo intento CodeBuild respondió *«Deployment
status is not 'queued'»* y esperó la aprobación, como debía: la falla depende del orden de los
eventos.

### Decisión

- **Aprobación aparte:** el job `aprobar` corre en un runner de GitHub y usa el entorno
  `production`.
- **Jobs de CodeBuild sin entorno:** `publicar` y `restaurar` dependen de `aprobar`. Se crean ya
  aprobados, así que su runner arranca solo cuando hay trabajo.
- **Secretos del repositorio:** los `DEPLOY_*` pasan del entorno al repositorio, porque los jobs que
  los usan ya no declaran el entorno.

### Consecuencias

- ✅ La aprobación puede tardar lo que haga falta (GitHub espera hasta 30 días) sin gastar minutos de
  CodeBuild.
- ✅ La aprobación se puede dar mientras compila el paquete.
- ⚠️ Volver a ejecutar solo los jobs fallidos reutiliza la aprobación del intento anterior. Solo el
  responsable puede hacerlo.
- ⚠️ Los secretos del repositorio también llegan a los PR de ramas propias, no a los de forks. No dan
  acceso a AWS: eso lo da el runner, que solo atiende jobs del responsable.

### Verificación

En la segunda publicación (ejecución 45907930371), el runner de CodeBuild arrancó 14 s después de la
aprobación y la versión quedó visible 53 s después de aprobar. Luego se borraron los `DEPLOY_*` del
entorno.
