# Viaja Colombia Constitution

## Principios fundamentales (Core Principles)

### I. Server-first con interactividad mínima

- Las páginas se renderizan en el servidor (React Server Components) por defecto. `"use client"` se usa
  solo donde hay interacción real y el plan de cada spec lo justifica.
- El contenido público es estático o cacheado (Cache Components, `"use cache"` + `cacheTag`); lo
  personalizado llega por streaming dentro de `<Suspense>`.
- Ningún componente de cliente importa código de servidor; los secretos viven solo en módulos marcados
  con `server-only`.

Rationale: conserva la idea de islas de la Entrega 1, reduce el JavaScript enviado y protege secretos.

### II. MVVM con store compartido (NON-NEGOTIABLE)

- **View**: componentes de cliente presentacionales, sin lógica de negocio ni llamadas de red.
- **ViewModel**: un hook `use<Feature>ViewModel` por funcionalidad que expone estado listo para la vista
  y comandos; es la única puerta de la vista hacia el modelo.
- **Model**: casos de uso del servidor (`src/server/application`) detrás de Server Actions y Route
  Handlers, servicios de cliente y stores compartidos (Zustand).
- Cada spec responde las tres preguntas del estado (dónde vive, quién lo cambia, cómo se rastrea) y lo
  clasifica como local, global por URL (nuqs), global compartido (Zustand), servidor/remoto (Server
  Actions, TanStack Query) o derivado. Un store centralizado tipo Redux está prohibido salvo enmienda.

Rationale: es el patrón elegido para la Entrega 2 (Lectura U3, Fig. 2, «MVVM con store compartido»).

### III. Pruebas primero en la lógica

- ViewModels, stores, casos de uso y Server Actions se escriben con pruebas primero (Vitest + Testing
  Library). La cobertura MUST ser ≥ 80 % en `viewmodel/`, `stores/` y `src/server/application/`.
- Cada criterio de aceptación de una spec tiene una prueba E2E (Playwright) que incluye axe.
- Ningún PR se fusiona con el CI en rojo.

Rationale: la testabilidad es un criterio explícito de la rúbrica y protege los cambios rápidos.

### IV. Accesible, bilingüe y rápido

- WCAG 2.2 AA: axe sin violaciones, foco visible, objetivos ≥ 24×24 px (≥ 44 px en controles
  principales), navegación completa por teclado y respeto a `prefers-reduced-motion`.
- Todo texto visible existe en español e inglés (next-intl); una prueba falla si falta una clave.
  Español sin prefijo de ruta; inglés bajo `/en/`.
- Presupuestos por página: LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1 y Lighthouse ≥ 90 en móvil emulado.
  El 3D se carga diferido, nunca participa en el LCP y siempre tiene alternativa 2D.

Rationale: la asignatura evalúa arquitectura front-end; la experiencia medible es parte de la nota.

### V. Seguro por defecto

- Cada Server Action y Route Handler valida su entrada con Zod y verifica sesión y autorización dentro
  de sí mismo (no solo en `proxy.ts`); el identificador del usuario sale siempre de la sesión.
- Sin secretos en el repositorio ni en variables `NEXT_PUBLIC_*`; los secretos viven en SSM o en GitHub
  Secrets; no se usan llaves de AWS de larga duración.
- Dependencias con lockfile, acciones de GitHub fijadas por SHA completo y escaneos (CodeQL, gitleaks,
  Checkov/Trivy) sin hallazgos altos o críticos abiertos.
- Ningún dato personal (correos, nombres de estudiantes, IDs de cuenta) entra al repositorio público.

Rationale: el repositorio es público y el despliegue comparte origen con otro sitio.

## Restricciones técnicas y de costo (Additional Constraints)

- **Stack**: Next.js 16.4 (App Router, TypeScript estricto), React 19.3, Tailwind CSS 4.3, shadcn/ui
  (Base UI), next-intl, Zustand, nuqs, TanStack Query, Better Auth + Amazon Cognito, DynamoDB y React
  Three Fiber solo para el mapa 3D.
- **Infraestructura**: todo en Terraform (AWS us-east-2 + CloudFront; Cloudflare Worker en la ruta
  `aisergio.dev/ViajaCol*`). Nada se crea a mano en consola salvo las autorizaciones que AWS exige.
  No se activan funciones avanzadas de la nueva experiencia de AWS ni se usa Lambda@Edge.
- **Costo**: ningún cambio puede llevar el gasto estimado por encima de US$10 al mes; todo recurso
  lleva la etiqueta `Project=ViajaCol`; todo lo que consuma IA tiene cuotas y throttling.
- **Contenido**: imágenes solo con licencia libre y atribución; las noticias de demostración se marcan
  como tales.
- **Idioma**: documentación y specs en español; código, identificadores y commits en inglés
  (Conventional Commits).

## Flujo de desarrollo (Development Workflow)

- Cada funcionalidad sigue Spec Kit (specify → clarify → plan → tasks → analyze → implement →
  converge) en una rama `NNN-nombre`.
- Todo cambio llega a `main` por pull request con enlace a la spec, evidencia de pruebas, capturas si
  hay UI, checklist de seguridad y actualización de la guía de aprendizaje o del ADR afectado.
- Checks requeridos: lint, tipos, pruebas unitarias y E2E, build, escaneos de seguridad y de IaC.
- El despliegue sale solo de `main` mediante el pipeline (runners de CodeBuild) con aprobación del
  entorno `production`.

## Gobernanza (Governance)

- Esta constitución prevalece sobre cualquier otra práctica; cada plan incluye la verificación de
  cumplimiento («Constitution Check»).
- Las enmiendas se hacen por PR que modifica este archivo, con justificación, impacto y versión
  semántica: MAJOR si se elimina o redefine un principio, MINOR si se agrega o amplía, PATCH para
  aclaraciones.
- Las desviaciones aceptadas se registran como ADR en `docs/adr/` y como «ajustes realizados» de la
  entrega correspondiente.
- Guía de ejecución en tiempo de desarrollo: `CLAUDE.md` y el plan aprobado del proyecto.

**Version**: 1.0.0 | **Ratified**: 2026-11-22 | **Last Amended**: 2026-11-22
