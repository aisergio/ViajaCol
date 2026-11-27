# Feature Specification: Mi viaje

**Feature Branch**: `007-mi-viaje`

**Created**: 2026-11-27

**Status**: Draft

**Input**: User description: "«Mi viaje»: viajes con cuenta, con días, notas y presupuesto; agregar
desde el catálogo; borrador local sin cuenta que se migra al iniciar sesión; enlace para compartir,
exportación a calendario y el viaje en contexto (mapa, fiestas y clima)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear viajes y ver los míos (Priority: P1)

Un usuario con sesión abre «Mi viaje», crea un viaje con nombre, fechas, número de viajeros y
presupuesto, y lo ve en la lista de sus viajes. Puede editar esos datos o eliminar el viaje.

**Why this priority**: «Mi viaje» con cuenta es parte del prototipo que nunca se recorta, y es el
ejemplo principal de «estado del servidor» del patrón (rúbrica: patrón 40 y responsabilidades y
estado 40).

**Independent Test**: con sesión, crear dos viajes, editar las fechas de uno, eliminar el otro y
recargar: la lista refleja los cambios.

**Acceptance Scenarios**:

1. **Given** un usuario con sesión sin viajes, **When** abre «Mi viaje», **Then** ve una invitación a
   crear su primer viaje.
2. **Given** el formulario de viaje, **When** escribe un nombre, fechas válidas (de 1 a 30 días),
   viajeros y presupuesto, **Then** el viaje aparece en su lista.
3. **Given** fechas al revés o un viaje de más de 30 días, **Then** ve el error junto al campo y no se
   guarda nada.
4. **Given** un viaje, **When** lo elimina y confirma, **Then** desaparece de la lista.
5. **Given** un visitante sin sesión, **When** abre «Mi viaje», **Then** ve su borrador local (US5) y
   una invitación a entrar.

---

### User Story 2 - Agregar al viaje desde el catálogo (Priority: P1)

En la ficha de un sitio, una fiesta, un plato o una experiencia, el usuario pulsa «Agregar a Mi
viaje», elige uno de sus viajes y el elemento queda guardado en él.

**Why this priority**: une el catálogo (spec 004) con el viaje; sin esto, el viaje está vacío.

**Independent Test**: desde tres fichas de categorías distintas, agregar elementos a un viaje y verlos
en él.

**Acceptance Scenarios**:

1. **Given** una ficha y un usuario con viajes, **When** pulsa «Agregar a Mi viaje» y elige un viaje,
   **Then** ve la confirmación y el elemento aparece en ese viaje, sin día asignado.
2. **Given** un elemento que ya está en ese viaje, **Then** se le avisa y no se duplica.
3. **Given** un usuario con sesión sin viajes, **Then** puede crear un viaje desde el mismo diálogo.
4. **Given** un visitante sin sesión, **Then** el elemento va a su borrador local (US5).

---

### User Story 3 - Organizar el viaje por días (Priority: P1)

En el viaje, el usuario ve un día por cada fecha y un grupo «Sin día». Mueve elementos entre días y
los reordena arrastrándolos o con botones de teclado. Agrega notas libres, como vuelos u hoteles.

**Why this priority**: el itinerario por días es lo que convierte una lista en un plan.

**Independent Test**: con el teclado, mover un elemento de «Sin día» al día 2 y subirlo al primer
lugar; agregar una nota al día 1; recargar y comprobar el orden.

**Acceptance Scenarios**:

1. **Given** un viaje de 3 días, **Then** ve tres días con su fecha y el grupo «Sin día».
2. **Given** un elemento, **When** lo arrastra a otro día o usa «Mover a…», **Then** queda en ese día y
   en ese orden.
3. **Given** un lector de pantalla, **Then** cada movimiento se anuncia y se puede hacer sin ratón.
4. **Given** una nota nueva con título y texto, **Then** aparece en el día elegido.
5. **Given** el viaje abierto en dos pestañas, **When** una guarda un cambio y la otra intenta guardar
   sobre la versión anterior, **Then** la segunda ve un aviso de conflicto y recarga, sin pisar el
   cambio.

---

### User Story 4 - Presupuesto por categoría (Priority: P2)

El usuario asigna un costo estimado a cada elemento y ve el total por categoría (sitios, fiestas,
platos, experiencias y notas) frente al presupuesto del viaje.

**Why this priority**: es el estado derivado del modelo (los totales no se guardan: se calculan).

**Independent Test**: asignar costos a tres elementos y comprobar los totales y lo que queda del
presupuesto.

**Acceptance Scenarios**:

1. **Given** costos en varios elementos, **Then** ve el total por categoría, el total general y lo que
   queda del presupuesto, en pesos colombianos.
2. **Given** un total mayor que el presupuesto, **Then** ve un aviso claro que no depende solo del
   color.

---

### User Story 5 - Borrador sin cuenta (Priority: P2)

Sin sesión, «Agregar a Mi viaje» guarda el elemento en un borrador del navegador. Al iniciar sesión,
el borrador se convierte en un viaje de la cuenta y el navegador lo olvida.

**Why this priority**: deja probar el producto antes de registrarse, y es el ejemplo de «estado global
compartido» persistente del patrón.

**Independent Test**: sin sesión, agregar dos fichas; iniciar sesión; abrir «Mi viaje» y encontrar un
viaje con esos dos elementos.

**Acceptance Scenarios**:

1. **Given** un visitante sin sesión, **When** agrega fichas, **Then** las ve en «Mi viaje» como
   borrador, y sobreviven a recargar la página.
2. **Given** un borrador con elementos, **When** el visitante inicia sesión, **Then** se crea un viaje
   «Mi borrador» con esos elementos y el borrador local se vacía.
3. **Given** un borrador vacío, **Then** iniciar sesión no crea ningún viaje.

---

### User Story 6 - Compartir y exportar (Priority: P2)

El usuario genera un enlace de solo lectura de su viaje, con vista previa para redes, y lo puede
revocar. También descarga el itinerario como archivo de calendario.

**Why this priority**: muestra el viaje a otras personas sin darles acceso a la cuenta.

**Independent Test**: generar el enlace, abrirlo en una ventana privada, revocarlo y comprobar que deja
de abrir; importar el `.ics` en un calendario.

**Acceptance Scenarios**:

1. **Given** un viaje, **When** pulsa «Compartir», **Then** recibe un enlace que abre una versión de
   solo lectura, sin datos de la cuenta y sin indexar.
2. **Given** un enlace compartido, **When** lo revoca, **Then** el enlace deja de abrir (404).
3. **Given** un viaje con días, **When** descarga el calendario, **Then** obtiene un `.ics` con un
   evento por día que lista sus elementos.

---

### User Story 7 - El viaje en contexto (Priority: P3)

En el viaje, el usuario ve un mapa de Colombia con los puntos de cada día, las fiestas del catálogo que
caen en sus fechas y el clima de cada día: el pronóstico si faltan 16 días o menos, o el clima típico
del mes si falta más.

**Why this priority**: enriquece el plan con datos que ya existen o que llegan con las specs 005 y 009.

**Independent Test**: un viaje con sitios en dos regiones muestra sus puntos; un viaje en agosto
sugiere la Feria de las Flores; un viaje a 5 días muestra pronóstico.

**Acceptance Scenarios**:

1. **Given** un viaje con sitios, **Then** el mapa muestra un punto por sitio, con el color de su día, y
   una lista equivalente para lectores de pantalla.
2. **Given** las fechas del viaje, **Then** ve las fiestas del catálogo de esos meses y puede agregarlas.
3. **Given** un viaje que empieza en 16 días o menos, **Then** ve el pronóstico por día; si empieza
   después, ve el clima típico del mes.

---

### Edge Cases

- **Viaje de otra persona** (alguien cambia el identificador en la dirección): responde 404, igual que
  un viaje que no existe.
- **Cambio de fechas que acorta el viaje:** los elementos de los días que desaparecen pasan a «Sin
  día»; no se pierde nada.
- **Elemento del catálogo que ya no existe:** se muestra con su nombre guardado y una marca «no
  disponible».
- **Límites:** 20 viajes por usuario y 100 elementos por viaje; al llegar al límite se explica por qué
  no se puede agregar.
- **Borrador con elementos y un viaje ya creado al entrar en otra pestaña:** la migración ocurre una
  sola vez.
- **Sin JavaScript:** la lista de viajes, el viaje y el enlace compartido se leen; los cambios requieren
  JavaScript.
- **Sin conexión con el servicio del clima:** el viaje se ve igual, sin la sección del clima.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Un usuario con sesión MUST poder crear, ver, editar y eliminar sus viajes: nombre (1 a 60
  caracteres), fecha de inicio y fin (de 1 a 30 días), viajeros (1 a 20) y presupuesto (0 a 100
  millones de pesos).
- **FR-002**: Cada viaje MUST pertenecer a un solo usuario; nadie más puede leerlo ni cambiarlo, salvo
  la versión de solo lectura de un enlace compartido.
- **FR-003**: Las fichas de sitios, fiestas, platos y experiencias MUST ofrecer «Agregar a Mi viaje».
- **FR-004**: Un elemento MUST aparecer una sola vez por viaje.
- **FR-005**: El viaje MUST mostrar un día por fecha y el grupo «Sin día», y MUST permitir mover y
  reordenar elementos con el ratón, el tacto y el teclado.
- **FR-006**: El usuario MUST poder agregar, editar y quitar notas libres (título de 1 a 80 caracteres y
  texto de hasta 500).
- **FR-007**: Cada elemento MUST admitir un costo estimado, y el viaje MUST mostrar los totales por
  categoría, el total y lo que queda del presupuesto. Los totales se calculan, no se guardan.
- **FR-008**: Cada cambio MUST guardarse con control de concurrencia: si el viaje cambió desde que se
  cargó, el cambio se rechaza y la interfaz avisa y recarga.
- **FR-009**: Los cambios MUST reflejarse de inmediato en la interfaz y deshacerse si el servidor los
  rechaza.
- **FR-010**: Sin sesión, «Agregar a Mi viaje» MUST guardar en un borrador local que sobrevive a recargar.
  Al iniciar sesión, un borrador no vacío MUST convertirse en un viaje de la cuenta una sola vez.
- **FR-011**: El usuario MUST poder generar y revocar un enlace de solo lectura. La página compartida MUST
  mostrar el viaje sin datos de la cuenta, MUST tener vista previa para redes y MUST NOT indexarse.
- **FR-012**: El usuario MUST poder descargar el itinerario en formato de calendario (`.ics`).
- **FR-013**: El viaje MUST mostrar un mapa con los sitios por día, con una alternativa en texto.
- **FR-014**: El viaje MUST sugerir las fiestas del catálogo que ocurren en sus fechas.
- **FR-015**: El viaje MUST mostrar el clima por día: pronóstico hasta 16 días antes, y clima típico del
  mes después.
- **FR-016**: Cada acción del servidor MUST verificar la sesión, validar la entrada y tomar el usuario de
  la sesión (constitución V).
- **FR-017**: Las páginas de «Mi viaje» MUST estar en español e inglés y cumplir WCAG 2.2 AA.
- **FR-018**: Las páginas públicas del catálogo MUST seguir siendo estáticas y conservar su rendimiento.

### Key Entities

- **Viaje**: nombre, fechas, viajeros, presupuesto, elementos, versión (para la concurrencia),
  identificador para compartir (opcional) y fechas de creación y cambio. Pertenece a un usuario.
- **Elemento del viaje**: una ficha del catálogo (categoría y slug, con su nombre guardado) o una nota
  libre; día (o sin día), orden y costo estimado.
- **Borrador local**: los elementos agregados sin sesión, en el navegador.
- **Enlace compartido**: un identificador aleatorio que da acceso de solo lectura a un viaje.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario crea un viaje, agrega tres elementos desde el catálogo y los reparte en días en
  menos de 3 minutos.
- **SC-002**: El 100 % de los intentos de leer o cambiar el viaje de otra persona responden como si el
  viaje no existiera.
- **SC-003**: Dos pestañas que guardan sobre la misma versión nunca pisan un cambio: la segunda recibe un
  aviso de conflicto.
- **SC-004**: Todo lo que se hace arrastrando también se puede hacer con el teclado, y axe no encuentra
  violaciones en «Mi viaje» ni en la página compartida, en los dos idiomas.
- **SC-005**: El `.ics` se importa sin errores en Google Calendar y en Outlook.
- **SC-006**: Un enlace revocado deja de abrir en menos de 1 minuto.
- **SC-007**: Las páginas públicas conservan su rendimiento (Lighthouse móvil de 90 o más).

## Assumptions

- **Moneda:** pesos colombianos (COP), sin conversión.
- **Fechas:** días completos, en la hora de Colombia; sin horas dentro del día.
- **Límites:** 20 viajes por usuario, 100 elementos por viaje y viajes de 1 a 30 días.
- **Clima:** Open-Meteo, que no pide llave. Su servicio y su caché son de la spec 009; aquí se usa
  directamente.
- **Fiestas:** por los meses del catálogo; las fechas exactas por año llegan con la spec 005.
- **Exportar a PDF:** el plan lo deja «si alcanza»; no es parte de esta spec.
- **Fuera de alcance**, en sus propias specs: el calendario de fiestas con fechas exactas (005), el
  recomendador (009, cuyos resultados pasan al viaje) y la portada personalizada (010).
