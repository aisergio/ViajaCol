# Viaja Colombia

Sitio turístico bilingüe (español / inglés) para descubrir sitios, fiestas, platos y experiencias de
Colombia y planear viajes con «Mi viaje». Prototipo académico de la asignatura **Arquitectura
Front-End** (Politécnico Grancolombiano).

> Estado: en construcción (Entrega 2). Sitio previsto en https://aisergio.dev/ViajaCol

## Arquitectura (resumen)

- **Front-end y backend**: Next.js 16 (App Router, React Server Components, Server Actions) sobre Node.
- **Patrón**: MVVM con store compartido.
- **Infraestructura**: AWS (Lambda, CloudFront, S3, DynamoDB, Cognito) con Terraform, detrás de un
  Cloudflare Worker.
- **Proceso**: Spec-Driven Development con GitHub Spec Kit (`specs/`) y CI en GitHub Actions.

La documentación detallada estará en [`docs/`](docs/).

## Equipo

Proyecto de un grupo de tres estudiantes: un integrante desarrolla y los otros dos revisan pull
requests, el documento y el video.

## Licencia

Código bajo licencia [MIT](LICENSE). Las imágenes conservan sus licencias originales (ver créditos
en el sitio).
