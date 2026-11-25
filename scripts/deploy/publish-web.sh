#!/usr/bin/env bash
# Publica dist/web en la zona web, en este orden para no romper a nadie a mitad de camino:
#   1. estáticos en S3 (solo se agregan: las páginas viejas siguen encontrando sus archivos);
#   2. código nuevo y versión publicada de Lambda (con el commit en la descripción);
#   3. alias live a la versión nueva (el cambio de tráfico es atómico);
#   4. invalidación del HTML y los datos de navegación en CloudFront.
# Requiere credenciales de AWS: el rol del runner de CodeBuild o, en local, `aws login`.
set -euo pipefail

: "${STATIC_BUCKET:?Falta STATIC_BUCKET}" "${ARTIFACTS_BUCKET:?Falta ARTIFACTS_BUCKET}"
: "${FUNCTION_NAME:?Falta FUNCTION_NAME}" "${DISTRIBUTION_ID:?Falta DISTRIBUTION_ID}"
export AWS_REGION="${AWS_REGION:-us-east-2}"
DIST="${DIST:-dist/web}"
BASE_PATH="ViajaCol"
COMMIT="$(cat "$DIST/VERSION")"

echo "::group::1. Estáticos"
aws s3 sync "$DIST/static/" "s3://$STATIC_BUCKET/" \
  --cache-control "public, max-age=31536000, immutable" --only-show-errors
echo "::endgroup::"

echo "::group::2. Código y versión"
KEY="web/$COMMIT.zip"
aws s3 cp "$DIST/web-lambda.zip" "s3://$ARTIFACTS_BUCKET/$KEY" --only-show-errors
aws lambda update-function-code --function-name "$FUNCTION_NAME" \
  --s3-bucket "$ARTIFACTS_BUCKET" --s3-key "$KEY" --query LastUpdateStatus --output text
aws lambda wait function-updated-v2 --function-name "$FUNCTION_NAME"
NEW=$(aws lambda publish-version --function-name "$FUNCTION_NAME" --description "$COMMIT" --query Version --output text)
echo "::endgroup::"

echo "::group::3. Alias live"
OLD=$(aws lambda get-alias --function-name "$FUNCTION_NAME" --name live --query FunctionVersion --output text)
aws lambda update-alias --function-name "$FUNCTION_NAME" --name live --function-version "$NEW" \
  --query FunctionVersion --output text
echo "::endgroup::"

echo "::group::4. Invalidación de CloudFront"
INVALIDATION=$(aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" \
  --paths "/$BASE_PATH*" --query Invalidation.Id --output text)
aws cloudfront wait invalidation-completed --distribution-id "$DISTRIBUTION_ID" --id "$INVALIDATION"
echo "::endgroup::"

echo "Publicada la versión $NEW de $FUNCTION_NAME (antes: $OLD) con el commit $COMMIT"
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "### Publicación"
    echo ""
    echo "| Dato | Valor |"
    echo "|---|---|"
    echo "| Commit | \`$COMMIT\` |"
    echo "| Versión de Lambda | $NEW (antes: $OLD) |"
    echo "| Restaurar | Acciones → Despliegue → «restaurar» con la versión $OLD |"
  } >> "$GITHUB_STEP_SUMMARY"
fi
