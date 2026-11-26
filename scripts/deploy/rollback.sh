#!/usr/bin/env bash
# Restaura el alias live a una versión ya publicada, sin recompilar (US3). Sin TARGET_VERSION usa la
# versión inmediatamente anterior a la actual. Los estáticos de esa versión siguen en S3 (FR-016).
set -euo pipefail

: "${FUNCTION_NAME:?Falta FUNCTION_NAME}" "${DISTRIBUTION_ID:?Falta DISTRIBUTION_ID}"
export AWS_REGION="${AWS_REGION:-us-east-2}"
BASE_PATH="ViajaCol"
START=$(date +%s)

CURRENT=$(aws lambda get-alias --function-name "$FUNCTION_NAME" --name live --query FunctionVersion --output text)
TARGET="${TARGET_VERSION:-}"
if [ -z "$TARGET" ]; then
  TARGET=$(aws lambda list-versions-by-function --function-name "$FUNCTION_NAME" \
    --query "Versions[?Version!='\$LATEST'].Version" --output text |
    tr '\t' '\n' | sort -n | awk -v current="$CURRENT" '$1 < current' | tail -n 1)
fi
if ! [[ "$TARGET" =~ ^[0-9]+$ ]]; then
  echo "::error::No hay una versión válida para restaurar (actual: $CURRENT, pedida: ${TARGET:-ninguna})"
  exit 1
fi

COMMIT=$(aws lambda get-function-configuration --function-name "$FUNCTION_NAME" --qualifier "$TARGET" \
  --query Description --output text)
aws lambda update-alias --function-name "$FUNCTION_NAME" --name live --function-version "$TARGET" \
  --query FunctionVersion --output text
echo "Alias live: $CURRENT → $TARGET (commit $COMMIT) en $(($(date +%s) - START)) s"

INVALIDATION=$(aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" \
  --paths "/$BASE_PATH*" --query Invalidation.Id --output text)
aws cloudfront wait invalidation-completed --distribution-id "$DISTRIBUTION_ID" --id "$INVALIDATION"

if [ -n "${GITHUB_ENV:-}" ]; then echo "EXPECTED_VERSION=$COMMIT" >> "$GITHUB_ENV"; fi
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  echo "### Restauración: versión $CURRENT → $TARGET (commit \`$COMMIT\`)" >> "$GITHUB_STEP_SUMMARY"
fi
