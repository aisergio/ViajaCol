# Zona web (E2): una sola app Next.js. En la E3 este bloque se repite por dominio (Multi-Zones).

locals {
  lwa_layer_zip = "${path.module}/.build/lambda-adapter-arm64-${var.lwa_version}.zip"
}

# Capa propia del Lambda Web Adapter: copia de la capa oficial con la versión fijada. El zip lo
# descarga y verifica scripts/infra/fetch-lwa-layer.ps1 antes del apply; así la plataforma no
# depende de que el publicador conserve su capa.
resource "aws_lambda_layer_version" "lwa" {
  layer_name               = "${var.project}-lambda-web-adapter-arm64"
  description              = "AWS Lambda Web Adapter ${var.lwa_version} (arm64), copiado de la capa oficial y verificado por SHA-256"
  filename                 = local.lwa_layer_zip
  source_code_hash         = var.lwa_layer_sha256
  compatible_architectures = ["arm64"]
  compatible_runtimes      = ["nodejs24.x"]
  license_info             = "Apache-2.0"
  skip_destroy             = true
}

module "web" {
  source = "../modules/nextjs-zone"

  name            = "${var.project}-web"
  zone            = "web"
  base_path       = "/${var.base_path}"
  layer_arns      = [aws_lambda_layer_version.lwa.arn]
  memory_mb       = var.web_memory_mb
  alarm_topic_arn = aws_sns_topic.alerts.arn

  # Cuenta (spec 006): solo identificadores y nombres de parámetros; los secretos están en SSM.
  environment = {
    AUTH_ORIGIN          = local.site_origin
    AUTH_SECRET_PARAM    = aws_ssm_parameter.auth_secret.name
    COGNITO_SECRET_PARAM = aws_ssm_parameter.cognito_client_secret.name
    COGNITO_USER_POOL_ID = aws_cognito_user_pool.users.id
    COGNITO_CLIENT_ID    = aws_cognito_user_pool_client.web.id
    COGNITO_DOMAIN       = local.cognito_host
    USERS_TABLE          = aws_dynamodb_table.users.name
    TRIPS_TABLE          = aws_dynamodb_table.trips.name
  }
}

# --- Alertas por correo ------------------------------------------------------------------------------

resource "aws_sns_topic" "alerts" {
  #checkov:skip=CKV_AWS_26:CloudWatch no puede publicar en temas cifrados con la clave administrada por AWS; una CMK cuesta US$1 al mes.
  name         = "${var.project}-alertas"
  display_name = "ViajaCol"
}

resource "aws_sns_topic_subscription" "email" {
  count = nonsensitive(length(var.alert_emails))

  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_emails[count.index]
}
