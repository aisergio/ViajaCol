# Cloudflare: Worker que enruta aisergio.dev/ViajaCol* hacia CloudFront y la regla de límite de tasa.
# Las rutas y la regla son los únicos cambios en la zona del dominio; se activan con
# enable_public_routes cuando el dueño lo aprueba. El resto del dominio no cambia (FR-002).

locals {
  # Variantes de mayúsculas más comunes: las rutas de Workers distinguen mayúsculas en la ruta.
  path_variants = distinct([
    var.base_path,
    lower(var.base_path),
    upper(var.base_path),
    title(lower(var.base_path)),
    "${lower(substr(var.base_path, 0, 1))}${substr(var.base_path, 1, -1)}",
  ])
}

resource "cloudflare_workers_script" "edge" {
  account_id         = var.cloudflare_account_id
  script_name        = "${var.project}-edge"
  content_file       = "${path.module}/edge/worker.mjs"
  content_sha256     = filesha256("${path.module}/edge/worker.mjs")
  main_module        = "worker.mjs"
  compatibility_date = "2026-11-01"

  bindings = [
    {
      type = "plain_text"
      name = "BASE_PATH"
      text = "/${var.base_path}"
    },
    {
      type = "plain_text"
      name = "ORIGIN_HOST"
      text = aws_cloudfront_distribution.web.domain_name
    },
    {
      type = "secret_text"
      name = "ORIGIN_SECRET"
      text = random_password.origin_secret.result
    },
  ]

  observability = {
    enabled            = true
    head_sampling_rate = 1
  }
}

# Sin URL pública en workers.dev: al Worker solo se llega por las rutas del dominio.
resource "cloudflare_workers_script_subdomain" "edge" {
  account_id       = var.cloudflare_account_id
  script_name      = cloudflare_workers_script.edge.script_name
  enabled          = false
  previews_enabled = false
}

resource "cloudflare_workers_route" "edge" {
  for_each = var.enable_public_routes ? toset(local.path_variants) : toset([])

  zone_id = var.cloudflare_zone_id
  pattern = "${var.domain}/${each.value}*"
  script  = cloudflare_workers_script.edge.script_name
}

# El plan Free admite una regla de límite de tasa por zona (periodo y bloqueo de 10 s, por IP).
resource "cloudflare_ruleset" "rate_limit" {
  count = var.enable_public_routes && var.enable_rate_limit ? 1 : 0

  zone_id     = var.cloudflare_zone_id
  name        = "Límite de tasa de la zona"
  description = "Gestionado con Terraform desde ${var.github_repository} (infra/live)"
  kind        = "zone"
  phase       = "http_ratelimit"

  rules = [
    {
      ref         = "${var.project}_ip"
      description = "${var.base_path}: peticiones por IP"
      expression  = "(starts_with(http.request.uri.path, \"/${var.base_path}\"))"
      action      = "block"
      enabled     = true
      ratelimit = {
        characteristics     = ["cf.colo.id", "ip.src"]
        period              = 10
        requests_per_period = var.rate_limit_requests
        mitigation_timeout  = 10
      }
    },
  ]
}
