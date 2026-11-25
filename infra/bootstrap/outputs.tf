output "state_bucket" {
  description = "Bucket del estado remoto (va en backend.hcl, no versionado)."
  value       = aws_s3_bucket.tfstate.bucket
}

output "budget_name" {
  description = "Nombre del presupuesto mensual."
  value       = aws_budgets_budget.monthly.name
}

output "github_connection_arn" {
  description = "ARN de la conexión con GitHub."
  value       = aws_codeconnections_connection.github.arn
}

output "github_connection_status" {
  description = "PENDING hasta que el dueño la autorice en la consola."
  value       = aws_codeconnections_connection.github.connection_status
}
