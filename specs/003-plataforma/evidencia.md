# Evidencia: spec 003 (plataforma de publicación)

Registro del 2026-11-25. Todavía sin rutas públicas: las pruebas van directo a CloudFront con el
secreto del origen, como lo haría el Worker.

## Infraestructura (T023)

- **Resultado:** `terraform apply` creó 46 recursos, sin rutas públicas, sin regla de tasa y sin
  webhook.
- **Incidente:** el primer intento falló al crear `aws_codebuild_project` con *«User is not authorized
  to access connection»*, por la propagación de IAM del rol recién creado. El segundo terminó bien.
- **Escaneo:** Checkov 3.4.10 dio 133 verificaciones aprobadas, 0 fallidas y 20 excepciones con
  motivo. TFLint salió limpio.

## Despliegue de prueba (T024)

| Paso | Resultado |
|---|---|
| Paquete de CI (`deploy.yml`, job «Paquete de Lambda», PR #5) | Zip de 12,2 MiB, 26 estáticos |
| `publish-web.sh`: versión 1 (commit `5fed645`) | Publicada en 58 s. **Páginas con 500**: *«Failed to proxy https://localhost:8080/ViajaCol/es»* |
| Diagnóstico local con el mismo paquete | `HOSTNAME=127.0.0.1` da 500 y `HOSTNAME=0.0.0.0` da 200 (research D-01) |
| `publish-web.sh`: versión 2 (commit `1ec067b`, con `HOSTNAME=0.0.0.0`) | Publicada en 54 s |

## Verificación a través de CloudFront (versión 2)

| Prueba | Resultado |
|---|---|
| `GET /ViajaCol/api/health` | 200 · `{"status":"ok","version":"1ec067b…"}` · primer byte en frío: 1,64 s |
| `/ViajaCol`, `/en`, `/sitios`, `/fiestas`, `/en/platos` | 200 en todas, entre 0,34 y 0,59 s |
| Ruta inexistente | 404 (página del sitio) |
| `<title>` y `lang` | ES: `es-CO` · EN: `en` |
| HTML | `Cache-Control: s-maxage=31536000` (caché en CloudFront, invalidada al publicar) |
| Estático `/ViajaCol/_next/static/chunks/*.js` | 200 desde S3 · `public, max-age=31536000, immutable` · `Hit from cloudfront` |
| `POST /ViajaCol/api/health` con `x-amz-content-sha256` | `{"status":"ok","received":8}` (FR-008) |
| Cabeceras | HSTS 2 años sin subdominios, `nosniff`, `Referrer-Policy`, CSP base, `X-Frame-Options: DENY`, `Permissions-Policy` y `Server-Timing` |
| CloudFront sin secreto, o con uno falso | 403 |
| Function URL directa | 403 |
| S3 directo | 403 |

## Restauración (T017, SC-005)

| Acción | Cambio del alias | Total con invalidación |
|---|---|---|
| `rollback.sh` a la versión 1 | 9 s | 35 s |
| `rollback.sh` a la versión 2 | 8 s | 34 s |

El alias `live` quedó en la versión 2.

## Dominio antes de activar las rutas (SC-002, línea base)

Foto del 2026-11-25 a las 21:48 UTC con
[`scripts/infra/domain-snapshot.mjs`](../../scripts/infra/domain-snapshot.mjs). Guarda el estado, las
cabeceras estables y el hash del cuerpo de cada ruta.

| Ruta | Estado |
|---|---|
| `/`, `/robots.txt`, `/sitemap.xml`, `/favicon.ico` y una ruta inexistente | 522 |
| `/PlanEstudio` y `/MediPoli` | 308 hacia la misma ruta con `/` al final |
| `/PlanEstudio/` y `/MediPoli/` | 200 |
| `/ViajaCol`, `/viajacol`, `/ViajaColombia` y `/viajacolombia` | 522 |

- **La raíz ya respondía 522** antes de cualquier cambio: Cloudflare no logra conectar con el origen
  de la raíz. No depende de esta spec.
- **Variación propia:** dos fotos seguidas dan 0 diferencias. Para eso se normalizan el Ray ID, la hora
  y la IP de la página de error, y se ignoran las cabeceras de caché (`via`, `x-amz-cf-id`, `x-cache`).
- **Zona:**
  - plan Free;
  - siete rutas de Workers, de los otros dos proyectos;
  - sin dominios personalizados;
  - sin regla de tasa previa, así que la de ViajaCol ocupará la única que admite el plan.

## Pendiente con aprobación del dueño

- `enable_public_routes`: las rutas del Worker y la regla de tasa en la zona.
- `enable_deploy_runner`: el webhook en el repositorio.
- Los secretos `DEPLOY_*` del entorno `production`.
- La primera publicación desde `main` y SC-001, SC-002 y SC-006 sobre la dirección pública.
