# Runner de CodeBuild para los jobs de publicación de GitHub Actions. La SCP del proyecto bloquea
# OIDC, así que las credenciales salen del rol del proyecto de CodeBuild: son temporales y no salen
# de AWS. El webhook solo acepta jobs de la cuenta del responsable (filtro anclado: ^id$), nunca
# los de un fork o un tercero (FR-013).

data "aws_caller_identity" "current" {}

resource "aws_cloudwatch_log_group" "deploy_runner" {
  #checkov:skip=CKV_AWS_158:Cifrado en reposo con la clave administrada por CloudWatch; una CMK cuesta US$1 al mes.
  #checkov:skip=CKV_AWS_338:Retención de 14 días por costo; un prototipo académico no necesita un año de registros.
  name              = "/aws/codebuild/${var.project}-deploy"
  retention_in_days = 14
}

data "aws_iam_policy_document" "deploy_runner_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["codebuild.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_iam_role" "deploy_runner" {
  name               = "${var.project}-deploy-runner"
  description        = "Publica ViajaCol desde GitHub Actions (runner de CodeBuild)"
  assume_role_policy = data.aws_iam_policy_document.deploy_runner_assume.json
}

locals {
  web_function_arn = module.web.function_arn
}

data "aws_iam_policy_document" "deploy_runner" {
  statement {
    sid       = "RunnerLogs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.deploy_runner.arn}:*"]
  }

  statement {
    sid = "UseGitHubConnection"
    actions = [
      "codeconnections:GetConnection",
      "codeconnections:GetConnectionToken",
      "codeconnections:UseConnection",
      "codestar-connections:GetConnection",
      "codestar-connections:GetConnectionToken",
      "codestar-connections:UseConnection",
    ]
    resources = [
      var.github_connection_arn,
      replace(var.github_connection_arn, ":codeconnections:", ":codestar-connections:"),
    ]
  }

  statement {
    sid       = "ListStaticAndArtifacts"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.this["static"].arn, aws_s3_bucket.this["artifacts"].arn]
  }

  statement {
    sid     = "WriteStaticAssets"
    actions = ["s3:PutObject", "s3:GetObject"]
    resources = [
      "${aws_s3_bucket.this["static"].arn}/${var.base_path}/*",
      "${aws_s3_bucket.this["artifacts"].arn}/web/*",
    ]
  }

  statement {
    sid = "PublishWebFunction"
    actions = [
      "lambda:GetAlias",
      "lambda:GetFunction",
      "lambda:GetFunctionConfiguration",
      "lambda:ListVersionsByFunction",
      "lambda:PublishVersion",
      "lambda:UpdateAlias",
      "lambda:UpdateFunctionCode",
    ]
    resources = [local.web_function_arn, "${local.web_function_arn}:*"]
  }

  statement {
    sid       = "InvalidateHtml"
    actions   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
    resources = [aws_cloudfront_distribution.web.arn]
  }
}

resource "aws_iam_role_policy" "deploy_runner" {
  name   = "publish"
  role   = aws_iam_role.deploy_runner.id
  policy = data.aws_iam_policy_document.deploy_runner.json
}

resource "aws_codebuild_project" "deploy_runner" {
  #checkov:skip=CKV_AWS_147:Registros y caché cifrados con claves administradas por AWS; una CMK cuesta US$1 al mes.
  name           = "${var.project}-deploy"
  description    = "Runner de GitHub Actions que publica ViajaCol (solo jobs del responsable)"
  service_role   = aws_iam_role.deploy_runner.arn
  build_timeout  = 15
  queued_timeout = 30

  artifacts {
    type = "NO_ARTIFACTS"
  }

  # Cómputo Lambda: arranca en segundos y se cobra por segundo; basta para subir archivos y llamar APIs.
  environment {
    type         = "ARM_LAMBDA_CONTAINER"
    compute_type = "BUILD_LAMBDA_2GB"
    image        = "aws/codebuild/amazonlinux-aarch64-lambda-standard:nodejs24"
  }

  source {
    type     = "GITHUB"
    location = "https://github.com/${var.github_repository}.git"

    auth {
      type     = "CODECONNECTIONS"
      resource = var.github_connection_arn
    }
  }

  logs_config {
    cloudwatch_logs {
      group_name = aws_cloudwatch_log_group.deploy_runner.name
      status     = "ENABLED"
    }
  }

  depends_on = [aws_iam_role_policy.deploy_runner]
}

resource "aws_codebuild_webhook" "deploy_runner" {
  count = var.enable_deploy_runner ? 1 : 0

  project_name = aws_codebuild_project.deploy_runner.name
  build_type   = "BUILD"

  filter_group {
    filter {
      type    = "EVENT"
      pattern = "WORKFLOW_JOB_QUEUED"
    }

    filter {
      type    = "ACTOR_ACCOUNT_ID"
      pattern = "^${var.github_actor_id}$"
    }
  }
}
