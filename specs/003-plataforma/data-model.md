# Data Model: Plataforma de publicación del prototipo

Esta spec no guarda datos de usuarios. Las «entidades» son estados de la plataforma y viven en AWS.

## Versión publicada

| Campo | Fuente | Regla |
|---|---|---|
| Número | `aws lambda publish-version` | Correlativo e inmutable |
| Commit | Descripción de la versión y `APP_VERSION` compilado | El mismo que devuelve `/api/health` |
| Paquete | `s3://<artifacts>/web/<commit>.zip` | Caduca a los 30 días; Lambda guarda su propia copia |
| Estáticos | `s3://<static>/ViajaCol/_next/static/**` | Solo se agregan; nunca se borran al publicar |

## Puntero `live`

- Es un alias de Lambda, con la Function URL y los permisos de CloudFront calificados con él.
- **Transiciones:**
  - `$LATEST` → `N`: primera publicación.
  - `N` → `N+1`: publicar.
  - `N` → `K < N`: restaurar.
- **Invariante:** solo `publish-web.sh` y `rollback.sh` lo mueven; Terraform ignora `function_version`.

## Secreto del origen

| Estado | KeyValueStore | Worker |
|---|---|---|
| Normal | `secret` = S | `ORIGIN_SECRET` = S |
| Rotación (S → S') | `secret` = S', `secret_previous` = S | `ORIGIN_SECRET` = S' (al aplicar) |
| Fin de la rotación | `secret` = S' | `ORIGIN_SECRET` = S' |

La rotación sube `origin_secret_version` y pasa el valor anterior en `origin_secret_previous`.
Mientras ambos valores sean válidos, no hay caída.

## Ejecución de publicación

Es una ejecución de `deploy.yml` y pasa por estos estados: `paquete` (GitHub) → espera de aprobación
(`production`) → `publicar` (CodeBuild) → prueba de humo.

Deja como evidencia:
- el resumen de la ejecución (commit, versión nueva y anterior, tamaño del paquete);
- el artefacto `web-<sha>` (7 días).
