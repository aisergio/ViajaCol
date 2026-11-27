# ADR 0008 — «Mi viaje»: un documento por viaje, versión y estado optimista

- **Estado**: aceptado (2026-11-27)
- **Contexto**:
  - la spec 007 agrega «Mi viaje»: viajes por días, notas, presupuesto, borrador sin cuenta, enlace
    compartido, calendario y contexto (fiestas y clima);
  - la rúbrica pide mostrar el patrón (MVVM) y separar los tipos de estado: del servidor, global
    compartido, local y derivado;
  - la sesión no usa base de datos (ADR 0007): el usuario es el `sub` de Cognito y llega en la cookie;
  - las páginas públicas del catálogo son estáticas y deben seguir así (FR-018);
  - el mismo viaje puede estar abierto en dos pestañas (US3, escenario 5).

## Decisión

- **Datos:** DynamoDB `viajacol-trips` con clave `sub` + `tripId`. Cada viaje es un solo documento con
  sus elementos (unos 30 KB con 100 elementos; el límite del ítem es 400 KB). Un índice disperso
  `shareId-index` solo contiene los viajes compartidos.
- **Dominio puro y compartido:** `src/domain/trip.ts` (fuera de `server/`) valida con Zod y aplica cada
  cambio: mover, quitar, costo, nota, datos, compartir. Lo usan el servidor, que guarda el resultado, y
  el ViewModel del editor, que muestra el mismo resultado antes de que el servidor responda.
- **Concurrencia optimista:** el cliente envía la versión que vio. El servidor guarda con
  `ConditionExpression: version = :esperada` y suma 1. Si otra pestaña guardó antes, responde
  `conflicto` y la interfaz recarga el viaje. «Agregar desde el catálogo» no envía versión: usa la
  última y reintenta una vez.
- **Estado en el cliente** (`useTripEditorViewModel`):
  - del servidor: el viaje confirmado (props de la página, o la última respuesta si es más nueva);
  - optimista: `useOptimistic` aplica la función del dominio al instante y React lo descarta si la
    acción falla (FR-009);
  - local: formularios, el día elegido en «Mover a…» y el texto de un costo mientras se escribe;
  - derivado: grupos por día y totales del presupuesto, calculados en cada render y nunca guardados;
  - global compartido: el borrador sin cuenta, en Zustand con `persist` y `devtools` (ADR 0002).
- **Acciones en fila:** las Server Actions de una pestaña salen una tras otra y cada una usa la última
  versión que confirmó el servidor. Así, dos cambios rápidos no chocan entre sí.
- **Borrador:** al entrar, se migra con un identificador aleatorio que también es el `tripId`. Un
  segundo intento (otra pestaña, una recarga) encuentra el viaje y no lo duplica.
- **Arrastrar y soltar:** dnd-kit con puntero, tacto y teclado, anuncios en el idioma de la página y,
  además, «Mover a…», «Subir» y «Bajar» en cada elemento. El foco sigue al elemento cuando cambia de
  día.
- **Compartir y exportar:** `shareId` de 128 bits; la página compartida es dinámica, de solo lectura y
  `noindex`; su vista previa sale de `next/og` en Lambda. El `.ics` sigue el RFC 5545 (escape y plegado
  a 75 octetos).
- **Contexto:** fiestas por los meses del viaje. Clima de Open-Meteo, sin llave: pronóstico hasta 16
  días antes y, después, el promedio de los tres años anteriores. Caché de una hora en memoria; si
  falla, la sección no aparece.
- **Páginas públicas:** el botón «Agregar a Mi viaje» es una isla de cliente pequeña; el diálogo se
  descarga solo al abrirlo. Las fichas siguen prerenderizadas.

## Consecuencias

- **A favor:**
  - un viaje se lee y se guarda en una operación, sin transacciones;
  - el cambio se ve al instante y nunca pisa el de otra pestaña (SC-003);
  - el dominio se prueba sin servidor ni navegador y es el mismo en los dos lados;
  - leer «Mi viaje», un viaje o un enlace compartido funciona sin JavaScript.
- **En contra:**
  - cada cambio reescribe el documento completo (unos KB): suficiente para un viaje de 100 elementos;
  - un conflicto descarta el cambio de la segunda pestaña: el usuario lo vuelve a hacer sobre la
    versión recargada;
  - React 19 agrupa las transiciones asíncronas en curso: si una acción tarda, las confirmaciones de las
    demás esperan a que termine (se ve el estado optimista mientras tanto);
  - la caché del clima es por instancia de Lambda: una instancia nueva vuelve a consultar Open-Meteo;
  - el mapa SVG espera las formas de las regiones de la spec 008 (T030); mientras tanto, los lugares de
    cada día se listan en texto.

## Alternativas descartadas

- **Un ítem por elemento:** cambios más pequeños, pero reordenar exige transacciones entre ítems y la
  concurrencia se vuelve por elemento.
- **«El último gana»:** más simple, pero un cambio de otra pestaña se perdería sin aviso.
- **Recargar la página tras cada cambio (sin estado optimista):** cada arrastre esperaría al servidor y
  el foco se perdería al volver a montar la lista.
- **Guardar el borrador en el servidor sin cuenta:** exigiría identificar visitantes anónimos.
- **Mapa con una silueta dibujada a mano:** inexacta y duplicaría el trabajo de la spec 008.
