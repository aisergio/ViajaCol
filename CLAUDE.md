# Viaja Colombia — guía para Claude Code

Prototipo académico (Arquitectura Front-End, Politécnico Grancolombiano): sitio turístico bilingüe
ES/EN publicado en https://aisergio.dev/ViajaCol. Repositorio público `aisergio/ViajaCol`.

## Antes de trabajar

- Lee la constitución: `.specify/memory/constitution.md` (principios no negociables).
- El plan aprobado de las Entregas 2 y 3 vive fuera del repo, en
  `C:\Users\Sergio\.claude\plans\radiant-pondering-cherny.md`; las specs viven en `specs/`.
- Cada funcionalidad sigue Spec Kit: `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` →
  `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement` → `/speckit-converge`.

## Reglas del proyecto

- Patrón: MVVM con store compartido. View = componentes de cliente presentacionales; ViewModel =
  hook `use<Feature>ViewModel`; Model = casos de uso en `src/server/application` + stores Zustand.
- Server-first: React Server Components por defecto; `"use client"` solo con interacción real.
- Toda Server Action / Route Handler: Zod + verificación de sesión dentro de sí misma.
- Documentación y specs en español; código, identificadores y commits en inglés (Conventional Commits).
- Nunca versionar datos personales (correos, nombres de estudiantes, IDs de cuenta) ni secretos.
  Los valores sensibles van en `*.auto.tfvars` (ignorados), SSM o GitHub Secrets.
- Infraestructura solo con Terraform en `infra/`; AWS región `us-east-2`, perfil CLI `viajacol`.
  No activar funciones avanzadas de AWS. No Lambda@Edge.
- Presupuesto AWS: US$10/mes. Toda función de IA con cuotas y throttling.

## Estructura (prevista)

```
apps/      aplicaciones Next.js (E2: web; E3: una por zona)
packages/  ui, i18n, auth, contracts, content, stores, config
infra/     bootstrap/, live/, modules/
specs/     Spec Kit
docs/      aprendizaje/, adr/, seguridad/, devtools/, entregas/, wireframes/, diagramas/
video/     HyperFrames y capturas
scripts/   automatizaciones (PowerShell / Node)
```
