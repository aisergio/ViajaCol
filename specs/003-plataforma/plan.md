# Implementation Plan: Plataforma de publicación del prototipo

**Branch**: `003-plataforma` | **Date**: 2026-11-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-plataforma/spec.md`

## Summary

El sitio se publica en `https://aisergio.dev/ViajaCol` con cuatro piezas:

1. **Borde:** un Cloudflare Worker en las rutas `/ViajaCol*`. Canoniza la ruta, agrega el secreto del
   origen y el host público, calcula el hash del cuerpo y devuelve la respuesta en *streaming*.
2. **CDN:** CloudFront. La función `origin-guard` rechaza todo lo que no trae el secreto. Los estáticos
   con hash salen de S3 con caché inmutable. Además, agrega las cabeceras de seguridad.
3. **Cómputo:** Lambda arm64 con el servidor *standalone* de Next.js detrás del Lambda Web Adapter,
   alias `live` y Function URL con IAM. CloudFront la firma con OAC.
4. **Entrega:** `deploy.yml` compila en GitHub (arm64) y publica en un runner de CodeBuild con
   aprobación del entorno `production`. Publicar o restaurar es mover el alias.

Todo está en Terraform (`infra/live` y el módulo `infra/modules/nextjs-zone`). Los únicos cambios
en la zona del dominio (rutas y regla de tasa) se activan aparte, con `enable_public_routes`.

## Technical Context

**Language/Version**:
- Terraform 1.17.2, con los proveedores AWS 6.74, Cloudflare 5.29, random 3.9 y archive 2.8.
- Node.js 24 (runtime `nodejs24.x` en Lambda y CI).
- JavaScript estándar en el Worker y en CloudFront Functions (runtime `cloudfront-js-2.0`).
- Bash en los scripts de despliegue y PowerShell en los locales.

**Primary Dependencies**:

| Pieza | Versión | Nota |
|---|---|---|
| AWS Lambda Web Adapter | 1.1.0 (capa oficial arm64 v30) | Copia propia verificada por SHA-256 |
| Next.js | 16.4.6 | `output: 'standalone'` solo en CI (`NEXT_OUTPUT`) |
| checkov-action | v12.3146.0 (checkov 3.4.10) | Actualizada en la spec 002 |
| actions/download-artifact | v8.0.2 | Fijada por SHA |
| Imagen de CodeBuild | `amazonlinux-aarch64-lambda-standard:nodejs24` | Cómputo Lambda de 2 GB |

**Storage**: dos buckets S3 privados: `static`, para los recursos `/ViajaCol/_next/static/*`, y
`artifacts`, para los zip de Lambda. Además, un KeyValueStore de CloudFront para el secreto. No hay
base de datos en esta spec.

**Testing**:
- `node --test` para el Worker: canonización, cabeceras, hash, 413 y reescritura de `Location`.
- Vitest y Playwright para `/api/health`.
- `terraform validate`, TFLint y Checkov en `iac.yml`.
- `scripts/deploy/smoke.sh` tras cada publicación.

**Target Platform**:
- AWS us-east-2, en el proyecto ViajaCol de la nueva experiencia (SCP de una región, sin OIDC). La
  CDN es global.
- Cloudflare, plan Free, zona `aisergio.dev`.

**Project Type**: infraestructura y entrega continua de una aplicación web.

**Performance Goals**:
- Primer byte por debajo de 1 s con la función activa.
- Arranque en frío por debajo de 5 s para la página completa.
- HTML estático y datos RSC desde la caché de CloudFront.

**Constraints**:
- US$10 al mes, sin recursos con cargo fijo.
- Concurrencia de la cuenta: 10.
- Sin OIDC desde GitHub.
- La zona del dominio es compartida con otros proyectos.
- El plan Free de Cloudflare admite 1 regla de tasa (bloqueo de 10 s).

**Scale/Scope**: 1 zona (web) en la E2; el módulo `nextjs-zone` se repite por dominio en la E3.

## Constitution Check

| Principio | Cómo se cumple | Estado |
|---|---|---|
| I. Server-first | El servidor de Next.js corre completo en Lambda (RSC, Route Handlers y luego Server Actions); la CDN respeta su `Cache-Control`. | ✅ |
| II. MVVM con store compartido | No aplica: la spec no toca la interfaz. | — |
| III. Pruebas primero | Pruebas del Worker y de `/api/health` antes de publicar, prueba de humo después y escaneo de IaC en cada PR. | ✅ |
| IV. Accesible, bilingüe y rápido | La caché inmutable de los estáticos, el HTML en CDN y el *streaming* sin buffer protegen el LCP. SC-006 mide Lighthouse sobre la dirección pública. | ✅ |
| V. Seguro por defecto | Origen oculto (OAC y secreto en el borde), cabeceras de seguridad, sin llaves de larga duración (rol de CodeBuild), runner filtrado por la cuenta del responsable y excepciones de Checkov con motivo. | ✅ |
| Infraestructura y costos | Todo en Terraform, con etiquetas `Project=ViajaCol`; sin WAF, sin CMK y sin NAT, por costo; registros de 14 días. | ✅ |

**Re-check tras el diseño:** sin violaciones. La CSP base admite `'unsafe-inline'`, como riesgo
documentado hasta el ADR de CSP (research.md, D-08).

## Project Structure

### Documentation (this feature)

```text
specs/003-plataforma/
├── spec.md
├── plan.md
├── research.md          # Decisiones D-01…D-10
├── data-model.md        # Versión publicada, alias, secreto, ejecución
├── quickstart.md        # Aplicar, publicar, verificar, restaurar, rotar
├── contracts/
│   ├── health.md        # GET/POST /ViajaCol/api/health
│   └── borde-origen.md  # Cabeceras Worker → CloudFront → Lambda
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
infra/
├── live/                       # Stack de la plataforma (estado en S3: live/terraform.tfstate)
│   ├── web.tf                  # Capa del Web Adapter, módulo web y alertas SNS
│   ├── static.tf               # Buckets static y artifacts
│   ├── cdn.tf                  # CloudFront, OAC, políticas, origin-guard y KVS
│   ├── edge.tf                 # Worker, rutas y regla de tasa (Cloudflare)
│   ├── deploy.tf               # Runner de CodeBuild y su webhook
│   ├── functions/origin-guard.js
│   └── edge/worker.mjs (+ worker.test.mjs)
└── modules/nextjs-zone/        # Lambda + alias live + Function URL + registros + alarmas
scripts/
├── infra/fetch-lwa-layer.ps1   # Descarga y verifica la capa oficial
└── deploy/                     # build-web.sh, publish-web.sh, rollback.sh, smoke.sh, lambda/run.sh
apps/web/src/app/api/health/    # Endpoint de salud (FR-011)
.github/workflows/deploy.yml    # Paquete (PR), publicación (main) y restauración (manual)
```

**Structure Decision**:
- `infra/live` concentra lo que existe una sola vez: buckets, CDN, borde y runner.
- La zona de cómputo vive en un módulo porque la E3 la repetirá por dominio con alias y versiones
  independientes.

## Complexity Tracking

| Decisión | Por qué hace falta | Alternativa más simple descartada |
|---|---|---|
| Worker de Cloudflare delante de CloudFront | El dominio ya vive en Cloudflare con otros proyectos y solo `/ViajaCol*` debe cambiar. | Mover el DNS a Route 53 o apuntar el dominio a CloudFront: rompe el sitio raíz. |
| Secreto en el borde y además OAC | OAC protege Lambda y S3; el secreto impide usar la CDN directamente para saltarse el límite de tasa. | Solo OAC: el dominio `*.cloudfront.net` quedaría abierto. |
| Runner de CodeBuild | La SCP bloquea OIDC y la constitución prohíbe llaves de larga duración. | Llaves de IAM en secretos de GitHub: viola el principio V. |
| Capa propia del Web Adapter | Independencia del publicador y verificación de integridad. | ARN público: más simple, pero sin control si la capa desaparece. |
