# Quickstart: validar la fundación

## Requisitos

- Node.js ≥ 22.13 (en este PC, 26.13.1) y npm 11.
- Navegadores de Playwright: `npx playwright install chromium` (una vez).

## Comandos (desde la raíz del repositorio)

```powershell
npm install
npm run dev          # http://localhost:3030/ViajaCol (el 3000 lo usa Docker en este PC)
npm run lint
npm run typecheck
npm run test         # Vitest: ViewModels, store y completitud de textos
npm run e2e          # Playwright + axe sobre el build de producción
npm run build
```

## Escenarios de validación (ver [spec.md](spec.md))

| Historia | Cómo validar | Resultado esperado |
|---|---|---|
| HU1 Recorrer en español | Abrir `/ViajaCol` y usar la navegación | Marco completo; sección actual marcada (`aria-current`) |
| HU2 Cambiar a inglés | En `/ViajaCol/sitios` elegir «EN» | Llega a `/ViajaCol/en/sitios`, `lang="en"`, textos en inglés |
| HU3 Tema | Alternar el tema y recargar | Se mantiene; sin destello con el sistema en oscuro |
| HU4 Errores | Abrir `/ViajaCol/xyz` y `/ViajaCol/en/xyz` | Página 404 en cada idioma, estado 404 |
| HU5 Teclado y lector | Tab desde el inicio; axe | «Saltar al contenido» primero; 0 violaciones |

Rutas y garantías en [contracts/routes.md](contracts/routes.md); entidades en
[data-model.md](data-model.md).
