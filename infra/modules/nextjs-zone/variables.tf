variable "name" {
  description = "Nombre de la función Lambda (por ejemplo, viajacol-web)."
  type        = string
}

variable "zone" {
  description = "Zona lógica que sirve la función (E2: web; E3: una por dominio)."
  type        = string
}

variable "base_path" {
  description = "basePath de la app Next.js, con barra inicial (por ejemplo, /ViajaCol)."
  type        = string
}

variable "layer_arns" {
  description = "ARN de las capas, empezando por la del Lambda Web Adapter."
  type        = list(string)
}

variable "memory_mb" {
  description = "Memoria de la función; la CPU escala con ella."
  type        = number
  default     = 1024
}

variable "timeout_s" {
  description = "Tiempo máximo por petición. CloudFront espera 30 s por defecto."
  type        = number
  default     = 30
}

variable "log_retention_days" {
  description = "Días de retención de los registros."
  type        = number
  default     = 14
}

variable "alarm_topic_arn" {
  description = "Tema SNS que recibe las alarmas."
  type        = string
}

variable "environment" {
  description = "Variables de entorno adicionales (sin secretos)."
  type        = map(string)
  default     = {}
}
