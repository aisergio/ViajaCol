# Cuenta de usuario (spec 006): Cognito con managed login, perfil en DynamoDB y los dos secretos de la
# sesión en SSM. La función de la zona web recibe solo los permisos que usa.

locals {
  site_origin    = "https://${var.domain}"
  site_url       = "${local.site_origin}/${var.base_path}"
  local_site_url = "http://localhost:3000/${var.base_path}"
  cognito_host   = "${aws_cognito_user_pool_domain.this.domain}.auth.${var.region}.amazoncognito.com"
}

# --- Grupo de usuarios -------------------------------------------------------------------------------

resource "aws_cognito_user_pool" "users" {
  name                = "${var.project}-users"
  user_pool_tier      = "ESSENTIALS"
  deletion_protection = "INACTIVE" # El curso termina con scripts/infra/destroy.ps1.
  mfa_configuration   = "OFF"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  username_configuration {
    case_sensitive = false
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Una sola plantilla por grupo: va en los dos idiomas (research D-10).
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Viaja Colombia: tu código / your code"
    email_message        = "Tu código de Viaja Colombia es {####}. / Your Viaja Colombia code is {####}."
  }
}

resource "random_id" "cognito_domain" {
  byte_length = 3
}

resource "aws_cognito_user_pool_domain" "this" {
  domain                = "${var.project}-${random_id.cognito_domain.hex}"
  user_pool_id          = aws_cognito_user_pool.users.id
  managed_login_version = 2
}

resource "aws_cognito_user_pool_client" "web" {
  name         = "${var.project}-web"
  user_pool_id = aws_cognito_user_pool.users.id

  generate_secret                      = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  supported_identity_providers         = ["COGNITO"]
  explicit_auth_flows                  = ["ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_USER_SRP_AUTH"]
  prevent_user_existence_errors        = "ENABLED"
  enable_token_revocation              = true

  # Producción y desarrollo local (quickstart §2). Las salidas vuelven a la portada de cada idioma.
  callback_urls = [
    "${local.site_url}/api/auth/callback/cognito",
    "${local.local_site_url}/api/auth/callback/cognito",
  ]
  logout_urls = [local.site_url, "${local.site_url}/en", local.local_site_url, "${local.local_site_url}/en"]

  # El sitio no guarda estos tokens (research D-03): solo los usa al volver de Cognito.
  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 1
  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
}

resource "aws_cognito_managed_login_branding" "web" {
  user_pool_id                = aws_cognito_user_pool.users.id
  client_id                   = aws_cognito_user_pool_client.web.id
  use_cognito_provided_values = true
}

# --- Perfil ------------------------------------------------------------------------------------------

resource "aws_dynamodb_table" "users" {
  #checkov:skip=CKV_AWS_119:Cifrado con la clave propia de AWS; una CMK cuesta US$1 al mes.
  #checkov:skip=CKV_AWS_28:Sin recuperación a un punto en el tiempo: datos de demostración, y una cuenta eliminada no debe seguir en copias de 35 días.
  name                        = "${var.project}-users"
  billing_mode                = "PAY_PER_REQUEST"
  hash_key                    = "sub"
  deletion_protection_enabled = false

  attribute {
    name = "sub"
    type = "S"
  }
}

# --- Secretos de la sesión (research D-07) -------------------------------------------------------------

resource "random_password" "auth_secret" {
  length  = 48
  special = false
}

resource "aws_ssm_parameter" "auth_secret" {
  #checkov:skip=CKV_AWS_337:Cifrado con la clave administrada aws/ssm; una CMK cuesta US$1 al mes.
  name        = "/${var.project}/web/auth-secret"
  description = "Clave que firma y cifra la sesión de la zona web (Better Auth)"
  type        = "SecureString"
  value       = random_password.auth_secret.result
}

resource "aws_ssm_parameter" "cognito_client_secret" {
  #checkov:skip=CKV_AWS_337:Cifrado con la clave administrada aws/ssm; una CMK cuesta US$1 al mes.
  name        = "/${var.project}/web/cognito-client-secret"
  description = "Secreto del cliente web de Cognito"
  type        = "SecureString"
  value       = aws_cognito_user_pool_client.web.client_secret
}

# --- Permisos de la función --------------------------------------------------------------------------

data "aws_kms_alias" "ssm" {
  name = "alias/aws/ssm"
}

data "aws_iam_policy_document" "account" {
  statement {
    sid       = "ProfileTable"
    actions   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem"]
    resources = [aws_dynamodb_table.users.arn]
  }

  statement {
    sid       = "DeleteOwnAccount"
    actions   = ["cognito-idp:AdminDeleteUser"]
    resources = [aws_cognito_user_pool.users.arn]
  }

  statement {
    sid       = "ReadSessionSecrets"
    actions   = ["ssm:GetParameters"]
    resources = [aws_ssm_parameter.auth_secret.arn, aws_ssm_parameter.cognito_client_secret.arn]
  }

  statement {
    sid       = "DecryptSessionSecrets"
    actions   = ["kms:Decrypt"]
    resources = [data.aws_kms_alias.ssm.target_key_arn]
    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["ssm.${var.region}.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "web_account" {
  name   = "account"
  role   = module.web.role_name
  policy = data.aws_iam_policy_document.account.json
}

# --- Salidas -----------------------------------------------------------------------------------------

output "cognito_user_pool_id" {
  description = "Grupo de usuarios de la cuenta (spec 006)."
  value       = aws_cognito_user_pool.users.id
}

output "cognito_client_id" {
  description = "Cliente web de Cognito (público: viaja en la dirección de inicio de sesión)."
  value       = aws_cognito_user_pool_client.web.id
}

output "cognito_domain" {
  description = "Dominio de la pantalla de inicio de sesión."
  value       = local.cognito_host
}

output "users_table" {
  description = "Tabla del perfil."
  value       = aws_dynamodb_table.users.name
}
