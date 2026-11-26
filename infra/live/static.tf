# Buckets privados: estáticos de Next.js (solo los lee CloudFront con OAC) y artefactos de despliegue
# (paquetes de Lambda). El sufijo aleatorio evita publicar el ID de la cuenta.

resource "random_id" "suffix" {
  byte_length = 4
}

locals {
  buckets = {
    static    = "${var.project}-static-${random_id.suffix.hex}"
    artifacts = "${var.project}-artifacts-${random_id.suffix.hex}"
  }
}

resource "aws_s3_bucket" "this" {
  for_each = local.buckets

  bucket        = each.value
  force_destroy = true
}

resource "aws_s3_bucket_ownership_controls" "this" {
  for_each = aws_s3_bucket.this

  bucket = each.value.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "this" {
  for_each = aws_s3_bucket.this

  bucket                  = each.value.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "this" {
  for_each = aws_s3_bucket.this

  bucket = each.value.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  for_each = aws_s3_bucket.this

  bucket = each.value.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# Estáticos: los archivos llevan hash en el nombre y nunca se borran al publicar (FR-016); solo
# caducan las versiones reemplazadas. Artefactos: el código de cada versión queda guardado en Lambda,
# así que los zip caducan a los 30 días.
locals {
  retention = {
    static    = { expire_days = null, noncurrent_days = 30 }
    artifacts = { expire_days = 30, noncurrent_days = 7 }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "this" {
  for_each = aws_s3_bucket.this

  bucket = each.value.id

  rule {
    id     = "retention"
    status = "Enabled"

    filter {}

    dynamic "expiration" {
      for_each = local.retention[each.key].expire_days == null ? [] : [local.retention[each.key].expire_days]

      content {
        days = expiration.value
      }
    }

    noncurrent_version_expiration {
      noncurrent_days = local.retention[each.key].noncurrent_days
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

data "aws_iam_policy_document" "bucket" {
  for_each = aws_s3_bucket.this

  dynamic "statement" {
    for_each = each.key == "static" ? [1] : []

    content {
      sid       = "AllowCloudFrontRead"
      actions   = ["s3:GetObject"]
      resources = ["${each.value.arn}/*"]

      principals {
        type        = "Service"
        identifiers = ["cloudfront.amazonaws.com"]
      }

      condition {
        test     = "StringEquals"
        variable = "AWS:SourceArn"
        values   = [aws_cloudfront_distribution.web.arn]
      }
    }
  }

  statement {
    sid     = "DenyInsecureTransport"
    effect  = "Deny"
    actions = ["s3:*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    resources = [each.value.arn, "${each.value.arn}/*"]

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "this" {
  for_each = aws_s3_bucket.this

  bucket = each.value.id
  policy = data.aws_iam_policy_document.bucket[each.key].json

  depends_on = [aws_s3_bucket_public_access_block.this]
}
