# Feature Specification: Contenido del catálogo

**Feature Branch**: `004-contenido`

**Created**: 2026-11-26

**Status**: Draft

**Input**: User description: "Catálogo bilingüe de regiones, sitios, fiestas, platos, experiencias y
noticias de demostración, con fotos libres y sus créditos, fichas en modal con dirección propia,
búsqueda instantánea, vista previa para redes y transiciones entre páginas"

## Clarifications

### Session 2026-11-26

- Q: ¿Cuánto contenido lleva la spec? → A: el alcance amplio:
  - 6 regiones, 30 sitios, 24 fiestas (dos por mes), 18 platos, 12 experiencias y 6 noticias de
    demostración, en total 96 fichas;
  - todas en español e inglés;
  - la base es el contenido del prototipo de la Entrega 1 (9 sitios, 5 fiestas y 7 platos).
- Q: ¿Quién elige las fotos? → A: el equipo de desarrollo (Claude) las elige entre las de Wikimedia
  Commons con licencia libre y las revisa en una hoja de contacto. El responsable las ve en el PR, sin
  pausar el trabajo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explorar el catálogo por categoría y región (Priority: P1)

Un visitante entra a Sitios, Fiestas, Platos o Experiencias y ve tarjetas con foto, nombre, región y un
resumen. Filtra por región (y las fiestas, además, por mes) o escribe para acotar la lista. El filtro
queda en la dirección, así que el enlace se puede compartir y el botón «atrás» lo respeta.

**Why this priority**: es el núcleo del prototipo que se demuestra en la Entrega 2. Además, el filtro en
la dirección es el ejemplo de «estado global por URL» del modelo de estado (rúbrica: responsabilidades
y estado, 40 pts).

**Independent Test**: abrir cada lista en español e inglés, aplicar un filtro, recargar y comprobar que
el filtro sigue aplicado y que solo aparecen las fichas que cumplen.

**Acceptance Scenarios**:

1. **Given** la lista de Sitios, **When** el visitante elige la región Caribe, **Then** solo ve sitios
   del Caribe y la dirección termina en `?region=caribe`.
2. **Given** un enlace con filtros, **When** otra persona lo abre, **Then** ve la misma lista filtrada.
3. **Given** la lista de Fiestas, **When** el visitante elige un mes, **Then** ve las fiestas de ese mes,
   incluidas las que empiezan en el mes anterior y continúan en él.
4. **Given** una combinación de filtros sin resultados, **Then** ve un mensaje claro y una forma de
   quitar los filtros.
5. **Given** un navegador sin JavaScript, **Then** cada lista muestra todas sus fichas y los enlaces a
   las fichas funcionan.

---

### User Story 2 - Leer la ficha completa de un elemento (Priority: P1)

Cada sitio, fiesta, plato, experiencia, región y noticia tiene su página propia, con:
- foto grande y su crédito;
- descripción;
- región y lugar;
- datos propios de la categoría (época de la fiesta, ingredientes del plato, temporada de la
  experiencia);
- otras fichas de la misma región.

**Why this priority**: es el destino de la búsqueda, de los modales y, más adelante, de «Mi viaje». Sin
fichas no hay nada que agregar a un viaje.

**Independent Test**: abrir una ficha de cada categoría en los dos idiomas, comprobar el contenido y el
crédito de la foto, y abrir una dirección de ficha inexistente para ver el 404.

**Acceptance Scenarios**:

1. **Given** una ficha, **When** se abre en español o en inglés, **Then** muestra el contenido en ese
   idioma, y el selector de idioma lleva a la misma ficha en el otro.
2. **Given** una dirección de ficha que no existe, **Then** se ve la página 404 del sitio con estado
   404.
3. **Given** una ficha compartida en una red social o en un chat, **Then** la vista previa muestra su
   nombre, su categoría y su región.
4. **Given** la foto de una ficha, **Then** junto a ella se ve el autor y la licencia, con enlace a la
   fuente.

---

### User Story 3 - Abrir una ficha sin perder la lista (Priority: P2)

Desde la lista de Sitios, la ficha de un sitio se abre encima de la lista. Desde la lista de Fiestas, la
foto de una fiesta se abre en grande. La ventana tiene dirección propia: se puede copiar, recargar o
compartir, y en ese caso se abre la página completa. Al cerrarla, con «atrás», con Escape o con el botón
de cerrar, el visitante vuelve a la lista donde estaba.

**Why this priority**: es una de las interacciones de la Entrega 2 que muestra el enrutamiento avanzado
del framework. También mejora la exploración, porque el visitante no pierde su lugar.

**Independent Test**: abrir una ficha desde la lista, copiar la dirección, recargar, volver atrás y
repetir solo con el teclado.

**Acceptance Scenarios**:

1. **Given** la lista de Sitios, **When** el visitante abre un sitio, **Then** la ficha aparece encima de
   la lista y la dirección cambia a la de ese sitio.
2. **Given** la ventana abierta, **When** el visitante recarga o abre la dirección en otra pestaña,
   **Then** ve la página completa de la ficha.
3. **Given** la ventana abierta, **When** pulsa «atrás», Escape o el botón de cerrar, **Then** vuelve a
   la lista con el mismo desplazamiento y los mismos filtros.
4. **Given** la ventana abierta, **Then** el foco queda dentro de ella mientras está abierta y vuelve al
   enlace de origen al cerrarla.

---

### User Story 4 - Encontrar algo al instante (Priority: P2)

Desde cualquier página, el visitante escribe en el buscador y, mientras escribe, ve sugerencias de todas
las categorías, agrupadas, con su región. Puede moverse con las flechas y abrir una con Enter. No
importan las tildes ni las mayúsculas: «bogota» encuentra «Bogotá».

**Why this priority**: es otra de las interacciones de la Entrega 2. Hace navegable un catálogo de casi
cien fichas.

**Independent Test**: buscar con y sin tildes, recorrer las sugerencias con el teclado y abrir una en
cada idioma.

**Acceptance Scenarios**:

1. **Given** el buscador, **When** el visitante escribe «carnaval», **Then** ve las fiestas que
   coinciden, en menos de 100 ms por pulsación.
2. **Given** una búsqueda sin tildes, **Then** encuentra los nombres que sí las tienen.
3. **Given** las sugerencias abiertas, **When** el visitante usa las flechas y Enter, **Then** llega a la
   ficha elegida; si es un sitio o una fiesta, se abre en su ventana.
4. **Given** una búsqueda sin coincidencias, **Then** ve un mensaje que lo dice.
5. **Given** que el visitante aún no usa el buscador, **Then** la página no ha descargado el índice de
   búsqueda.

---

### User Story 5 - Recorrer una región (Priority: P3)

Cada una de las seis regiones tiene su página, con una presentación y sus sitios, fiestas, platos y
experiencias. La portada invita a explorar por región.

**Why this priority**: prepara el mapa 3D de la spec 008, que se sincroniza con la región, y da una forma
natural de recorrer el contenido.

**Independent Test**: abrir cada región y comprobar que cada ficha que lista es de esa región.

**Acceptance Scenarios**:

1. **Given** la página de una región, **Then** muestra solo fichas de esa región, agrupadas por
   categoría.
2. **Given** la portada, **Then** tiene accesos a las seis regiones y fichas destacadas de cada
   categoría.

---

### User Story 6 - Saber de dónde salen las fotos y qué es demostración (Priority: P3)

La página de créditos lista cada foto con su autor, su licencia y su fuente. Las noticias muestran de
forma visible que son de demostración.

**Why this priority**: la constitución exige licencias libres con atribución y marcar las noticias de
demostración. El repositorio y el sitio son públicos.

**Independent Test**: comparar la página de créditos con las fotos publicadas y abrir una noticia.

**Acceptance Scenarios**:

1. **Given** la página de créditos, **Then** cada foto publicada aparece con su autor, su licencia (con
   enlace) y el enlace a su página en Wikimedia Commons.
2. **Given** una noticia, en la lista o en su página, **Then** lleva la marca «Demostración».

---

### Edge Cases

- **Filtros inválidos en la dirección** (por ejemplo, `?region=marte` o `?mes=13`): se ignoran sin error
  y se muestra la lista completa.
- **Fiestas de varios meses** (por ejemplo, San Pacho, de septiembre a octubre): aparecen en cada mes
  que abarcan.
- **Fechas que se mueven cada año** (Carnaval de Barranquilla, Semana Santa): se muestran como época
  aproximada («febrero o marzo»). Las fechas exactas por año llegan con la spec 005.
- **La foto no carga:** se ve el texto alternativo sobre un fondo del color de la marca, sin saltos de
  diseño.
- **Nombres largos en inglés o en español:** no rompen las tarjetas ni los títulos.
- **Navegador sin transiciones de vista** o con movimiento reducido: la navegación funciona igual, sin
  animación.
- **Sin conexión al abrir el buscador:** el visitante ve un mensaje y puede reintentar.
- **Dirección de modal en otro idioma** (`/en/sitios/...` desde una lista en español): abre la página
  completa en ese idioma.
- **Escritura muy rápida en el buscador:** las sugerencias corresponden siempre al último texto.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El catálogo MUST tener 6 regiones, 30 sitios, 24 fiestas, 18 platos, 12 experiencias y 6
  noticias, cada ficha en español y en inglés.
- **FR-002**: Cada ficha, salvo las regiones, MUST pertenecer a una región. Cada mes del año MUST tener
  al menos dos fiestas.
- **FR-003**: Cada ficha MUST tener una foto de Wikimedia Commons con licencia libre (dominio público,
  CC0, CC BY o CC BY-SA). La foto MUST llevar texto alternativo en los dos idiomas y su crédito (autor,
  licencia y fuente) visible junto a ella.
- **FR-004**: El sitio MUST tener una lista por categoría (Sitios, Fiestas, Platos, Experiencias,
  Regiones y Noticias), con tarjetas de foto, nombre, región y resumen.
- **FR-005**: Las listas MUST poder filtrarse por región y por texto. Fiestas MUST poder filtrarse,
  además, por mes. Los filtros MUST vivir en la dirección y sobrevivir a recargas, enlaces compartidos y
  al historial.
- **FR-006**: Cada ficha MUST tener una dirección estable e igual en los dos idiomas, salvo el prefijo
  `/en`. Una dirección inexistente MUST responder con la página 404 del sitio y estado 404.
- **FR-007**: Las fichas de sitio y las fotos de fiesta MUST abrirse en una ventana sobre la lista
  cuando se navega desde el sitio. La ventana MUST tener dirección propia, abrir la página completa al
  recargarla o compartirla, cerrarse con «atrás», Escape o un botón, y gestionar el foco.
- **FR-008**: El sitio MUST tener un buscador en todas las páginas con sugerencias instantáneas:
  - de todas las categorías, agrupadas;
  - sin importar tildes ni mayúsculas;
  - operable por completo con el teclado.

  El índice de búsqueda MUST descargarse solo cuando el visitante empieza a usar el buscador.
- **FR-009**: Cada ficha MUST declarar título, descripción, idiomas alternos y una imagen de vista
  previa para redes con su nombre, su categoría y su región.
- **FR-010**: La navegación entre páginas MUST usar transiciones de vista cuando el navegador las
  admite, y MUST omitirlas con movimiento reducido.
- **FR-011**: Cada región MUST tener una página con sus fichas agrupadas por categoría. La portada MUST
  tener accesos a las regiones y fichas destacadas.
- **FR-012**: Las noticias MUST mostrar la marca «Demostración» en la lista y en su página.
- **FR-013**: Una página de créditos MUST listar todas las fotos publicadas, con autor, licencia
  (enlazada) y fuente.
- **FR-014**: Las páginas del catálogo MUST entregar el HTML completo desde el servidor. Sin JavaScript,
  todas las fichas y sus enlaces MUST seguir disponibles.
- **FR-015**: Las fotos MUST servirse en varios anchos y con caché inmutable. Cada página MUST pedir el
  ancho que necesita. La foto principal de cada página MUST cargarse con prioridad, y las demás, de forma
  diferida.
- **FR-016**: Una validación automática en CI MUST revisar el contenido:
  - el esquema de cada ficha;
  - direcciones únicas;
  - los dos idiomas;
  - que las regiones existan;
  - la cobertura de fiestas por mes;
  - que cada foto tenga crédito.
- **FR-017**: Las fotos MUST obtenerse con un script reproducible que guarde la fuente, el autor y la
  licencia, genere los anchos y se identifique ante Wikimedia según su política de uso.
- **FR-018**: La prueba de humo de la publicación MUST comprobar que una foto del catálogo se sirve con
  el tipo correcto y caché inmutable.

### Key Entities

- **Región**: una de las seis regiones naturales. Tiene un nombre, una presentación y sus departamentos.
  Agrupa las demás fichas.
- **Sitio**: un lugar para visitar. Tiene región, departamento, municipio y coordenadas.
- **Fiesta**: una celebración. Tiene región, lugar, los meses en que ocurre, una descripción de la época
  y, si aplica, su reconocimiento de la UNESCO.
- **Plato**: una comida típica. Tiene región, tipo (sopa, plato fuerte, desayuno, postre o
  acompañamiento) e ingredientes principales.
- **Experiencia**: una actividad. Tiene región, lugar, temporada recomendada y duración aproximada.
- **Noticia**: una nota de demostración. Tiene fecha y la marca de demostración.
- **Foto**: la imagen de una ficha. Tiene el archivo de origen, el autor, la licencia, los anchos
  disponibles y un texto alternativo por idioma.
- **Índice de búsqueda**: por idioma, el nombre, la categoría, la región y la dirección de cada ficha.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Las 96 fichas existen en español e inglés, con foto y crédito. La validación automática
  del contenido da 0 errores.
- **SC-002**: Cada uno de los 12 meses tiene al menos dos fiestas.
- **SC-003**: Lighthouse en móvil emulado, sobre una lista y una ficha publicadas, da:
  - rendimiento ≥ 90 y LCP ≤ 2,5 s;
  - accesibilidad ≥ 95;
  - buenas prácticas ≥ 90;
  - SEO ≥ 90.
- **SC-004**: Con el índice cargado, las sugerencias aparecen en menos de 100 ms por pulsación. El índice
  pesa 20 KB o menos comprimido, por idioma.
- **SC-005**: El 100 % de las direcciones de ventana probadas se pueden recargar y compartir, y abren la
  página completa.
- **SC-006**: axe no encuentra violaciones en lista, ficha, ventana, buscador, región y créditos, en los
  dos idiomas.
- **SC-007**: En móvil emulado, la foto principal de una ficha pesa 150 KB o menos y llega desde la caché
  de la CDN.
- **SC-008**: El 100 % de las fichas declara una imagen de vista previa de 1200 × 630 px.

## Assumptions

- **Textos:** el equipo los redacta a partir de fuentes públicas, y los compañeros los revisan en el
  PR. La época de cada fiesta es su mes o periodo habitual; las fechas exactas por año son de la spec
  005.
- **Regiones:** son las seis regiones naturales de Colombia: Caribe, Andina, Pacífica, Orinoquía,
  Amazonía e Insular.
- **Fotos:** se reducen de tamaño respecto al original. El crédito lo indica, como piden las licencias
  CC BY y CC BY-SA. Las imágenes del prototipo de la E1 no se reutilizan, porque su licencia no se
  conoce.
- **Edición:** el contenido se publica con cada despliegue y se cambia por PR. No hay gestor de
  contenido.
- **Alcance de la búsqueda:** cubre nombres, lugares y regiones, no el texto completo de las
  descripciones.
- **Fuera de alcance**, en sus propias specs:
  - el calendario con fechas exactas y cuenta regresiva (005);
  - las cuentas (006);
  - «Agregar a Mi viaje» (007);
  - el mapa 3D (008);
  - la portada personalizada (010).
