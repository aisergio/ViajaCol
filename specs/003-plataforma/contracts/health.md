# Contrato: `/ViajaCol/api/health`

## GET

- **200**, `Cache-Control: no-store`.
- **Cuerpo:** `{ "status": "ok", "version": "<sha del commit compilado | dev>" }`.
- **Quién lo usa:**
  - la comprobación de arranque del Lambda Web Adapter (`AWS_LWA_READINESS_CHECK_PATH`);
  - `smoke.sh`;
  - la restauración.
- **Restricción:** nunca devuelve datos de usuarios, configuración ni secretos.

## POST

- **Cuerpo:** cualquiera, de hasta 1 MB (el borde responde 413 si es mayor).
- **200**, `Cache-Control: no-store`.
- **Respuesta:** `{ "status": "ok", "received": <bytes recibidos> }`.
- **Propósito:** comprobar que un cuerpo cruza el Worker y CloudFront (OAC con
  `x-amz-content-sha256`) sin alterarse (FR-008).

## Marcador de posición (antes de la primera publicación)

El código inicial de Terraform responde:
- `{ "status": "placeholder", "version": "none" }` en esta ruta;
- 503 en las demás.
