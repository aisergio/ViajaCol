<#
.SYNOPSIS
  Descarga la capa oficial del AWS Lambda Web Adapter (arm64), verifica su SHA-256 y la deja en
  infra/live/.build/ para que Terraform publique una copia propia con la versión fijada.

.DESCRIPTION
  La capa oficial vive en la cuenta 753240598075 de AWS. Copiarla a la cuenta del proyecto evita
  depender de que el publicador la conserve y deja la verificación de integridad en el repositorio
  (variable lwa_layer_sha256 de infra/live).

.EXAMPLE
  ./scripts/infra/fetch-lwa-layer.ps1
#>
param(
  [string]$Version = '1.1.0',
  [int]$LayerVersion = 30,
  [string]$ExpectedSha256 = '+l2/kNKQVNBNrErkJ+E6/DP3ckTefHLwrC2UTuTbE+c=',
  [string]$Region = 'us-east-2',
  [string]$AwsProfile = 'viajacol'
)

$ErrorActionPreference = 'Stop'
$bundle = Join-Path $env:USERPROFILE '.config\ca\windows-roots.pem'
if (Test-Path $bundle) { $env:AWS_CA_BUNDLE = $bundle }

$arn = "arn:aws:lambda:${Region}:753240598075:layer:LambdaAdapterLayerArm64:${LayerVersion}"
$info = aws lambda get-layer-version-by-arn --arn $arn --region $Region --profile $AwsProfile --output json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or -not $info) { throw "No se pudo leer la capa $arn" }
if ($info.Description -notmatch [regex]::Escape($Version)) { throw "La capa ${arn} no corresponde a la versión ${Version}: $($info.Description)" }
if ($info.Content.CodeSha256 -ne $ExpectedSha256) { throw "SHA-256 publicado inesperado: $($info.Content.CodeSha256)" }

$outDir = Join-Path $PSScriptRoot '..\..\infra\live\.build'
New-Item -ItemType Directory -Force $outDir | Out-Null
$zip = Join-Path (Resolve-Path $outDir) "lambda-adapter-arm64-${Version}.zip"
Invoke-WebRequest -Uri $info.Content.Location -OutFile $zip -UseBasicParsing

$sha = [Convert]::ToBase64String([Security.Cryptography.SHA256]::HashData([IO.File]::ReadAllBytes($zip)))
if ($sha -ne $ExpectedSha256) {
  Remove-Item $zip
  throw "El zip descargado no coincide con el SHA-256 esperado (obtenido: ${sha})"
}
"Capa verificada: $zip ($((Get-Item $zip).Length) bytes, sha256 $sha)"
