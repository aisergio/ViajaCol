# Bootstrap de infraestructura

Stack mínimo que se aplica **una sola vez desde el PC** (huevo y gallina: crea lo que el resto de
Terraform y los pipelines necesitan). Región: `us-east-2` (región seleccionada del proyecto).

## Qué crea

| Recurso | Para qué |
|---|---|
| Bucket S3 `viajacol-tfstate-<sufijo>` | Estado remoto de Terraform: privado, versionado, cifrado, solo TLS, bloqueo nativo con `use_lockfile`. |
| Presupuesto `viajacol-monthly` (US$10) | Alertas por correo al 60 %, 80 % y 100 % del gasto real y al 100 % del pronóstico. No cuenta créditos, para ver el consumo real. |
| Conexión CodeConnections `viajacol-github` | Permite que los runners de CodeBuild reciban trabajos de GitHub Actions sin OIDC (bloqueado por la SCP). Queda `PENDING` hasta que el dueño la autorice. |

## Cómo se aplica

```powershell
aws login --region us-east-2 --profile viajacol
Copy-Item terraform.tfvars.example terraform.auto.tfvars   # y pon los correos reales
terraform init
terraform apply
```

Después del primer `apply`, el estado se migra al bucket que se acaba de crear:

1. Crear `backend.hcl` (ignorado por git) con `bucket = "<salida state_bucket>"` y `profile = "viajacol"`.
2. `terraform init -migrate-state -backend-config=backend.hcl`.

## Autorizar la conexión con GitHub

Consola de AWS → Developer Tools → Settings → **Connections** → `viajacol-github` → **Update pending
connection** → instalar la app de GitHub **solo** para el repositorio `aisergio/ViajaCol`.
