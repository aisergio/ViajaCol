provider "aws" {
  region  = var.region
  profile = var.aws_profile

  default_tags {
    tags = {
      Project   = "ViajaCol"
      ManagedBy = "Terraform"
      Stack     = "live"
    }
  }
}

# El token se lee de la variable de entorno CLOUDFLARE_API_TOKEN; nunca va en el repositorio.
provider "cloudflare" {}
