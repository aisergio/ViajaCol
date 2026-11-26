output "public_url" {
  description = "Dirección pública del sitio."
  value       = "https://${var.domain}/${var.base_path}"
}

output "public_routes_enabled" {
  description = "Si las rutas del Worker ya están publicadas en el dominio."
  value       = var.enable_public_routes
}

output "distribution_id" {
  description = "ID de la distribución de CloudFront (para invalidaciones)."
  value       = aws_cloudfront_distribution.web.id
}

output "cloudfront_domain" {
  description = "Dominio por defecto de CloudFront (el acceso directo debe dar 403)."
  value       = aws_cloudfront_distribution.web.domain_name
}

output "web_function_name" {
  description = "Función de la zona web."
  value       = module.web.function_name
}

output "web_function_url" {
  description = "Function URL del alias live (el acceso directo debe dar 403)."
  value       = module.web.function_url
}

output "static_bucket" {
  description = "Bucket de estáticos (prefijo /<base_path>/_next/static)."
  value       = aws_s3_bucket.this["static"].bucket
}

output "artifacts_bucket" {
  description = "Bucket de paquetes de Lambda."
  value       = aws_s3_bucket.this["artifacts"].bucket
}

output "deploy_runner_project" {
  description = "Proyecto de CodeBuild que usa la etiqueta runs-on de deploy.yml."
  value       = aws_codebuild_project.deploy_runner.name
}

output "edge_worker" {
  description = "Nombre del Worker de Cloudflare."
  value       = cloudflare_workers_script.edge.script_name
}

output "origin_secret" {
  description = "Secreto entre el Worker y CloudFront (solo para pruebas locales; no se imprime)."
  value       = random_password.origin_secret.result
  sensitive   = true
}
