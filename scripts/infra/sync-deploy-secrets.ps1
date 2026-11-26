<#
.SYNOPSIS
  Copia las salidas de infra/live a los secretos del repositorio que usa deploy.yml. No imprime ningún
  valor.

.DESCRIPTION
  Se guardan como secretos (y no como variables) porque los registros de Actions de un repositorio
  público son públicos y los secretos se enmascaran. Son del repositorio y no del entorno
  `production`: los jobs de CodeBuild ya no declaran el entorno, porque la aprobación va en su propio
  job (ADR 0005). No son credenciales: el acceso a AWS lo da el rol del runner de CodeBuild.

  Requiere `gh auth login` con permiso de administración del repositorio y un `terraform init` previo
  del stack live.

.EXAMPLE
  ./scripts/infra/sync-deploy-secrets.ps1
#>
param(
  [string]$Repository = 'aisergio/ViajaCol'
)

$ErrorActionPreference = 'Stop'
$json = & (Join-Path $PSScriptRoot 'tf.ps1') live output -json
if ($LASTEXITCODE -ne 0) { throw 'No se pudieron leer las salidas de infra/live' }
$out = ($json -join "`n") | ConvertFrom-Json

$secrets = [ordered]@{
  DEPLOY_STATIC_BUCKET    = $out.static_bucket.value
  DEPLOY_ARTIFACTS_BUCKET = $out.artifacts_bucket.value
  DEPLOY_FUNCTION_NAME    = $out.web_function_name.value
  DEPLOY_DISTRIBUTION_ID  = $out.distribution_id.value
  DEPLOY_CF_DOMAIN        = $out.cloudfront_domain.value
  DEPLOY_FUNCTION_URL     = $out.web_function_url.value
}

foreach ($name in $secrets.Keys) {
  if ([string]::IsNullOrWhiteSpace($secrets[$name])) { throw "Salida vacía para $name" }
  $secrets[$name] | gh secret set $name --repo $Repository
  if ($LASTEXITCODE -ne 0) { throw "No se pudo guardar $name" }
  "✓ $name"
}
