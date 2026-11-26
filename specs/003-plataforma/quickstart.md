# Quickstart: Plataforma de publicación

Comandos para Windows (PowerShell) en la raíz del repositorio, salvo donde se indica Bash.

## 0. Requisitos (una sola vez)

1. Inicia sesión en AWS: `aws login --region us-east-2 --profile viajacol`.
2. Ten el token de Cloudflare en la variable de usuario `CLOUDFLARE_API_TOKEN`. Necesita:
   - Workers Scripts (editar) en la cuenta;
   - Workers Routes y Zone WAF (editar) en la zona.
3. Crea estos archivos no versionados en `infra/live/`, usando `terraform.tfvars.example` como guía:
   - `backend.hcl`: el mismo bucket y perfil que `infra/bootstrap/backend.hcl`;
   - `terraform.auto.tfvars`: los ID de Cloudflare, la conexión de GitHub y los correos de alerta.
4. Descarga y verifica la capa del adaptador:

   ```powershell
   ./scripts/infra/fetch-lwa-layer.ps1
   ```

## 1. Infraestructura sin rutas públicas

```powershell
$env:CLOUDFLARE_API_TOKEN = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN','User')
./scripts/infra/tf.ps1 live init '-backend-config=backend.hcl'
./scripts/infra/tf.ps1 live plan '-out=live.tfplan'
./scripts/infra/tf.ps1 live apply 'live.tfplan'
```

- Si el apply falla al crear `aws_codebuild_project` con *«User is not authorized to access
  connection»*, repítelo: es la propagación de IAM del rol recién creado.
- Confirma el correo de suscripción de SNS que llega a la bandeja de alertas.

## 2. Despliegue de prueba (sin tráfico público)

El paquete lo compila CI en Linux arm64 (job «Paquete de Lambda» de `deploy.yml` en el PR). Para
publicarlo, en Git Bash:

```bash
gh run download <run-id> --repo aisergio/ViajaCol --name web-<sha> --dir dist/web
export AWS_PROFILE=viajacol AWS_CA_BUNDLE="$USERPROFILE/.config/ca/windows-roots.pem"
out() { terraform -chdir=infra/live output -raw "$1"; }
export STATIC_BUCKET=$(out static_bucket) ARTIFACTS_BUCKET=$(out artifacts_bucket)
export FUNCTION_NAME=$(out web_function_name) DISTRIBUTION_ID=$(out distribution_id)
bash scripts/deploy/publish-web.sh
```

Verificación a través de CloudFront, con el secreto (`terraform output -raw origin_secret`):

```bash
curl -s -H "x-viajacol-origin: $SECRET" -H 'x-forwarded-host: aisergio.dev' https://<cloudfront_domain>/ViajaCol/api/health
curl -s -o /dev/null -w '%{http_code}\n' https://<cloudfront_domain>/ViajaCol/   # 403 sin el secreto
curl -s -o /dev/null -w '%{http_code}\n' <web_function_url>                       # 403 directo
```

## 3. Publicación real (requiere la aprobación del dueño)

1. Toma la foto del dominio antes del cambio (SC-002):

   ```powershell
   node scripts/infra/domain-snapshot.mjs snapshot "$env:TEMP\antes.json"
   ```

2. En `infra/live/terraform.auto.tfvars`, pon `enable_public_routes = true` y
   `enable_deploy_runner = true`. Luego ejecuta plan y apply.
3. Compara el dominio. Debe dar 0 cambios fuera de `/ViajaCol`:

   ```powershell
   node scripts/infra/domain-snapshot.mjs snapshot "$env:TEMP\despues.json"
   node scripts/infra/domain-snapshot.mjs compare "$env:TEMP\antes.json" "$env:TEMP\despues.json"
   ```

4. Ejecuta `./scripts/infra/sync-deploy-secrets.ps1`. Guarda los seis secretos `DEPLOY_*` del
   repositorio sin mostrarlos.
5. Fusiona en `main`. Si el PR cambió `infra/live` (por ejemplo, el Worker), ejecuta plan y apply
   antes de aprobar: la prueba de humo también revisa el borde.
6. En Actions → Despliegue, abre la ejecución y pulsa **Review deployments**. Marca `production` y
   pulsa **Approve and deploy**. Puedes aprobar mientras compila el paquete.
7. Revisa el resumen: commit, versión de Lambda y prueba de humo.

## 4. Restaurar

Ve a Actions → Despliegue → Run workflow, elige `accion: restaurar` y deja `version` vacío (la
anterior) o pon un número. Aprueba `production` como al publicar. La prueba de humo confirma el commit
restaurado.

## 5. Rotar el secreto del origen

1. Pon `origin_secret_previous = "<valor actual>"` y sube `origin_secret_version`. Luego ejecuta plan
   y apply.
2. Con el Worker ya actualizado, vuelve a poner `origin_secret_previous = ""` y ejecuta apply otra
   vez.

## 6. Pruebas locales

```powershell
node --test infra/live/edge/worker.test.mjs
npm run test
docker run --rm -v "${PWD}:/repo" -w /repo ghcr.io/bridgecrewio/checkov:3.4.10 -d infra --framework terraform --config-file infra/.checkov.yaml --compact --quiet --skip-path '\.terraform'
```
