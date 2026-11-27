# Viaja Colombia

[![CI](https://github.com/aisergio/ViajaCol/actions/workflows/ci.yml/badge.svg)](https://github.com/aisergio/ViajaCol/actions/workflows/ci.yml)
[![Security](https://github.com/aisergio/ViajaCol/actions/workflows/security.yml/badge.svg)](https://github.com/aisergio/ViajaCol/actions/workflows/security.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/aisergio/ViajaCol/badge)](https://scorecard.dev/viewer/?uri=github.com/aisergio/ViajaCol)

Sitio turístico bilingüe (español / inglés) para descubrir sitios, fiestas, platos y experiencias de
Colombia y planear viajes con «Mi viaje». Prototipo académico de la asignatura **Arquitectura
Front-End** (Politécnico Grancolombiano).

> Estado: en construcción (Entrega 2). Publicado en https://aisergio.dev/ViajaCol desde `main`.

## Arquitectura (resumen)

- **Front-end y backend**: Next.js 16 (App Router, React Server Components, Server Actions) sobre Node.
- **Patrón**: MVVM con store compartido.
- **Infraestructura**: AWS (Lambda, CloudFront, S3, DynamoDB, Cognito) con Terraform, detrás de un
  Cloudflare Worker.
- **Proceso**: Spec-Driven Development con GitHub Spec Kit (`specs/`) y CI en GitHub Actions.

La documentación detallada estará en [`docs/`](docs/); las decisiones de arquitectura, en
[`docs/adr/`](docs/adr/).

### Despliegue

```mermaid
flowchart LR
  U[Navegador] --> W[Cloudflare Worker<br/>aisergio.dev/ViajaCol*]
  W -->|secreto + X-Forwarded-Host<br/>+ hash del cuerpo| CF[CloudFront<br/>origin-guard]
  CF -->|OAC| S3[(S3<br/>_next/static y media)]
  CF -->|OAC · streaming| L[Lambda arm64<br/>Next.js standalone<br/>+ Lambda Web Adapter]
```

- **Infraestructura:** está en [`infra/live`](infra/live) y en el módulo
  [`infra/modules/nextjs-zone`](infra/modules/nextjs-zone).
- **Publicación:** la hace [`deploy.yml`](.github/workflows/deploy.yml). Compila en GitHub, pide la
  aprobación de `production` en su propio job, publica en un runner de CodeBuild y restaura moviendo
  el alias `live`.
- **Guía y evidencia:** el paso a paso está en
  [`specs/003-plataforma/quickstart.md`](specs/003-plataforma/quickstart.md) y la evidencia, en
  [`evidencia.md`](specs/003-plataforma/evidencia.md).
- **Decisiones:** ADR [0003](docs/adr/0003-nextjs-en-lambda-con-web-adapter.md),
  [0004](docs/adr/0004-borde-cloudflare-y-origen-oculto.md) y
  [0005](docs/adr/0005-runner-de-codebuild-para-publicar.md).

### Catálogo

- **Contenido:** 96 fichas bilingües (6 regiones, 30 sitios, 24 fiestas, 18 platos, 12 experiencias y
  6 noticias de demostración). Viven en [`packages/content`](packages/content) como JSON validado con
  Zod.
- **Páginas:** todas se generan en el build. Las listas se filtran por región, mes y texto, y los
  filtros quedan en la dirección. Los sitios y las fiestas se abren en una ventana con dirección
  propia. El buscador del encabezado sugiere al instante.
- **Fotos:** 96 fotos de Wikimedia Commons con licencia libre, traídas por
  [`scripts/content/fetch-commons-images.ts`](scripts/content/fetch-commons-images.ts). Se publican en S3
  en tres anchos WebP, y sus autores y licencias están en la página de créditos.
- **Documentos:** [spec 004](specs/004-contenido/spec.md), [quickstart](specs/004-contenido/quickstart.md),
  [ADR 0006](docs/adr/0006-fotos-pregeneradas-en-s3.md) y la guía de
  [rutas interceptadas y ventanas](docs/aprendizaje/rutas-interceptadas-y-ventanas.md).

## Cómo correrlo

Requisitos: Node.js 22.13 o superior y npm 11.

```bash
npm install
npm run dev            # http://localhost:3030/ViajaCol
```

| Comando | Qué hace |
|---|---|
| `npm run lint` | ESLint (reglas de Next.js y TypeScript) |
| `npm run typecheck` | TypeScript estricto |
| `npm run test:coverage` | Vitest: ViewModels, modelos, catálogo de textos (cobertura ≥ 80 %) y validación del contenido |
| `npm run build` | Build de producción (las páginas se prerenderizan) |
| `npm run e2e` | Playwright + axe sobre el build de producción |

## Estructura

```
apps/web/          aplicación Next.js (rutas en src/app/[locale], funcionalidades en src/features)
packages/ui/       tokens de diseño (OKLCH) y componentes base (también la ventana)
packages/i18n/     catálogo de textos ES/EN
packages/content/  contenido del catálogo (JSON + Zod) y manifiesto de fotos
specs/             especificaciones de Spec Kit (una carpeta por funcionalidad)
infra/             Terraform (bootstrap y stacks)
scripts/           publicación (deploy/), infraestructura (infra/) y fotos del catálogo (content/)
docs/              ADR, guías de aprendizaje y seguridad
```

## Equipo

Proyecto de un grupo de tres estudiantes: un integrante desarrolla y los otros dos revisan pull
requests, el documento y el video.

## Licencia

Código bajo licencia [MIT](LICENSE). Las imágenes conservan sus licencias originales (ver créditos
en el sitio).
