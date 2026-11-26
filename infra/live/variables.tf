variable "region" {
  description = "Región del proyecto en la nueva experiencia de AWS."
  type        = string
  default     = "us-east-2"
}

variable "aws_profile" {
  description = "Perfil de la AWS CLI con credenciales de `aws login` (null en CI)."
  type        = string
  default     = "viajacol"
}

variable "project" {
  description = "Prefijo técnico de los recursos."
  type        = string
  default     = "viajacol"
}

variable "domain" {
  description = "Dominio público, gestionado en Cloudflare."
  type        = string
  default     = "aisergio.dev"
}

variable "base_path" {
  description = "Ruta del sitio dentro del dominio, sin barras (coincide con basePath de Next.js)."
  type        = string
  default     = "ViajaCol"
}

variable "cloudflare_account_id" {
  description = "Cuenta de Cloudflare dueña del Worker. Va en terraform.auto.tfvars (no versionado)."
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Zona de Cloudflare del dominio. Va en terraform.auto.tfvars (no versionado)."
  type        = string
}

variable "github_repository" {
  description = "Repositorio que publica (propietario/nombre)."
  type        = string
  default     = "aisergio/ViajaCol"
}

variable "github_actor_id" {
  description = "ID numérico de la cuenta de GitHub autorizada a usar el runner (https://api.github.com/users/<usuario>)."
  type        = string
  default     = "129683298"

  validation {
    condition     = can(regex("^[0-9]+$", var.github_actor_id))
    error_message = "Debe ser el ID numérico de la cuenta de GitHub."
  }
}

variable "github_connection_arn" {
  description = "ARN de la conexión con GitHub creada en el stack bootstrap. Va en terraform.auto.tfvars."
  type        = string
}

variable "alert_emails" {
  description = "Correos que reciben las alarmas técnicas. Va en terraform.auto.tfvars (no versionado)."
  type        = list(string)
  sensitive   = true
}

variable "enable_public_routes" {
  description = "Publica las rutas del Worker en el dominio y la regla de límite de tasa. Requiere aprobación del dueño."
  type        = bool
  default     = false
}

variable "enable_rate_limit" {
  description = "Crea la regla gratuita de límite de tasa (el plan Free admite una por zona)."
  type        = bool
  default     = true
}

variable "rate_limit_requests" {
  description = "Peticiones permitidas por IP cada 10 s bajo la ruta del sitio."
  type        = number
  default     = 150
}

variable "enable_deploy_runner" {
  description = "Crea el webhook del runner de CodeBuild en el repositorio. Requiere aprobación del dueño."
  type        = bool
  default     = false
}

variable "lwa_version" {
  description = "Versión del AWS Lambda Web Adapter (capa propia copiada de la oficial)."
  type        = string
  default     = "1.1.0"
}

variable "lwa_layer_sha256" {
  description = "SHA-256 (base64) de la capa oficial arm64 de esa versión; scripts/infra/fetch-lwa-layer.ps1 lo verifica."
  type        = string
  default     = "+l2/kNKQVNBNrErkJ+E6/DP3ckTefHLwrC2UTuTbE+c="
}

variable "origin_secret_version" {
  description = "Súbelo para rotar el secreto entre el Worker y CloudFront."
  type        = number
  default     = 1
}

variable "origin_secret_previous" {
  description = "Secreto anterior aceptado durante una rotación (vacío fuera de ella)."
  type        = string
  default     = ""
  sensitive   = true
}

variable "web_memory_mb" {
  description = "Memoria de la función web."
  type        = number
  default     = 1024
}
