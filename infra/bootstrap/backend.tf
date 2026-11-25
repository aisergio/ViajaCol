# Backend remoto con configuración parcial: `bucket` y `profile` van en backend.hcl (no versionado).
# terraform init -backend-config=backend.hcl

terraform {
  backend "s3" {
    key          = "bootstrap/terraform.tfstate"
    region       = "us-east-2"
    use_lockfile = true
    encrypt      = true
  }
}
