# Feature Specification: Cuenta de usuario

**Feature Branch**: `006-cuenta`

**Created**: 2026-11-27

**Status**: Draft

**Input**: User description: "Cuenta de usuario: registro, inicio y cierre de sesión, perfil y
protección de páginas privadas, como base de «Mi viaje»"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear una cuenta (Priority: P1)

Un visitante pulsa «Entrar» en el encabezado y elige crear una cuenta. Escribe su correo y una
contraseña, recibe un código en el correo, lo confirma y vuelve a la página donde estaba, con la sesión
iniciada y en su idioma.

**Why this priority**: «Mi viaje» con cuenta (spec 007) es parte del prototipo que nunca se recorta, y
sin cuenta no existe. La cuenta también es el ejemplo de «estado de sesión: global y de solo lectura»
del modelo de estado (rúbrica: responsabilidades y estado, 40 pts).

**Independent Test**: crear una cuenta con un correo de prueba desde una página en español y otra en
inglés, confirmar el código y comprobar que el encabezado muestra el nombre y que «Mi cuenta» abre.

**Acceptance Scenarios**:

1. **Given** un visitante sin sesión en cualquier página, **When** pulsa «Entrar», **Then** llega a la
   pantalla de inicio de sesión de Viaja Colombia, en el idioma de esa página.
2. **Given** la pantalla de inicio de sesión, **When** crea una cuenta y confirma el código del correo,
   **Then** vuelve a la página donde estaba, con la sesión iniciada.
3. **Given** un correo que ya tiene cuenta, **When** intenta registrarse con él, **Then** ve un mensaje
   claro y puede iniciar sesión o recuperar la contraseña.
4. **Given** un código vencido o equivocado, **Then** ve el error y puede pedir un código nuevo.

---

### User Story 2 - Iniciar y cerrar sesión (Priority: P1)

Un usuario registrado inicia sesión y ve su nombre en el encabezado, con un menú que lleva a «Mi
cuenta» y a «Cerrar sesión». Al cerrar sesión, el sitio vuelve a mostrar «Entrar».

**Why this priority**: sin inicio y cierre de sesión confiables no hay datos personales seguros.

**Independent Test**: iniciar sesión, recargar, navegar entre páginas, cerrar sesión y comprobar que
ninguna página privada vuelve a mostrar datos del usuario.

**Acceptance Scenarios**:

1. **Given** un usuario registrado, **When** inicia sesión, **Then** vuelve a la página donde estaba y
   el encabezado muestra su nombre y el menú de cuenta.
2. **Given** un usuario con sesión, **When** cierra sesión, **Then** la sesión termina en el sitio y en
   el proveedor de identidad, y el encabezado vuelve a mostrar «Entrar».
3. **Given** un usuario que olvidó su contraseña, **When** la pide desde la pantalla de inicio de
   sesión, **Then** puede restablecerla con un código enviado a su correo.
4. **Given** una sesión de más de 7 días, **Then** vence y el sitio pide iniciar sesión otra vez.

---

### User Story 3 - Proteger lo privado (Priority: P1)

Las páginas privadas («Mi cuenta» y, desde la spec 007, «Mi viaje») solo se abren con sesión. Sin
sesión, llevan a iniciar sesión y luego regresan. Las acciones que leen o cambian datos de un usuario
rechazan las peticiones sin sesión y nunca actúan sobre la cuenta de otra persona.

**Why this priority**: es el requisito de seguridad de la constitución: la autorización se verifica en
el servidor, en cada acción, y el usuario sale siempre de la sesión.

**Independent Test**: sin sesión, abrir cada página privada y llamar cada acción de cambio; con sesión,
intentar cambiar los datos de otro usuario manipulando la petición.

**Acceptance Scenarios**:

1. **Given** un visitante sin sesión, **When** abre «Mi cuenta», **Then** lo lleva a iniciar sesión y,
   al terminar, vuelve a «Mi cuenta» en el mismo idioma.
2. **Given** una acción de cambio sin sesión (por ejemplo, cambiar el nombre), **Then** el servidor la
   rechaza y no cambia nada.
3. **Given** una petición que envía el identificador de otro usuario, **Then** el servidor lo ignora y
   solo usa el de la sesión.
4. **Given** una cookie de sesión alterada o vencida, **Then** el sitio la trata como si no hubiera
   sesión.

---

### User Story 4 - Ver y editar el perfil (Priority: P2)

En «Mi cuenta», el usuario ve su nombre visible, su correo y desde cuándo tiene cuenta. Puede cambiar
su nombre visible, y el encabezado lo muestra de inmediato.

**Why this priority**: es la primera página privada y el primer cambio de datos del usuario. Sirve de
modelo para «Mi viaje».

**Independent Test**: con sesión, abrir «Mi cuenta», cambiar el nombre, recargar y comprobar que el
cambio quedó y que el encabezado lo muestra.

**Acceptance Scenarios**:

1. **Given** un usuario con sesión, **When** abre «Mi cuenta», **Then** ve su nombre visible, su correo
   y la fecha en que creó la cuenta.
2. **Given** «Mi cuenta», **When** cambia su nombre visible y guarda, **Then** ve una confirmación y el
   encabezado muestra el nombre nuevo.
3. **Given** un nombre vacío o de más de 50 caracteres, **Then** ve un error junto al campo y no se
   guarda nada.

---

### User Story 5 - Eliminar la cuenta (Priority: P3)

Desde «Mi cuenta», el usuario puede eliminar su cuenta. Tras confirmar, se borran su usuario y sus
datos, la sesión termina y vuelve a la portada.

**Why this priority**: es el derecho de supresión de datos personales. Es corto, pero no bloquea a las
demás historias.

**Independent Test**: crear una cuenta de prueba, eliminarla, y comprobar que ya no se puede iniciar
sesión con ella y que sus datos no existen.

**Acceptance Scenarios**:

1. **Given** «Mi cuenta», **When** pulsa «Eliminar mi cuenta», **Then** se le pide confirmar y se le
   explica qué se borra.
2. **Given** que confirma, **Then** su usuario y sus datos se borran, la sesión termina y llega a la
   portada con un mensaje.
3. **Given** que cancela, **Then** nada cambia.

---

### Edge Cases

- **Cookies bloqueadas:** el visitante ve un mensaje que explica que hacen falta para iniciar sesión.
- **«Atrás» después de cerrar sesión:** las páginas privadas no se guardan en caché, así que no muestran
  datos del usuario.
- **Dirección de regreso maliciosa** (por ejemplo, que apunte a otro dominio): se ignora y el usuario
  vuelve a la portada. Solo se aceptan direcciones internas del sitio.
- **Página privada en inglés** (`/en/cuenta`): el inicio de sesión sale en inglés y el regreso es a
  `/en/cuenta`.
- **El proveedor de identidad no responde:** el visitante ve un error y puede reintentar. El resto del
  sitio funciona sin sesión.
- **Dos pestañas abiertas:** al iniciar o cerrar sesión en una, la otra refleja el cambio al recargar.
- **Cancelar a mitad del registro:** el visitante vuelve al sitio sin sesión y sin errores.
- **Navegador sin JavaScript:** «Entrar» y las páginas privadas funcionan con enlaces y formularios
  normales.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sitio MUST permitir crear una cuenta con correo y contraseña, con verificación del
  correo por un código.
- **FR-002**: El sitio MUST permitir iniciar sesión, cerrar sesión y restablecer la contraseña.
- **FR-003**: El registro y el inicio de sesión MUST mostrarse en el idioma de la página desde la que
  se entra (español o inglés).
- **FR-004**: Al terminar el inicio de sesión, el usuario MUST volver a la página desde la que entró.
  Solo se aceptan direcciones internas del sitio; cualquier otra lleva a la portada.
- **FR-005**: El encabezado MUST mostrar «Entrar» sin sesión y, con sesión, el nombre del usuario con
  un menú hacia «Mi cuenta» y «Cerrar sesión», en todas las páginas y en los dos idiomas.
- **FR-006**: La sesión MUST guardarse en una cookie que JavaScript no puede leer, que solo viaja por
  HTTPS, limitada a la ruta del sitio y protegida contra peticiones de otros sitios. MUST vencer a los
  7 días.
- **FR-007**: Cerrar sesión MUST terminar la sesión en el sitio y en el proveedor de identidad.
- **FR-008**: Las páginas privadas MUST exigir sesión. Sin sesión, MUST llevar a iniciar sesión y
  regresar después.
- **FR-009**: Cada acción del servidor que lee o cambia datos de un usuario MUST verificar la sesión
  dentro de sí misma, validar su entrada y tomar la identidad solo de la sesión, nunca de lo que envía
  el navegador.
- **FR-010**: «Mi cuenta» MUST mostrar el nombre visible, el correo y la fecha de registro, y MUST
  permitir cambiar el nombre visible (de 1 a 50 caracteres, validado en el servidor).
- **FR-011**: El usuario MUST poder eliminar su cuenta tras confirmar. Se borran su usuario en el
  proveedor de identidad y sus datos en el sitio, y la sesión termina.
- **FR-012**: Las páginas públicas MUST seguir sirviéndose desde la caché, con el mismo rendimiento. Leer
  la sesión no las vuelve dinámicas.
- **FR-013**: Las páginas privadas y las respuestas con datos del usuario MUST marcarse para que ni la
  CDN ni el navegador las guarden.
- **FR-014**: Los formularios, el menú de cuenta y los mensajes de error MUST cumplir WCAG 2.2 AA: cada
  campo con su etiqueta, errores anunciados a los lectores de pantalla y foco visible.
- **FR-015**: Las credenciales del sitio ante el proveedor de identidad y la clave que protege la
  sesión MUST vivir solo en el servidor y fuera del repositorio.
- **FR-016**: El intercambio con el proveedor de identidad MUST usar las protecciones estándar contra la
  suplantación del flujo de inicio de sesión.
- **FR-017**: «Mi cuenta» MUST incluir un aviso breve de qué datos se guardan y para qué.

### Key Entities

- **Usuario**: la persona registrada. Tiene un identificador estable que asigna el proveedor de
  identidad, un correo verificado, un nombre visible y la fecha de registro.
- **Sesión**: quién es el usuario y cuándo vence. Vive en una cookie protegida; el servidor la verifica
  en cada petición privada.
- **Perfil**: lo que el sitio guarda del usuario: el nombre visible y la fecha de registro, ligados al
  identificador del usuario. Es la base de la tabla de usuarios que usarán «Mi viaje» y el pasaporte.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un visitante crea una cuenta, confirma el correo y vuelve con la sesión iniciada en menos
  de 2 minutos.
- **SC-002**: El 100 % de las páginas privadas probadas llevan a iniciar sesión cuando no hay sesión, y
  el 100 % de las acciones de cambio probadas rechazan peticiones sin sesión o con otra identidad.
- **SC-003**: Las páginas públicas conservan su rendimiento: Lighthouse móvil de 90 o más y el mismo LCP
  que en la versión 5 (± 0,1 s), y siguen saliendo de la caché.
- **SC-004**: La cookie de sesión no se puede leer desde JavaScript, solo viaja por HTTPS, está limitada
  a `/ViajaCol` y vence a los 7 días.
- **SC-005**: axe no encuentra violaciones en «Mi cuenta», en el menú de cuenta ni en los mensajes de
  error, en los dos idiomas.
- **SC-006**: Después de cerrar sesión, ninguna página privada muestra datos del usuario, ni al recargar
  ni con «atrás».
- **SC-007**: La cuenta no agrega costos fijos: el proveedor de identidad queda dentro de su nivel
  gratuito con el uso de demostración.

## Assumptions

- **Proveedor de identidad:** Amazon Cognito, con su pantalla de inicio de sesión administrada, como
  fija el plan aprobado. El acceso es con correo y contraseña. El inicio con Google u otras redes queda
  fuera de la E2: exige credenciales en cada proveedor y se puede agregar después sin cambiar el modelo.
- **Correos:** los envía el proveedor con su servicio por defecto. Su límite diario es bajo, pero basta
  para la demostración.
- **Contraseñas:** se usa la política del proveedor (8 caracteres o más, con mayúsculas, minúsculas,
  números y símbolos). La verificación en dos pasos queda apagada en la E2.
- **Datos personales:** solo el correo, el nombre visible y la fecha de registro. El aviso de «Mi
  cuenta» explica su uso. La eliminación de la cuenta cubre el derecho de supresión.
- **Duración de la sesión:** 7 días. No hay «recordarme».
- **Fuera de alcance**, en sus propias specs:
  - «Mi viaje» y la migración del borrador local al iniciar sesión (007);
  - la portada personalizada (010);
  - el pasaporte y los logros (013, Entrega 3).
