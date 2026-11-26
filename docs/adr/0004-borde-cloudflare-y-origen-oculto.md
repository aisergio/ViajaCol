# ADR 0004 — Borde en Cloudflare y origen oculto en AWS

- **Estado**: aceptado (2026-11-25)
- **Contexto**: el dominio `aisergio.dev` ya vive en Cloudflare, con un sitio raíz y otros proyectos
  que no deben cambiar. ViajaCol debe responder solo en `/ViajaCol*`, y su origen en AWS no puede
  quedar expuesto.

## Decisión

1. **Borde:** un **Cloudflare Worker** en las rutas `aisergio.dev/ViajaCol*` (y sus variantes de
   mayúsculas, que redirige con 301). Reenvía a CloudFront con:
   - un secreto de origen;
   - `X-Forwarded-Host`;
   - el hash SHA-256 del cuerpo en las peticiones POST y PUT.
2. **CDN:** en **CloudFront**, la función `origin-guard` (viewer-request) compara el secreto con un
   KeyValueStore y responde 403 si no coincide.
3. **Orígenes:** CloudFront firma con **OAC** hacia la Function URL (IAM) y hacia S3.
4. **Fuera del borde:** el subdominio `workers.dev` del Worker queda desactivado.

## Alternativas descartadas

- **Mover el DNS a Route 53 o apuntar el dominio a CloudFront:** cambia el sitio raíz.
- **Solo OAC:** el dominio `*.cloudfront.net` quedaría abierto y permitiría saltarse el límite de tasa.
- **Function URL pública con el secreto validado en `proxy.ts`:** expone la función. Queda como
  plan B.
- **Reglas de origen de Cloudflare:** no pueden calcular el hash del cuerpo que OAC exige.

## Consecuencias

- ✅ El único cambio en la zona son las rutas y una regla de tasa, que se activan con aprobación
  (`enable_public_routes`).
- ✅ En la prueba, el acceso directo a CloudFront, a la Function URL y a S3 dio 403.
- ✅ El secreto se rota sin publicar código: se usan `secret` y `secret_previous` en el
  KeyValueStore.
- ⚠️ Hay dos CDN en serie. Las cabeceras de diagnóstico (`cf-cache-status`, `X-Cache`,
  `Server-Timing`) se conservan para la guía de DevTools.
- ⚠️ El sitio comparte origen con el sitio raíz. Lo mitigan `Path` en las cookies, las claves
  `viajacol:` y HSTS sin `includeSubDomains`.
