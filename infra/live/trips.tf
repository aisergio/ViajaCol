# «Mi viaje» (spec 007): un documento por viaje, con el dueño como clave de partición y un índice
# disperso para los enlaces compartidos (research D-01).

resource "aws_dynamodb_table" "trips" {
  #checkov:skip=CKV_AWS_119:Cifrado con la clave propia de AWS; una CMK cuesta US$1 al mes.
  #checkov:skip=CKV_AWS_28:Sin recuperación a un punto en el tiempo: datos de demostración, y un viaje eliminado no debe seguir en copias de 35 días.
  name                        = "${var.project}-trips"
  billing_mode                = "PAY_PER_REQUEST"
  hash_key                    = "sub"
  range_key                   = "tripId"
  deletion_protection_enabled = false

  attribute {
    name = "sub"
    type = "S"
  }

  attribute {
    name = "tripId"
    type = "S"
  }

  attribute {
    name = "shareId"
    type = "S"
  }

  # Solo los viajes compartidos tienen `shareId`, así que el índice contiene solo esos.
  global_secondary_index {
    name            = "shareId-index"
    hash_key        = "shareId"
    projection_type = "ALL"
  }
}

data "aws_iam_policy_document" "trips" {
  statement {
    sid       = "TripsTable"
    actions   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem", "dynamodb:Query"]
    resources = [aws_dynamodb_table.trips.arn]
  }

  statement {
    sid       = "SharedTrips"
    actions   = ["dynamodb:Query"]
    resources = ["${aws_dynamodb_table.trips.arn}/index/shareId-index"]
  }
}

resource "aws_iam_role_policy" "web_trips" {
  name   = "trips"
  role   = module.web.role_name
  policy = data.aws_iam_policy_document.trips.json
}

output "trips_table" {
  description = "Tabla de «Mi viaje»."
  value       = aws_dynamodb_table.trips.name
}
