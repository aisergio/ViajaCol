<#
.SYNOPSIS
  Ejecuta Terraform sobre un stack de infra/ con el entorno local preparado.

.DESCRIPTION
  En este PC el antivirus (Avast Web Shield) intercepta HTTPS, incluso el canal local con TLS entre
  Terraform y sus plugins. Este script:
    - usa las raíces de Windows exportadas para el SDK de AWS (AWS_CA_BUNDLE);
    - desactiva solo el TLS local Terraform<->plugins (TF_DISABLE_PLUGIN_TLS=1); ese tráfico no sale
      del equipo y solo existe mientras corre Terraform. En CI (Linux) no hace falta.

.EXAMPLE
  ./scripts/infra/tf.ps1 bootstrap plan
  ./scripts/infra/tf.ps1 bootstrap init -backend-config=backend.hcl
#>
param(
  [Parameter(Mandatory = $true, Position = 0)][string]$Stack,
  [Parameter(ValueFromRemainingArguments = $true)][string[]]$TerraformArgs
)

$ErrorActionPreference = 'Stop'
$stackDir = Join-Path $PSScriptRoot "..\..\infra\$Stack"
if (-not (Test-Path $stackDir)) { throw "No existe el stack: infra/$Stack" }

$bundle = Join-Path $env:USERPROFILE '.config\ca\windows-roots.pem'
if (Test-Path $bundle) { $env:AWS_CA_BUNDLE = $bundle }
$env:TF_DISABLE_PLUGIN_TLS = '1'

Push-Location $stackDir
try {
  & terraform @TerraformArgs
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
