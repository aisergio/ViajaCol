# Feature Specification: Plataforma de publicación del prototipo

**Feature Branch**: `003-plataforma`

**Created**: 2026-11-25

**Status**: Draft

**Input**: User description: "Plataforma de despliegue en AWS y Cloudflare con pipeline de entrega continua"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver el prototipo en su dirección pública (Priority: P1)

La tutora, los compañeros o cualquier visitante abren `https://aisergio.dev/ViajaCol` y ven el sitio
bilingüe (portada, secciones, versión en inglés y página 404). El sitio se sirve por HTTPS con
cabeceras de seguridad y no cambia nada del resto del dominio.

**Why this priority**: la rúbrica exige un prototipo demostrable. Sin dirección pública no hay
demostración, video ni evidencia. Es la ruta crítica del plan.

**Independent Test**: abrir la dirección desde un navegador sin sesión y desde la línea de comandos.
Hay que comprobar el estado 200 en español e inglés, el 404 en una ruta inexistente y que la raíz del
dominio responde igual que antes.

**Acceptance Scenarios**:

1. **Given** el sitio publicado, **When** un visitante abre `/ViajaCol` (con o sin barra final),
   **Then** ve la portada en español con estado 200.
2. **Given** el sitio publicado, **When** abre `/ViajaCol/en`, **Then** ve la portada en inglés.
3. **Given** el sitio publicado, **When** abre una ruta inexistente bajo `/ViajaCol`, **Then** ve la
   página 404 del sitio con estado 404.
4. **Given** el sitio publicado, **When** abre `/viajacol` o cualquier variante de mayúsculas y
   minúsculas, **Then** recibe una redirección permanente a `/ViajaCol`, con el resto de la ruta y la
   consulta intactos.
5. **Given** cualquier otra ruta del dominio (la raíz y los demás proyectos), **When** se consulta antes
   y después de publicar, **Then** la respuesta no cambia.
6. **Given** cualquier respuesta bajo `/ViajaCol`, **Then** trae las seis cabeceras de seguridad
   definidas (FR-006).

---

### User Story 2 - Publicar cada cambio aprobado sin pasos manuales (Priority: P1)

Cuando el responsable fusiona un cambio en la rama principal, el sitio público se actualiza solo:
- se compila;
- se publica una versión nueva después de la aprobación en el entorno de producción;
- una prueba de humo confirma que la versión visible es la nueva.

**Why this priority**: faltan ocho specs antes del 1 de diciembre. Publicar a mano costaría tiempo y
abriría la puerta a errores. Además, es evidencia de entrega continua para la rúbrica.

**Independent Test**: fusionar un cambio y comprobar que el endpoint de salud de la dirección pública
muestra el identificador del nuevo commit, sin ejecutar comandos locales.

**Acceptance Scenarios**:

1. **Given** un cambio fusionado en `main` que toca la aplicación, **When** termina la canalización,
   **Then** la dirección pública sirve la versión nueva y el identificador de versión coincide con el
   commit.
2. **Given** una publicación pendiente de aprobación, **When** el responsable no la aprueba,
   **Then** el sitio sigue con la versión anterior.
3. **Given** una publicación terminada, **When** la prueba de humo falla, **Then** la ejecución queda en
   rojo y el responsable puede restaurar la versión anterior (User Story 3).
4. **Given** dos fusiones seguidas, **Then** se publican en orden y sin ejecuciones simultáneas.
5. **Given** un pull request de un tercero, incluido uno desde un fork, **Then** ningún paso con
   credenciales de la nube se ejecuta para él.

---

### User Story 3 - Volver a la versión anterior en menos de un minuto (Priority: P2)

Si una publicación rompe el sitio, el responsable restaura la versión anterior, o una versión elegida,
con una sola acción y sin recompilar.

**Why this priority**: reduce el riesgo de publicar con frecuencia. También es la base del despliegue
independiente y el *rollback* que se mostrarán en la Entrega 3.

**Independent Test**: publicar dos versiones, ejecutar la restauración y medir el tiempo hasta que el
endpoint de salud muestra la versión anterior.

**Acceptance Scenarios**:

1. **Given** la versión N publicada y una N-1 previa, **When** se ejecuta la restauración, **Then** en
   menos de 1 minuto el sitio sirve N-1 y la prueba de humo pasa.
2. **Given** una página abierta con la versión anterior, **When** se publica una versión nueva,
   **Then** la página sigue funcionando, porque los recursos estáticos de versiones previas no se
   borran.

---

### User Story 4 - Proteger el origen: solo se entra por la dirección pública (Priority: P2)

Nadie puede saltarse el borde. El acceso directo a la CDN, a la función o al almacenamiento de archivos
estáticos devuelve 403.

**Why this priority**: el repositorio es público y la constitución exige seguridad por defecto. Un
origen expuesto permitiría saltarse los límites de tasa y las cabeceras.

**Independent Test**: pedir directamente las direcciones internas (publicadas en el estado de la
infraestructura) y comprobar el 403. Luego, enviar por la dirección pública una petición con cuerpo y
comprobar que llega intacta.

**Acceptance Scenarios**:

1. **Given** el dominio por defecto de la CDN, **When** alguien lo pide directamente, **Then** recibe
   403.
2. **Given** la dirección de la función, **When** alguien la pide directamente, **Then** recibe 403.
3. **Given** el almacenamiento de estáticos, **When** alguien lo pide directamente, **Then** recibe 403.
4. **Given** una petición con cuerpo (formulario o acción del servidor) por la dirección pública,
   **Then** llega a la aplicación con el cuerpo íntegro y con el host público para la verificación de
   origen.
5. **Given** el secreto que comparten el borde y la CDN, **Then** nunca aparece en el navegador ni en el
   repositorio.

---

### User Story 5 - Operar dentro del presupuesto y con alertas (Priority: P3)

La plataforma:
- se declara como código y lleva la etiqueta del proyecto;
- conserva los registros 14 días;
- avisa por correo ante errores repetidos o estrangulamiento;
- bloquea en el borde a los clientes que abusan.

**Why this priority**: el presupuesto es de US$10 al mes y la cuenta tiene un límite bajo de
concurrencia. El abuso o los errores deben notarse antes de que afecten la demo.

**Independent Test**: provocar errores en un entorno controlado (o revisar la configuración de las
alarmas) y comprobar que llega el correo. Además, superar el umbral de tasa con un script y recibir 429.

**Acceptance Scenarios**:

1. **Given** la infraestructura, **Then** toda está declarada como código y lleva la etiqueta
   `Project=ViajaCol`.
2. **Given** errores repetidos o estrangulamiento de la aplicación, **When** pasan 10 minutos, **Then**
   el responsable ya recibió el correo de alerta.
3. **Given** un cliente que supera el límite de tasa, **Then** el borde responde 429 sin llegar al
   origen.
4. **Given** los registros de la aplicación, **Then** se conservan 14 días y luego se eliminan.

---

### Edge Cases

- **Arranque en frío:** la primera petición tras un periodo inactivo tarda más, pero termina sin error
  (SC-001).
- **Respuestas largas o en *streaming*:** se entregan de forma progresiva, sin que el borde las acumule
  completas.
- **Cuerpos de más de 1 MB:** el borde responde 413 sin llegar al origen.
- **Redirecciones de la aplicación** (por ejemplo, de idioma): el destino queda siempre en el dominio
  público y nunca expone hosts internos.
- **Publicación interrumpida a mitad de camino** (con los estáticos ya subidos y la función sin
  actualizar): el sitio sigue sirviendo la versión anterior, porque los estáticos solo se agregan.
- **Rotación del secreto del origen:** sin caída, porque durante la transición se aceptan el secreto
  actual y el anterior.
- **Origen caído o estrangulado:** el visitante recibe un error 5xx genérico, sin detalles internos.
- **Rutas parecidas** (por ejemplo, `/ViajaColombia`): no las captura el sitio y siguen hacia el origen
  normal del dominio.
- **Límite de concurrencia de la cuenta (10):** el HTML y los datos de navegación de las páginas
  estáticas se sirven desde la caché de la CDN, así que una visita no agota la concurrencia.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST publicar el sitio en `https://aisergio.dev/ViajaCol` y en todo lo que
  cuelga de esa ruta.
- **FR-002**: El sistema MUST dejar sin cambios cualquier otra ruta del dominio, incluidas las de otros
  proyectos.
- **FR-003**: El sistema MUST redirigir con 301 las variantes de mayúsculas y minúsculas de `/viajacol`
  a la forma canónica `/ViajaCol`.
- **FR-004**: El sistema MUST servir los recursos estáticos versionados con caché inmutable. El HTML y
  los datos de navegación MUST respetar la política de caché que declare la aplicación.
- **FR-005**: El sistema MUST entregar las respuestas en *streaming* sin acumularlas completas en el
  borde.
- **FR-006**: El sistema MUST agregar estas cabeceras de seguridad:
  1. HSTS de 2 años, sin subdominios;
  2. `nosniff`;
  3. `Referrer-Policy: strict-origin-when-cross-origin`;
  4. una política de contenido base, que la aplicación puede reemplazar;
  5. protección contra el enmarcado;
  6. `Permissions-Policy` restrictiva.
- **FR-007**: El sistema MUST rechazar con 403 todo acceso que no venga del borde: la CDN directa, la
  función directa o el almacenamiento directo.
- **FR-008**: El sistema MUST preservar la integridad del cuerpo en las peticiones con cuerpo y
  propagar el host público para la verificación de origen de las acciones del servidor.
- **FR-009**: El borde MUST rechazar con 413 los cuerpos de más de 1 MB.
- **FR-010**: El borde MUST limitar la tasa de peticiones por IP bajo `/ViajaCol` y responder 429 al
  superarla.
- **FR-011**: La aplicación MUST exponer un endpoint de salud con el estado y la versión publicada, sin
  datos sensibles y sin caché.
- **FR-012**: El sistema MUST compilar, empaquetar y publicar automáticamente al fusionar en `main`, con
  la aprobación del entorno de producción, en orden y sin solapes. También MUST poder lanzarse a mano.
- **FR-013**: Las credenciales de la nube para publicar MUST ser temporales. Solo MUST usarlas las
  ejecuciones que inicia el responsable; nunca un fork ni un tercero.
- **FR-014**: Tras publicar, el sistema MUST ejecutar una prueba de humo que compruebe:
  - el estado 200 en ES y EN;
  - la versión esperada;
  - las cabeceras de seguridad;
  - el 403 en los accesos directos;
  - el 404 en una ruta inexistente.
- **FR-015**: El responsable MUST poder restaurar la versión anterior, o una indicada, sin recompilar.
- **FR-016**: Al publicar, el sistema MUST conservar los recursos estáticos de las versiones previas.
- **FR-017**: Toda la infraestructura MUST estar declarada como código, llevar etiquetas de proyecto y
  validarse en CI (formato, validación, *lint* y escaneo de seguridad).
- **FR-018**: El sistema MUST conservar los registros 14 días y alertar por correo ante errores
  repetidos o estrangulamiento.
- **FR-019**: El secreto del origen MUST generarse automáticamente, no versionarse y poder rotarse sin
  caída.
- **FR-020**: Las cabeceras de diagnóstico de caché MUST conservarse para la guía de DevTools, sin
  exponer secretos ni hosts internos.

### Key Entities

- **Versión publicada**: el resultado de compilar un commit. Tiene dos partes:
  - el paquete de la aplicación de servidor;
  - el conjunto de recursos estáticos.

  Se identifica por el SHA del commit y por un número correlativo en el historial de la función.
- **Puntero «live»**: indica qué versión atiende el tráfico. Publicar o restaurar consiste en moverlo.
- **Secreto del origen**: valor compartido entre el borde y la CDN que demuestra que una petición pasó
  por el borde. Hay uno vigente y, durante la rotación, uno anterior.
- **Ejecución de publicación**: compilación, aprobación, publicación y prueba de humo. Registra el
  commit, la versión, el resultado y su duración.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La dirección pública responde 200 en ES y EN.
  - Con la aplicación activa, el primer byte llega en menos de 1 s desde Colombia.
  - Tras un periodo inactivo, la página completa carga en menos de 5 s.
- **SC-002**: Las respuestas de la raíz y de los demás proyectos del dominio no cambian en nada, según
  una comparación antes y después.
- **SC-003**: El 100 % de los accesos directos probados al origen devuelve 403.
- **SC-004**: Entre la fusión y la versión visible pasan 15 minutos o menos, sin comandos locales (solo
  la aprobación).
- **SC-005**: Restaurar la versión anterior toma menos de 1 minuto.
- **SC-006**: Lighthouse sobre la dirección pública (portada, móvil) da rendimiento ≥ 90,
  accesibilidad ≥ 95, buenas prácticas ≥ 90 y SEO ≥ 90.
- **SC-007**: La plataforma no tiene recursos con cargo fijo mensual. Su costo estimado con el tráfico
  de demostración es ≤ US$1 al mes.
- **SC-008**: Una prueba automatizada verifica las seis cabeceras de seguridad en el 100 % de las
  respuestas.

## Assumptions

- **El dominio:** `aisergio.dev` está en Cloudflare con plan Free y tiene otros proyectos en sus propias
  rutas. El plan Free admite una regla de *rate limiting*, que hoy no se usa.
- **Presupuesto:** el presupuesto de US$10 y sus alertas ya existen (stack `bootstrap`).
- **La aplicación:** hoy tiene el alcance de la spec 001. La plataforma debe servir también a las specs
  siguientes (sesiones, acciones del servidor, *streaming*).
- **Región:** el proyecto de AWS se limita a una región (us-east-2), salvo los servicios globales como
  la CDN.
- **Publicación desde AWS:** la federación de GitHub con AWS (OIDC) está bloqueada por política. Por
  eso la publicación se ejecuta en runners dentro de AWS, conectados al repositorio.
- **Política de contenido:** la base admite scripts en línea mientras se decide el ADR de CSP (nonce o
  hash). Es un riesgo documentado.
- **Sin *staging*:** los PR se validan en CI (spec 002) y solo `main` publica.
- **Correos en el HTML:** la ofuscación de correos del dominio sigue activa, así que el sitio no muestra
  direcciones de correo en el HTML.
- **Límite de concurrencia:** la cuenta tiene un límite de 10 ejecuciones simultáneas. La caché de la
  CDN lo mitiga, y se puede pedir un aumento si hace falta.
