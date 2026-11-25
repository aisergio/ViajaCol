variable "region" {
  description = "Región seleccionada del proyecto en la nueva experiencia de AWS."
  type        = string
  default     = "us-east-2"
}

variable "aws_profile" {
  description = "Perfil de la AWS CLI con credenciales de `aws login`."
  type        = string
  default     = "viajacol"
}

variable "project" {
  description = "Prefijo técnico de los recursos."
  type        = string
  default     = "viajacol"
}

variable "budget_limit_usd" {
  description = "Límite mensual del presupuesto en USD."
  type        = number
  default     = 10
}

variable "budget_alert_emails" {
  description = "Correos que reciben las alertas del presupuesto. Se define en terraform.auto.tfvars (no versionado)."
  type        = list(string)
  sensitive   = true
}
