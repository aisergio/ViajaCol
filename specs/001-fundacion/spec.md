# Feature Specification: Fundación del sitio Viaja Colombia

**Feature Branch**: `001-fundacion`

**Created**: 2026-11-24

**Status**: Draft

**Input**: User description: "Fundación del sitio Viaja Colombia: estructura bilingüe, identidad visual, navegación, tema y calidad base"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recorrer el sitio en español con una identidad clara (Priority: P1)

Un turista que abre la dirección pública ve la portada de Viaja Colombia en español con la franja
tricolor, la marca, la navegación principal y el pie de página, y se mueve entre las secciones
Noticias (portada), Sitios, Fiestas y Platos. Cada sección muestra su título y una introducción,
lista para recibir contenido en las specs siguientes.

**Why this priority**: es el esqueleto del que dependen todas las demás funciones; sin él no hay
prototipo que demostrar.

**Independent Test**: abrir la dirección pública y recorrer las cuatro secciones verificando
identidad, navegación activa y carga de cada sección.

**Acceptance Scenarios**:

1. **Given** un visitante sin preferencias guardadas, **When** abre la dirección pública,
   **Then** ve la portada en español con franja tricolor, nombre «Viaja Colombia», navegación
   (Noticias, Sitios, Fiestas, Platos y «Guías · próximamente» deshabilitada) y pie de página.
2. **Given** la portada, **When** elige «Sitios», **Then** llega a esa sección y la navegación la
   marca como actual con un indicador que no depende solo del color.
3. **Given** cualquier sección, **When** recarga la página o abre un enlace compartido a ella,
   **Then** llega directamente a esa sección.

---

### User Story 2 - Cambiar a inglés sin perder el lugar (Priority: P1)

Un turista extranjero cambia a inglés desde cualquier sección y queda en la misma sección
traducida; el enlace en inglés es distinto y se puede compartir.

**Why this priority**: el sitio es bilingüe desde la Entrega 1 y el idioma vive en la dirección.

**Independent Test**: desde Sitios en español elegir «EN» y comprobar que la dirección y todos los
textos visibles corresponden a Sitios en inglés.

**Acceptance Scenarios**:

1. **Given** Sitios en español, **When** elige «EN», **Then** ve Sitios en inglés y la dirección
   indica el idioma inglés.
2. **Given** una página en inglés, **When** elige «ES», **Then** vuelve a la misma sección en
   español, cuya dirección no lleva indicador de idioma.
3. **Given** cualquier página, **Then** el idioma declarado del documento coincide con el idioma
   mostrado.
4. **Given** el catálogo de textos, **When** falta la traducción de un texto visible, **Then** la
   verificación de calidad lo detecta antes de publicar.

---

### User Story 3 - Elegir tema claro u oscuro (Priority: P2)

Un visitante alterna entre tema claro y oscuro; su elección se recuerda en el mismo navegador y,
si nunca eligió, se respeta la preferencia del sistema operativo.

**Why this priority**: aporta el aspecto moderno que pide el curso y ejemplifica el estado global de
preferencia del modelo de estado.

**Independent Test**: alternar el tema, recargar y comprobar que se mantiene; con el sistema en
modo oscuro, la primera visita aparece oscura.

**Acceptance Scenarios**:

1. **Given** una primera visita con el sistema en modo oscuro, **When** abre el sitio, **Then** se
   muestra el tema oscuro sin destello del tema claro.
2. **Given** el tema claro, **When** pulsa el interruptor, **Then** cambia a oscuro y se mantiene al
   recargar.
3. **Given** cualquiera de los dos temas, **Then** todo texto cumple el contraste mínimo AA.

---

### User Story 4 - Recuperarse de direcciones inexistentes y errores (Priority: P2)

Un visitante que abre una dirección inexistente o encuentra un fallo ve una página propia del sitio
en su idioma, con caminos para volver.

**Why this priority**: evita callejones sin salida y forma parte de la calidad percibida.

**Independent Test**: abrir una dirección inexistente en cada idioma y provocar un error controlado.

**Acceptance Scenarios**:

1. **Given** una dirección inexistente dentro del sitio, **When** la abre, **Then** ve una página
   «no encontrada» en su idioma con enlace a la portada y la respuesta indica «no encontrado».
2. **Given** un fallo inesperado al cargar una sección, **Then** ve una página de error amable con
   opción de reintentar y sin detalles técnicos.

---

### User Story 5 - Navegar con teclado y lector de pantalla (Priority: P2)

Una persona que usa teclado o lector de pantalla recorre el marco común sin barreras.

**Why this priority**: la accesibilidad WCAG 2.2 AA es un principio de la constitución.

**Independent Test**: recorrer la portada solo con teclado y con un lector de pantalla.

**Acceptance Scenarios**:

1. **Given** la portada, **When** pulsa Tab por primera vez, **Then** aparece «Saltar al contenido» y
   el foco es visible en todo momento.
2. **Given** la navegación, **Then** cada enlace tiene nombre accesible y la sección actual se
   anuncia como página actual.
3. **Given** cualquier página, **Then** existen cabecera, navegación, contenido principal y pie
   identificables como regiones.

---

### Edge Cases

- Preferencia de movimiento reducido: las transiciones se desactivan o se reducen.
- Dirección en inglés de una sección inexistente: página «no encontrada» en inglés.
- Dirección con indicador de idioma español redundante: redirige a la versión sin indicador.
- Sin JavaScript: el contenido y la navegación funcionan; solo se pierden el interruptor de tema y
  las transiciones.
- Pantallas de 360 px de ancho: la navegación se adapta sin desplazamiento horizontal.
- Navegador sin almacenamiento disponible (modo privado estricto): el tema funciona durante la
  sesión sin mostrar errores.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sitio MUST servirse bajo la ruta pública `/ViajaCol` de aisergio.dev sin afectar
  las demás rutas del dominio.
- **FR-002**: Cada página MUST existir en español (sin indicador de idioma) y en inglés (con
  indicador `/en/`), con direcciones equivalentes para la misma sección.
- **FR-003**: El selector de idioma MUST llevar a la página equivalente en el otro idioma.
- **FR-004**: Todo texto visible MUST provenir del catálogo de textos y existir en ambos idiomas; una
  verificación automática MUST fallar si falta alguna clave.
- **FR-005**: Cada página MUST declarar su idioma y tener título y descripción propios en ese idioma.
- **FR-006**: Todas las páginas MUST compartir un marco común: franja tricolor, encabezado con
  marca, navegación principal (Noticias, Sitios, Fiestas, Platos; Guías visible como
  «próximamente» y deshabilitada), selector de idioma, interruptor de tema y pie de página con
  créditos y licencia.
- **FR-007**: La navegación MUST indicar la sección actual de forma accesible, no solo por color.
- **FR-008**: El sitio MUST aplicar el sistema de diseño de la Entrega 1 (colores de la bandera,
  tipografías Space Grotesk e Inter, escala tipográfica, espaciados y radios) en modo claro y oscuro,
  con contraste ≥ 4,5:1 para texto normal.
- **FR-009**: El tema MUST respetar la preferencia del sistema en la primera visita y recordar la
  elección del visitante en su navegador.
- **FR-010**: El sitio MUST tener páginas propias de «no encontrado» (estado 404) y de error, ambas
  bilingües.
- **FR-011**: El sitio MUST ofrecer «Saltar al contenido», foco visible, objetivos de al menos
  24×24 px (44 px en controles principales) y regiones de cabecera, navegación, contenido y pie.
- **FR-012**: Las transiciones entre páginas MUST respetar la preferencia de movimiento reducido.
- **FR-013**: Las secciones Noticias, Sitios, Fiestas y Platos MUST existir con título e
  introducción, listas para el contenido de las specs siguientes.
- **FR-014**: El proyecto MUST incluir verificaciones automáticas de calidad: estilo de código,
  tipos, pruebas unitarias, pruebas de extremo a extremo con revisión de accesibilidad y una
  construcción de producción que falle ante errores.
- **FR-015**: Cada página MUST incluir metadatos para compartir (título, descripción e imagen por
  defecto) en su idioma.

### Key Entities *(include if feature involves data)*

- **Idioma**: español o inglés; determina el indicador de la dirección, los textos y los metadatos.
- **Sección**: identificador, dirección por idioma, título y estado (activa o próximamente).
- **Preferencia de tema**: claro, oscuro o del sistema; vive en el navegador del visitante.
- **Texto traducible**: clave con su versión en español y en inglés.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un visitante llega a cualquiera de las cuatro secciones en máximo dos interacciones
  desde la portada.
- **SC-002**: El cambio de idioma conserva la sección en el 100 % de las páginas.
- **SC-003**: Las páginas de la fundación tienen 0 violaciones automáticas de accesibilidad de nivel
  AA.
- **SC-004**: El contenido principal aparece en ≤ 2,5 s en un móvil de gama media emulado, con
  puntuación de rendimiento ≥ 90 y desplazamientos de diseño ≤ 0,1.
- **SC-005**: El 100 % de los textos visibles tiene versión en ambos idiomas, verificado
  automáticamente.
- **SC-006**: La elección de tema persiste en el 100 % de las recargas del mismo navegador.

## Assumptions

- El contenido real (sitios, fiestas, platos, experiencias y noticias) llega en la spec 004; aquí
  solo se construyen el marco común y las secciones vacías.
- El despliegue público llega con la spec 003; esta spec se verifica en local y con la construcción
  de producción.
- Guías aparece deshabilitada hasta la Entrega 3, cuando la publica su propio equipo.
- No se redirige automáticamente según el idioma del navegador, para que las direcciones se puedan
  cachear; un aviso para sugerir el otro idioma queda fuera de esta spec.
- No hay cuentas de usuario en esta spec (llegan con la spec 006).
- Escritorio primero, adaptable a pantallas de 360 px.
