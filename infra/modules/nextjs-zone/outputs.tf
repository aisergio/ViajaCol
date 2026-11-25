output "function_name" {
  description = "Nombre de la función."
  value       = aws_lambda_function.this.function_name
}

output "function_arn" {
  description = "ARN de la función (sin calificador)."
  value       = aws_lambda_function.this.arn
}

output "alias_name" {
  description = "Alias que atiende el tráfico."
  value       = aws_lambda_alias.live.name
}

output "function_url" {
  description = "Function URL del alias (solo acepta peticiones firmadas por CloudFront)."
  value       = aws_lambda_function_url.live.function_url
}

output "function_url_host" {
  description = "Host de la Function URL, para el origen de CloudFront."
  value       = trimsuffix(trimprefix(aws_lambda_function_url.live.function_url, "https://"), "/")
}

output "log_group_name" {
  description = "Grupo de registros de la función."
  value       = aws_cloudwatch_log_group.this.name
}
