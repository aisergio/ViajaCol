# Research: Plataforma de publicación del prototipo

Decisiones verificadas el 2026-11-25 con la documentación de AWS, Cloudflare y los proveedores de
Terraform, y con llamadas de solo lectura a las cuentas.

## D-01. Next.js en Lambda con el Lambda Web Adapter

- **Decisión:** servidor *standalone* de Next.js en Lambda arm64 (`nodejs24.x`, 1 GB), con el Lambda
  Web Adapter 1.1.0 como capa.
  - `AWS_LWA_INVOKE_MODE=response_stream` y Function URL `RESPONSE_STREAM`;
  - arranque con `run.sh` (`HOSTNAME=127.0.0.1 node server.js`) y `.next/cache` enlazado a `/tmp`;
  - comprobación de arranque en `/ViajaCol/api/health`.
- **Por qué:**
  - es el servidor oficial de Next.js, sin adaptaciones: RSC, *streaming*, Route Handlers y Server
    Actions funcionan igual que en local;
  - el adaptador es de AWS Labs, con ejemplo oficial para Next.js en zip.
- **Alternativas:**
  - **OpenNext:** reimplementa partes de Next.js y va detrás de las versiones nuevas.
  - **Amplify Hosting:** no permite el borde propio ni Multi-Zones con alias por zona.
  - **Contenedor en Lambda:** imágenes más lentas de publicar y ECR con costo.

## D-02. Capa propia del adaptador, verificada

- **Decisión:** `scripts/infra/fetch-lwa-layer.ps1` copia la capa oficial
  (`753240598075:LambdaAdapterLayerArm64:30`, descripción «1.1.0»). Para hacerlo:
  1. pide su URL firmada;
  2. compara el SHA-256 publicado y el descargado con
     `+l2/kNKQVNBNrErkJ+E6/DP3ckTefHLwrC2UTuTbE+c=`;
  3. Terraform la publica como `viajacol-lambda-web-adapter-arm64` (`skip_destroy`).
- **Por qué:**
  - integridad comprobable en el repositorio;
  - la plataforma no depende de que el publicador conserve su capa.

## D-03. Borde en Cloudflare y origen oculto

- **Decisión:**
  - un Worker en las rutas `aisergio.dev/ViajaCol*`, más cuatro variantes de mayúsculas (las rutas de
    Workers distinguen mayúsculas en la ruta);
  - el Worker reenvía a CloudFront con `x-viajacol-origin` (secreto), `X-Forwarded-Host` y
    `X-Forwarded-Proto`;
  - en CloudFront, la función `origin-guard` (viewer-request) compara el secreto con un KeyValueStore
    (`secret` y `secret_previous`) y lo quita antes de llegar al origen;
  - el subdominio `workers.dev` queda desactivado.
- **Por qué:** el dominio y su sitio raíz ya viven en Cloudflare, y FR-002 exige no tocarlos. El
  secreto en un KeyValueStore se rota sin volver a publicar la función.
- **Alternativa:** reglas de origen de Cloudflare hacia CloudFront. No pueden agregar el hash del
  cuerpo ni reescribir `Location`.

## D-04. OAC hacia Lambda y el hash del cuerpo

- **Decisión:** Function URL con `AWS_IAM` y OAC de tipo `lambda` (SigV4, *always*).
  - Permisos `lambda:InvokeFunctionUrl` y `lambda:InvokeFunction` para `cloudfront.amazonaws.com`, con
    `SourceArn` de la distribución y calificador `live`. La guía actual de CloudFront pide ambos.
  - Para PUT y POST, el Worker calcula `x-amz-content-sha256`, porque Lambda no acepta cuerpos sin
    hash. Limita el cuerpo a 1 MB (413).
- **Por qué:** sin URL pública de Lambda y sin secretos en el código de la app. El plan B (secreto
  validado en `proxy.ts`) queda documentado y no hace falta.

## D-05. Caché por comportamiento

| Ruta | Origen | Política |
|---|---|---|
| `/ViajaCol/_next/static/*`, `/ViajaCol/media/*` | S3 (OAC) | `Managed-CachingOptimized`; los objetos llevan `immutable` |
| `/ViajaCol/_next/image*` | Lambda | Propia: consulta + `Accept` (AVIF/WebP) |
| Resto (incluido `/ViajaCol`) | Lambda | Propia con TTL por defecto 0, según el `Cache-Control` de Next.js |

- **Llave de caché:** incluye `RSC`, `Next-Router-Prefetch`, `Next-Router-State-Tree`,
  `Next-Router-Segment-Prefetch` y `Next-Url` (rutas interceptadas, para los modales de la spec 004).
  CloudFront ignora `Vary`, así que sin esto mezclaría el HTML con el payload RSC.
- **Cookies:** llegan al origen (`Managed-AllViewerExceptHostHeader`), pero no entran en la llave, así
  que lo personal debe ir como `private`.
- **Errores 5xx:** no se guardan en caché.

## D-06. Entrega continua sin OIDC

- **Decisión:**
  - **Compilación:** en GitHub (`ubuntu-24.04-arm`, gratis en repos públicos).
  - **Publicación:** en un runner de CodeBuild (`viajacol-deploy`, cómputo Lambda arm64 de 2 GB, imagen
    `nodejs24`). La etiqueta es `codebuild-viajacol-deploy-<run_id>-<attempt>`, más una etiqueta por
    job.
  - **Webhook:** filtro `WORKFLOW_JOB_QUEUED` + `ACTOR_ACCOUNT_ID` anclado (`^129683298$`), según el
    boletín 2026-002-AWS sobre filtros sin anclar.
  - **Aprobación:** el entorno `production` exige la del responsable.
  - **Secretos de despliegue:** van en el entorno, enmascarados en los registros públicos.
- **Por qué:** credenciales temporales del rol del proyecto, sin llaves en GitHub. Un fork no puede
  usar el runner.
- **Nota de aplicación:** el primer `apply` puede fallar con *"User is not authorized to access
  connection"* por la propagación de IAM del rol recién creado. Repetirlo lo resuelve (pasó el
  2026-11-25).

## D-07. Publicar y restaurar moviendo el alias

- **Decisión:** los pasos son:
  1. `aws s3 sync` de los estáticos, sin `--delete`;
  2. `update-function-code` desde S3;
  3. `publish-version`, con el commit en la descripción;
  4. `update-alias live`;
  5. invalidación de `/ViajaCol*`.

  Restaurar consiste en `update-alias` a la versión anterior y otra invalidación.
- **Por qué:** el cambio de tráfico es atómico y se revierte en segundos. Además, es la base del
  despliegue independiente por zona de la E3.

## D-08. Cabeceras de seguridad

- **Decisión:** una política de respuesta de CloudFront con:
  - HSTS de 2 años **sin** `includeSubDomains` ni `preload` (el dominio no es solo de ViajaCol;
    excepción CKV_AWS_259);
  - `nosniff`, `X-Frame-Options: DENY` y `Referrer-Policy: strict-origin-when-cross-origin`;
  - `Permissions-Policy` restrictiva y COOP `same-origin`;
  - CSP base con `override = false`, para que la app pueda enviar la suya;
  - `Server-Timing` al 100 %, para el laboratorio 4 de la guía de DevTools.
- **Riesgo aceptado:** la CSP base admite `'unsafe-inline'` para scripts y estilos (scripts en línea
  de RSC). El ADR de CSP decidirá entre nonce y hash.

## D-09. Límites de la cuenta y costos

- **Concurrencia:** la cuenta tiene 10 ejecuciones y no admite concurrencia reservada (CKV_AWS_115). Lo
  mitigan la caché de HTML y RSC en CloudFront y la alarma de estrangulamiento.
- **Sin cargo fijo:**
  - sin WAF de AWS, con limitación en Cloudflare (CKV_AWS_68);
  - sin CMK de KMS (CKV_AWS_158, CKV_AWS_26 y CKV_AWS_147);
  - sin NAT ni VPC (CKV_AWS_117);
  - sin registros de acceso de CloudFront (CKV_AWS_86).
- **Alarmas:** van solo en us-east-2 (Errors, Throttles y Url5xxCount ≥ umbral) hacia SNS por correo.
  Las métricas de CloudFront viven en us-east-1 y quedan fuera.

## D-10. Rutas públicas y regla de tasa bajo aprobación

- **Decisión:**
  - `enable_public_routes` crea las rutas del Worker y la regla de tasa de la zona (150 peticiones por
    IP cada 10 s bajo `/ViajaCol`, bloqueo de 10 s);
  - `enable_deploy_runner` crea el webhook en el repositorio;
  - ambos son `false` por defecto.
- **Por qué:** son los únicos cambios visibles fuera de AWS: el dominio público y una integración en
  GitHub. Además, la regla de tasa ocupa el único cupo del plan Free de la zona, compartida con los
  otros proyectos del dueño.
