# Contrato: borde → CDN → función

## Navegador → Worker (`aisergio.dev/ViajaCol*`)

| Caso | Respuesta del Worker |
|---|---|
| Ruta `/ViajaCol` o `/ViajaCol/...` | Reenvía a CloudFront |
| Variante de mayúsculas (`/viajacol`, `/VIAJACOL`, `/Viajacol`, `/viajaCol`) | 301 a `/ViajaCol` + resto de la ruta + consulta |
| Ruta parecida (`/ViajaColombia`) | `fetch(request)` al origen normal del dominio |
| Cuerpo de más de 1 MB | 413 sin llegar al origen |

## Worker → CloudFront

| Cabecera | Valor | Nota |
|---|---|---|
| `x-viajacol-origin` | Secreto (binding `ORIGIN_SECRET`) | Lo que mande el cliente se descarta |
| `x-forwarded-host` | Host público (`aisergio.dev`) | Next.js lo usa en la verificación de origen de Server Actions |
| `x-forwarded-proto` | `https` | |
| `x-amz-content-sha256` | SHA-256 hexadecimal del cuerpo | Solo en peticiones con cuerpo; si no, se elimina |
| Resto | Las del cliente (cookies incluidas), sin `host` | |

La redirección es manual (`redirect: 'manual'`). Si un `Location` absoluto apunta a
`*.cloudfront.net` o a `*.lambda-url.*.on.aws`, se reescribe al dominio público.

## CloudFront → Lambda / S3

- **`origin-guard`:**
  - sin el secreto válido (`secret` o `secret_previous`), responde 403 con «Acceso directo no
    permitido.»;
  - si el secreto es válido, lo elimina antes de llegar al origen.
- **Lambda:** el origen recibe todas las cabeceras del visor menos `Host`
  (`Managed-AllViewerExceptHostHeader`) y la firma SigV4 de OAC.
- **S3:** recibe la firma SigV4 de OAC. La política del bucket solo permite `s3:GetObject` a la
  distribución.

## Respuesta

Además de lo que envíe Next.js, CloudFront agrega:
- HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` y COOP;
- la CSP base, si la app no envía una;
- `Server-Timing`.

Se conservan `X-Cache`, `Via`, `X-Amz-Cf-Pop` y `cf-cache-status` (Cloudflare) para la guía de
DevTools.
