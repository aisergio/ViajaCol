# Una zona Next.js en Lambda: función arm64 con Lambda Web Adapter (servidor standalone), alias
# `live`, Function URL con IAM (la firma CloudFront con OAC), registros y alarmas.
# El código real lo publica la canalización (`scripts/deploy/publish-web.sh`): Terraform crea la
# función con un marcador de posición y luego ignora el código y la versión del alias.

data "archive_file" "placeholder" {
  type             = "zip"
  source_dir       = "${path.module}/placeholder"
  output_path      = "${path.root}/.build/${var.name}-placeholder.zip"
  output_file_mode = "0755"
}

# --- Registros ---------------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "this" {
  #checkov:skip=CKV_AWS_158:Cifrado en reposo con la clave administrada por CloudWatch; una CMK cuesta US$1 al mes.
  #checkov:skip=CKV_AWS_338:Retención de 14 días por costo; un prototipo académico no necesita un año de registros.
  name              = "/aws/lambda/${var.name}"
  retention_in_days = var.log_retention_days
}

# --- Rol de ejecución (mínimo privilegio) -----------------------------------------------------------

data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "this" {
  name               = "${var.name}-lambda"
  description        = "Ejecución de la zona ${var.zone} (Next.js en Lambda)"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

data "aws_iam_policy_document" "runtime" {
  statement {
    sid       = "WriteOwnLogs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.this.arn}:*"]
  }

  statement {
    sid       = "XRayTracing"
    actions   = ["xray:PutTraceSegments", "xray:PutTelemetryRecords"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "runtime" {
  name   = "runtime"
  role   = aws_iam_role.this.id
  policy = data.aws_iam_policy_document.runtime.json
}

# --- Función, alias y URL ---------------------------------------------------------------------------

resource "aws_lambda_function" "this" {
  #checkov:skip=CKV_AWS_115:La cuenta tiene un límite de 10 ejecuciones y no admite concurrencia reservada.
  #checkov:skip=CKV_AWS_116:Solo se invoca por Function URL (síncrona); una DLQ aplica a invocaciones asíncronas.
  #checkov:skip=CKV_AWS_117:Sin VPC: no usa recursos privados y una VPC exigiría NAT (costo fijo mensual).
  #checkov:skip=CKV_AWS_173:Las variables de entorno no contienen secretos; las cifra la clave administrada por AWS.
  #checkov:skip=CKV_AWS_272:Sin firma de código: el paquete solo lo publica la canalización desde main.
  function_name = var.name
  description   = "Next.js standalone (${var.zone}) con Lambda Web Adapter"
  role          = aws_iam_role.this.arn
  runtime       = "nodejs24.x"
  architectures = ["arm64"]
  handler       = "run.sh"
  memory_size   = var.memory_mb
  timeout       = var.timeout_s
  layers        = var.layer_arns
  publish       = false

  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256

  environment {
    variables = merge({
      AWS_LAMBDA_EXEC_WRAPPER      = "/opt/bootstrap"
      AWS_LWA_INVOKE_MODE          = "response_stream"
      AWS_LWA_PORT                 = "8080"
      PORT                         = "8080"
      AWS_LWA_READINESS_CHECK_PATH = "${var.base_path}/api/health"
      NEXT_TELEMETRY_DISABLED      = "1"
    }, var.environment)
  }

  tracing_config {
    mode = "Active"
  }

  logging_config {
    log_format = "Text"
    log_group  = aws_cloudwatch_log_group.this.name
  }

  lifecycle {
    # El código lo publica la canalización; Terraform solo crea el marcador de posición.
    ignore_changes = [filename, source_code_hash, s3_bucket, s3_key, s3_object_version]
  }

  depends_on = [aws_iam_role_policy.runtime]
}

resource "aws_lambda_alias" "live" {
  name             = "live"
  description      = "Versión que atiende el tráfico; la mueve la canalización (publicar o restaurar)"
  function_name    = aws_lambda_function.this.function_name
  function_version = "$LATEST"

  lifecycle {
    ignore_changes = [function_version, routing_config]
  }
}

resource "aws_lambda_function_url" "live" {
  function_name      = aws_lambda_function.this.function_name
  qualifier          = aws_lambda_alias.live.name
  authorization_type = "AWS_IAM"
  invoke_mode        = "RESPONSE_STREAM"
}

# --- Alarmas ----------------------------------------------------------------------------------------

locals {
  alarms = {
    errores = {
      metric      = "Errors"
      threshold   = 5
      description = "Errores de ejecución repetidos (5 o más en 5 minutos)."
    }
    estrangulamiento = {
      metric      = "Throttles"
      threshold   = 1
      description = "Peticiones estranguladas: se alcanzó el límite de concurrencia de la cuenta."
    }
    respuestas-5xx = {
      metric      = "Url5xxCount"
      threshold   = 5
      description = "Respuestas 5xx de la Function URL (5 o más en 5 minutos)."
    }
  }
}

resource "aws_cloudwatch_metric_alarm" "this" {
  for_each = local.alarms

  alarm_name          = "${var.name}-${each.key}"
  alarm_description   = "${var.zone}: ${each.value.description}"
  namespace           = "AWS/Lambda"
  metric_name         = each.value.metric
  dimensions          = { FunctionName = aws_lambda_function.this.function_name }
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = each.value.threshold
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [var.alarm_topic_arn]
  ok_actions          = [var.alarm_topic_arn]
}
