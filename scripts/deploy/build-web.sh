#!/usr/bin/env bash
# Compila apps/web en modo standalone y arma lo que se publica:
#   dist/web/web-lambda.zip  servidor Next.js + node_modules trazados + run.sh (para Lambda)
#   dist/web/static/         recursos con hash y fotos del catálogo, con la misma ruta pública (para S3)
#   dist/web/VERSION         commit compilado (lo devuelve /api/health)
# Corre en Linux: la salida standalone usa enlaces simbólicos y sharp necesita binarios linux-arm64.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP="$ROOT/apps/web"
OUT="$ROOT/dist/web"
BASE_PATH="ViajaCol"

export APP_VERSION="${APP_VERSION:-$(git -C "$ROOT" rev-parse HEAD)}"
export NEXT_OUTPUT=standalone
export NEXT_TELEMETRY_DISABLED=1

rm -rf "$OUT" "$APP/.next"
mkdir -p "$OUT/lambda" "$OUT/static/$BASE_PATH/_next"

npm run build --workspace @viajacol/web

# 1) Servidor
cp -a "$APP/.next/standalone/." "$OUT/lambda/"
test -f "$OUT/lambda/apps/web/server.js" || { echo "::error::No se encontró apps/web/server.js en la salida standalone"; exit 1; }
if [ -d "$APP/public" ]; then cp -a "$APP/public" "$OUT/lambda/apps/web/public"; fi
# Las fotos del catálogo se sirven desde S3 (spec 004, D-02): no viajan en el paquete de Lambda.
rm -rf "$OUT/lambda/apps/web/public/media"
rm -rf "$OUT/lambda/apps/web/.next/cache"
ln -s /tmp/next-cache "$OUT/lambda/apps/web/.next/cache"
install -m 0755 "$ROOT/scripts/deploy/lambda/run.sh" "$OUT/lambda/run.sh"
(cd "$OUT/lambda" && zip -qry -X "$OUT/web-lambda.zip" .)
rm -rf "$OUT/lambda"

# 2) Estáticos con hash y fotos del catálogo (sus nombres llevan el hash del contenido)
cp -a "$APP/.next/static" "$OUT/static/$BASE_PATH/_next/static"
if [ -d "$APP/public/media" ]; then cp -a "$APP/public/media" "$OUT/static/$BASE_PATH/media"; fi

echo "$APP_VERSION" > "$OUT/VERSION"

ZIP_BYTES=$(stat -c %s "$OUT/web-lambda.zip")
STATIC_FILES=$(find "$OUT/static" -type f | wc -l)
echo "Paquete: $((ZIP_BYTES / 1024 / 1024)) MiB · estáticos: $STATIC_FILES archivos · commit $APP_VERSION"
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "### Paquete de Lambda"
    echo ""
    echo "| Dato | Valor |"
    echo "|---|---|"
    echo "| Commit | \`$APP_VERSION\` |"
    echo "| Zip | $((ZIP_BYTES / 1024)) KiB (límite de Lambda: 50 MiB directo, 250 MiB descomprimido) |"
    echo "| Estáticos | $STATIC_FILES archivos |"
  } >> "$GITHUB_STEP_SUMMARY"
fi
