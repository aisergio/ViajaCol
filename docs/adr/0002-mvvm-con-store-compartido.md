# ADR 0002 — MVVM con store compartido

- **Estado**: aceptado (2026-11-24)
- **Contexto**: la Entrega 2 exige elegir y justificar un patrón (MVC, MVP, MVVM o Flux) y un modelo
  de gestión de estado coherente con él.

## Decisión

Aplicar **MVVM con store compartido** (Lectura U3, Fig. 2):

- **View**: componentes de cliente presentacionales, sin lógica de negocio ni llamadas de red.
- **ViewModel**: un hook `use<Feature>ViewModel` por funcionalidad que expone estado listo para pintar
  y comandos.
- **Model**: reglas y datos (`model/`), casos de uso del servidor y stores compartidos (Zustand).

## Modelo de estado

| Tipo | Ejemplo en la fundación | Dónde vive |
|---|---|---|
| Local | menú móvil abierto | `useState` en `useMobileNavViewModel` |
| Global por URL | idioma | segmento `/en/` |
| Global compartido | preferencia de tema | store Zustand persistente (`viajacol:theme`) |
| Derivado | sección activa | se calcula desde la ruta |

## Justificación

- **Testabilidad**: los ViewModels y modelos se prueban sin renderizar la interfaz (cobertura ≥ 80 %).
- **Mantenibilidad**: cada capa tiene una responsabilidad; las vistas cambian sin tocar reglas.
- **Escalabilidad**: el store compartido solo guarda lo que varias vistas necesitan; no hay un store
  centralizado tipo Flux/Redux, cuyo costo no se justifica aquí («metro para un pueblo pequeño»,
  Lectura U3, p. 17).

## Alternativas consideradas

- **Flux/Redux**: trazabilidad excelente, pero exceso de ceremonia para pocas piezas compartidas.
- **MVP**: vistas pasivas e interfaces explícitas; más código repetido en React.
- **MVC**: responsabilidades difusas entre controlador y vista en una app reactiva.
