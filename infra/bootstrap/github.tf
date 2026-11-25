# Conexión con GitHub para los runners de CodeBuild (la SCP de la nueva experiencia bloquea OIDC).
# Terraform la crea en estado PENDING; el dueño del proyecto completa la autorización en la consola
# (Developer Tools > Settings > Connections > Update pending connection) e instala la app de GitHub
# solo para el repositorio ViajaCol. Los proyectos de CodeBuild se agregan cuando esté AVAILABLE.

resource "aws_codeconnections_connection" "github" {
  name          = "${var.project}-github"
  provider_type = "GitHub"
}
