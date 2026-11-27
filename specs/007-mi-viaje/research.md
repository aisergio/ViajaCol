# Research: Mi viaje

## D-01. Un documento por viaje en DynamoDB

- **Decision:** tabla `viajacol-trips`, clave de partición `sub` y de ordenamiento `tripId`. Cada viaje
  es un solo ítem con sus elementos en una lista. Índice secundario global `shareId-index` (clave
  `shareId`, proyección completa) que solo contiene los viajes compartidos.
- **Rationale:** el viaje se lee y se guarda entero, así que un documento evita transacciones entre
  ítems. Listar los viajes de un usuario es un `Query` por `sub`. Un viaje de 100 elementos ocupa unos
  30 KB, lejos de los 400 KB del límite.
- **Alternatives considered:** un ítem por elemento (permite cambios parciales, pero exige
  transacciones para reordenar y complica la concurrencia).

## D-02. Concurrencia optimista con `version`

- **Decision:** cada cambio carga el viaje, aplica una función pura del dominio y guarda con
  `ConditionExpression: version = :esperada`, sumando 1. El cliente envía la versión que vio; si no
  coincide, la acción responde `conflicto` y la interfaz recarga. «Agregar desde el catálogo» no envía
  versión: el servidor carga la última y reintenta una vez si alguien guardó en medio.
- **Alternatives considered:** «el último gana» (pisa cambios de otra pestaña).

## D-03. `useOptimistic` + Server Actions

- **Decision:** el ViewModel del editor aplica el mismo cambio puro del dominio sobre el estado
  optimista y llama a la acción dentro de una transición. Si la acción falla, React descarta el estado
  optimista; si responde `conflicto`, el ViewModel pide `router.refresh()`.

## D-04. Arrastrar y soltar accesible

- **Decision:** `@dnd-kit/core` y `@dnd-kit/sortable` con sensores de puntero, tacto y teclado, y
  anuncios en español e inglés. Además, cada elemento tiene un selector «Mover a…» y botones de subir y
  bajar.
- **Alternatives considered:** Pragmatic drag and drop (sin teclado integrado); arrastre nativo.

## D-05. Borrador sin cuenta y su migración

- **Decision:** store de Zustand con `persist` en `localStorage` (`viajacol:mi-viaje-borrador`) y
  `devtools`. En «Mi viaje», con sesión y borrador no vacío, el ViewModel llama a `migrarBorrador` con
  los elementos y un identificador de migración aleatorio; el servidor crea «Mi borrador» y guarda ese
  identificador en el viaje, así que un segundo intento con el mismo identificador no duplica.

## D-06. «Agregar a Mi viaje» sin pesar en las fichas

- **Decision:** un botón de cliente pequeño; el diálogo (lista de viajes y crear uno) se importa con
  `next/dynamic` al pulsar. Sin la cookie indicadora de sesión, el botón agrega al borrador.

## D-07. Compartir y exportar

- **Decision:**
  - `shareId` de 128 bits aleatorios en base64url; revocar lo borra del ítem y del índice;
  - la página compartida es dinámica, `noindex` y no muestra correo ni nombre del dueño;
  - la vista previa se genera con `next/og` (`ImageResponse`), que corre en Lambda sin `sharp`;
  - el `.ics` (RFC 5545) tiene un evento de día completo por fecha, con los elementos en la
    descripción; se escapan comas, punto y coma y saltos de línea, y las líneas se pliegan a 75 octetos.

## D-08. Fiestas y clima

- **Decision:**
  - fiestas: las del catálogo cuyos meses tocan las fechas del viaje;
  - clima: Open-Meteo `forecast` (sin llave) para viajes que empiezan en 16 días o menos, con la
    ubicación del primer elemento con coordenadas de cada día o, si el día no tiene, la del primero del
    viaje. Todos los lugares van en una sola consulta. Después de 16 días, el clima típico del mes: el
    promedio de los tres años anteriores en la API de clima de Open-Meteo (modelo `MRI_AGCM3_2_S`, con
    corrección de sesgo), con las máximas, las mínimas y los días con 1 mm de lluvia o más. Caché de 1
    hora en memoria; si falla o tarda más de 3 s, la sección no aparece. La página cita la fuente
    (CC BY 4.0).

## D-09. Mapa

- **Decision:** un SVG que reutiliza las formas de las regiones que genera la spec 008 (Natural Earth,
  proyectadas en el build), con un punto por sitio o fiesta del color de su día y una lista equivalente.
  Es liviano y sirve sin JavaScript. Mientras la 008 no exista, el viaje muestra la lista de lugares por
  día; el SVG se agrega con la 008 (T030).
- **Alternatives considered:** dibujar a mano una silueta aproximada (inexacta y duplicaría el trabajo
  de la 008).
