# CloudFront delante de la Function URL (OAC) y de S3 (OAC). Solo acepta tráfico del Worker:
# la función `origin-guard` exige el secreto, que vive en un KeyValueStore.

# --- Secreto compartido con el Worker --------------------------------------------------------------

resource "random_password" "origin_secret" {
  length  = 48
  special = false

  keepers = {
    version = var.origin_secret_version
  }
}

resource "aws_cloudfront_key_value_store" "origin" {
  name    = "${var.project}-origin"
  comment = "Secreto compartido entre el Worker de Cloudflare y CloudFront"
}

resource "aws_cloudfrontkeyvaluestore_key" "secret" {
  key_value_store_arn = aws_cloudfront_key_value_store.origin.arn
  key                 = "secret"
  value               = random_password.origin_secret.result
}

resource "aws_cloudfrontkeyvaluestore_key" "secret_previous" {
  count = nonsensitive(var.origin_secret_previous == "") ? 0 : 1

  key_value_store_arn = aws_cloudfront_key_value_store.origin.arn
  key                 = "secret_previous"
  value               = var.origin_secret_previous
}

resource "aws_cloudfront_function" "origin_guard" {
  name                         = "${var.project}-origin-guard"
  runtime                      = "cloudfront-js-2.0"
  comment                      = "Rechaza el acceso directo: exige el secreto del Worker"
  publish                      = true
  code                         = file("${path.module}/functions/origin-guard.js")
  key_value_store_associations = [aws_cloudfront_key_value_store.origin.arn]
}

# --- Control de acceso a los orígenes ----------------------------------------------------------------

resource "aws_cloudfront_origin_access_control" "lambda" {
  name                              = "${var.project}-lambda"
  description                       = "Firma SigV4 hacia la Function URL"
  origin_access_control_origin_type = "lambda"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_origin_access_control" "s3" {
  name                              = "${var.project}-s3"
  description                       = "Firma SigV4 hacia el bucket de estáticos"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_lambda_permission" "cloudfront_url" {
  statement_id           = "AllowCloudFrontInvokeFunctionUrl"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = module.web.function_name
  qualifier              = module.web.alias_name
  principal              = "cloudfront.amazonaws.com"
  source_arn             = aws_cloudfront_distribution.web.arn
  function_url_auth_type = "AWS_IAM"
}

resource "aws_lambda_permission" "cloudfront_invoke" {
  statement_id  = "AllowCloudFrontInvokeFunction"
  action        = "lambda:InvokeFunction"
  function_name = module.web.function_name
  qualifier     = module.web.alias_name
  principal     = "cloudfront.amazonaws.com"
  source_arn    = aws_cloudfront_distribution.web.arn
}

# --- Políticas -------------------------------------------------------------------------------------

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}

# HTML y payload RSC: respeta el Cache-Control de Next.js (TTL por defecto 0) y separa en la llave
# las cabeceras con que el App Router pide datos de navegación (incluida Next-Url para las rutas
# interceptadas). Las cookies llegan al origen, pero no entran en la llave: lo personal es `private`.
resource "aws_cloudfront_cache_policy" "dynamic" {
  name        = "${var.project}-dynamic"
  comment     = "Respeta Cache-Control del origen y separa HTML del payload RSC"
  min_ttl     = 0
  default_ttl = 0
  max_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["RSC", "Next-Router-Prefetch", "Next-Router-State-Tree", "Next-Router-Segment-Prefetch", "Next-Url"]
      }
    }

    query_strings_config {
      query_string_behavior = "all"
    }
  }
}

# Optimizador de imágenes: el formato (AVIF/WebP) depende de Accept.
resource "aws_cloudfront_cache_policy" "images" {
  name        = "${var.project}-images"
  comment     = "Imágenes de next/image por URL, ancho, calidad y Accept"
  min_ttl     = 0
  default_ttl = 0
  max_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = false
    enable_accept_encoding_gzip   = false

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Accept"]
      }
    }

    query_strings_config {
      query_string_behavior = "all"
    }
  }
}

locals {
  # Base mientras se decide el ADR de CSP (nonce o hash): la app puede enviar la suya (override = false).
  content_security_policy = join("; ", [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://upload.wikimedia.org",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ])
}

resource "aws_cloudfront_response_headers_policy" "security" {
  #checkov:skip=CKV_AWS_259:HSTS de 2 años sin includeSubDomains ni preload a propósito: el dominio y sus subdominios no son de este proyecto.
  name    = "${var.project}-security"
  comment = "Cabeceras de seguridad (FR-006) y Server-Timing para la guía de DevTools"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 63072000
      include_subdomains         = false # el dominio raíz y sus subdominios no son de este proyecto
      preload                    = false
      override                   = true
    }

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    content_security_policy {
      content_security_policy = local.content_security_policy
      override                = false
    }
  }

  custom_headers_config {
    items {
      header   = "Permissions-Policy"
      value    = "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
      override = true
    }

    items {
      header   = "Cross-Origin-Opener-Policy"
      value    = "same-origin"
      override = false
    }
  }

  server_timing_headers_config {
    enabled       = true
    sampling_rate = 100
  }
}

# --- Distribución ----------------------------------------------------------------------------------

locals {
  all_methods    = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
  cached_methods = ["GET", "HEAD"]
}

resource "aws_cloudfront_distribution" "web" {
  #checkov:skip=CKV_AWS_68:Sin WAF de AWS (desde US$5/mes): Cloudflare limita la tasa en el borde y el origen exige el secreto del Worker.
  #checkov:skip=CKV2_AWS_47:Sin WAF de AWS (ver CKV_AWS_68).
  #checkov:skip=CKV_AWS_86:Sin registros de acceso de CloudFront por costo; Cloudflare y Lambda registran las peticiones.
  #checkov:skip=CKV_AWS_174:Certificado por defecto de CloudFront (TLSv1 mínimo forzado); los únicos clientes válidos son Workers de Cloudflare, que negocian TLS 1.3.
  #checkov:skip=CKV2_AWS_42:Sin dominio propio en CloudFront: el dominio público lo sirve Cloudflare.
  #checkov:skip=CKV_AWS_310:Sin origen de respaldo: un solo origen de cómputo por zona en el prototipo.
  #checkov:skip=CKV_AWS_305:La raíz la atiende Next.js; no hay objeto raíz estático.
  #checkov:skip=CKV_AWS_374:Sin restricción geográfica: el sitio es público.
  enabled             = true
  comment             = "ViajaCol: ${var.domain}/${var.base_path} (detrás del Worker de Cloudflare)"
  http_version        = "http2and3"
  is_ipv6_enabled     = true
  price_class         = "PriceClass_100"
  wait_for_deployment = true

  origin {
    origin_id                = "web"
    domain_name              = module.web.function_url_host
    origin_access_control_id = aws_cloudfront_origin_access_control.lambda.id

    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_protocol_policy   = "https-only"
      origin_ssl_protocols     = ["TLSv1.2"]
      origin_read_timeout      = 30
      origin_keepalive_timeout = 5
    }
  }

  origin {
    origin_id                = "static"
    domain_name              = aws_s3_bucket.this["static"].bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
  }

  # Todo lo demás (incluido /ViajaCol sin barra final) va a Next.js.
  default_cache_behavior {
    target_origin_id           = "web"
    viewer_protocol_policy     = "https-only"
    allowed_methods            = local.all_methods
    cached_methods             = local.cached_methods
    compress                   = true
    cache_policy_id            = aws_cloudfront_cache_policy.dynamic.id
    origin_request_policy_id   = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.origin_guard.arn
    }
  }

  # Recursos con hash en el nombre: caché inmutable desde S3.
  ordered_cache_behavior {
    path_pattern               = "/${var.base_path}/_next/static/*"
    target_origin_id           = "static"
    viewer_protocol_policy     = "https-only"
    allowed_methods            = local.cached_methods
    cached_methods             = local.cached_methods
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.origin_guard.arn
    }
  }

  ordered_cache_behavior {
    path_pattern               = "/${var.base_path}/media/*"
    target_origin_id           = "static"
    viewer_protocol_policy     = "https-only"
    allowed_methods            = local.cached_methods
    cached_methods             = local.cached_methods
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.origin_guard.arn
    }
  }

  ordered_cache_behavior {
    path_pattern               = "/${var.base_path}/_next/image*"
    target_origin_id           = "web"
    viewer_protocol_policy     = "https-only"
    allowed_methods            = local.cached_methods
    cached_methods             = local.cached_methods
    compress                   = false
    cache_policy_id            = aws_cloudfront_cache_policy.images.id
    origin_request_policy_id   = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.origin_guard.arn
    }
  }

  # Los errores del origen no se guardan en caché (por defecto serían 10 s).
  dynamic "custom_error_response" {
    for_each = [500, 502, 503, 504]

    content {
      error_code            = custom_error_response.value
      error_caching_min_ttl = 0
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
