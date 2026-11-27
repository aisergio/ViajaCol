#!/usr/bin/env bash
# Prueba de humo sobre la dirección pública (FR-014). Falla con el primer error y no imprime
# direcciones internas (CF_DOMAIN y FUNCTION_URL llegan como secretos del entorno).
set -euo pipefail

PUBLIC_URL="${PUBLIC_URL:-https://aisergio.dev/ViajaCol}"
: "${EXPECTED_VERSION:?Falta EXPECTED_VERSION}"
ORIGIN="${PUBLIC_URL%/*}"

fail() { echo "::error::Prueba de humo: $1"; exit 1; }
status() { curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$@"; }

# 1. La versión publicada (reintenta mientras arranca la función).
body=""
for _ in $(seq 1 12); do
  body=$(curl -fsS --max-time 20 "$PUBLIC_URL/api/health" || true)
  if [[ "$body" == *"\"version\":\"$EXPECTED_VERSION\""* ]]; then break; fi
  sleep 5
done
[[ "$body" == *"\"version\":\"$EXPECTED_VERSION\""* ]] || fail "la versión visible no es $EXPECTED_VERSION ($body)"
echo "✓ versión $EXPECTED_VERSION"

# 2. Páginas en ES y EN, y la 404 del sitio.
[[ $(status "$PUBLIC_URL") == 200 ]] || fail "la portada en español no responde 200"
[[ $(status "$PUBLIC_URL/en") == 200 ]] || fail "la portada en inglés no responde 200"
[[ $(status "$PUBLIC_URL/ruta-que-no-existe-$RANDOM") == 404 ]] || fail "una ruta inexistente no responde 404"
echo "✓ portada ES/EN y 404"

# 3. Cabeceras de seguridad (FR-006): en la portada, que pasa por CloudFront, y en la redirección
#    canónica, que genera el Worker.
security_headers() {
  local headers
  headers=$(curl -sSI --max-time 20 "$1" | tr -d '\r' | tr '[:upper:]' '[:lower:]')
  for name in strict-transport-security x-content-type-options referrer-policy content-security-policy x-frame-options permissions-policy; do
    grep -q "^$name:" <<<"$headers" || fail "falta la cabecera $name en $2"
  done
  if grep -q '^strict-transport-security:.*includesubdomains' <<<"$headers"; then fail "HSTS no debe incluir subdominios ($2)"; fi
}
security_headers "$PUBLIC_URL" "la portada"
security_headers "$ORIGIN/viajacol" "la redirección canónica"
echo "✓ cabeceras de seguridad"

# 4. Un POST cruza el borde y CloudFront con el cuerpo íntegro (hash para OAC).
post=$(curl -fsS --max-time 20 -X POST -H 'content-type: text/plain' --data-binary 'viajacol' "$PUBLIC_URL/api/health") ||
  fail "el POST por el borde falló"
[[ "$post" == *'"received":8'* ]] || fail "el POST llegó alterado ($post)"
echo "✓ POST por el borde"

# 5. Redirección canónica.
[[ $(status "$ORIGIN/viajacol") == 301 ]] || fail "/viajacol no redirige con 301"
echo "✓ redirección canónica"

# 6. Catálogo (spec 004): una foto desde S3 con su tipo y caché inmutable (FR-018), el índice de
#    búsqueda y una vista previa para redes.
media_path=$(curl -fsS --max-time 20 "$PUBLIC_URL" | grep -o '/ViajaCol/media/[a-z0-9/-]*-960\.webp' | head -n 1 || true)
[[ -n "$media_path" ]] || fail "la portada no enlaza ninguna foto del catálogo"
media_headers=$(curl -sSI --max-time 20 "$ORIGIN$media_path" | tr -d '\r' | tr '[:upper:]' '[:lower:]')
grep -q '^http/[0-9.]* 200' <<<"$media_headers" || fail "la foto $media_path no responde 200"
grep -q '^content-type: image/webp' <<<"$media_headers" || fail "la foto $media_path no es image/webp"
grep -q '^cache-control:.*immutable' <<<"$media_headers" || fail "la foto $media_path no tiene caché inmutable"
[[ $(status "$PUBLIC_URL/api/search-index/es") == 200 ]] || fail "el índice de búsqueda no responde 200"
og_type=$(curl -sS -o /dev/null -w '%{content_type}' --max-time 20 "$PUBLIC_URL/api/og/sitios/es/valle-de-cocora")
[[ "$og_type" == image/jpeg* ]] || fail "la vista previa para redes no es image/jpeg ($og_type)"
echo "✓ fotos, buscador y vista previa"

# 7. Cuenta (spec 006): «Entrar» lleva a Cognito, «Mi cuenta» pide sesión y sin sesión no hay nombre.
signin_location=$(curl -sS -o /dev/null -w '%{redirect_url}' --max-time 20 "$PUBLIC_URL/entrar")
[[ "$signin_location" == https://*.amazoncognito.com/oauth2/authorize* ]] || fail "«Entrar» no redirige a Cognito"
[[ $(status "$PUBLIC_URL/cuenta") == 307 ]] || fail "«Mi cuenta» sin sesión no redirige a «Entrar»"
[[ $(status "$PUBLIC_URL/api/cuenta/yo") == 401 ]] || fail "/api/cuenta/yo sin sesión no responde 401"
[[ $(status "$PUBLIC_URL/api/auth/ok") == 200 ]] || fail "la ruta de autenticación no responde"
echo "✓ cuenta: entrar, página privada y sesión"

# 8. Acceso directo al origen: 403 (US4).
if [ -n "${CF_DOMAIN:-}" ]; then
  [[ $(status "https://$CF_DOMAIN/ViajaCol") == 403 ]] || fail "CloudFront directo no responde 403"
fi
if [ -n "${FUNCTION_URL:-}" ]; then
  [[ $(status "$FUNCTION_URL") == 403 ]] || fail "la Function URL directa no responde 403"
fi
echo "✓ origen protegido"

echo "Prueba de humo superada"
