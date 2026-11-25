# Feature Specification: Validación continua y seguridad del repositorio

**Feature Branch**: `002-ci-seguridad`

**Created**: 2026-11-24

**Status**: Draft

**Input**: User description: "Validación continua y seguridad en GitHub Actions"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Saber si un cambio cumple la calidad antes de fusionarlo (Priority: P1)

Quien abre un pull request ve, sin hacer nada más, si el cambio cumple estilo, tipos, pruebas
unitarias con cobertura, compilación de producción, pruebas de extremo a extremo con revisión de
accesibilidad y presupuestos de rendimiento.

**Why this priority**: es la garantía de que el prototipo sigue funcionando mientras se construye
rápido; además es evidencia para la rúbrica (testabilidad y repositorio documentado).

**Independent Test**: abrir un PR con un error de tipos y comprobar que el PR queda bloqueado; corregir
y comprobar que pasa.

**Acceptance Scenarios**:

1. **Given** un PR hacia `main`, **When** se abre o se actualiza, **Then** se ejecutan
   automáticamente las verificaciones de calidad y su resultado aparece en el PR.
2. **Given** una verificación requerida en rojo, **When** alguien intenta fusionar, **Then** la
   fusión queda bloqueada.
3. **Given** una ejecución terminada, **Then** quedan disponibles el resumen de cobertura y los
   reportes de pruebas y de rendimiento.

---

### User Story 2 - Detectar riesgos de seguridad en cada cambio (Priority: P1)

El responsable del proyecto recibe alertas cuando un cambio introduce código vulnerable, secretos,
dependencias con vulnerabilidades altas o infraestructura mal configurada.

**Why this priority**: el repositorio es público y la constitución exige cero hallazgos altos o
críticos.

**Independent Test**: introducir en una rama de prueba una credencial falsa o una dependencia
vulnerable y comprobar que el PR se bloquea.

**Acceptance Scenarios**:

1. **Given** un PR, **When** contiene un secreto, **Then** la verificación de secretos falla.
2. **Given** un PR que agrega una dependencia con vulnerabilidad alta, **Then** la revisión de
   dependencias falla.
3. **Given** un cambio en la infraestructura, **Then** se validan formato, sintaxis, buenas prácticas
   y seguridad del código de infraestructura.
4. **Given** la rama principal, **Then** el análisis de código se repite semanalmente aunque no haya
   cambios.

---

### User Story 3 - Mostrar evidencia verificable (Priority: P2)

La tutora y los compañeros ven en el README el estado de la integración continua, de la seguridad y la
calificación de buenas prácticas del repositorio.

**Acceptance Scenarios**:

1. **Given** el README, **Then** muestra insignias de CI, seguridad y OpenSSF Scorecard enlazadas a
   sus resultados.

---

### User Story 4 - Mantener dependencias al día (Priority: P3)

Las dependencias, las acciones de los flujos y los proveedores de infraestructura se actualizan con
pull requests automáticos agrupados y revisables.

**Acceptance Scenarios**:

1. **Given** una nueva versión de una dependencia, **Then** se abre un PR semanal agrupado que pasa
   por las mismas verificaciones.

### Edge Cases

- Un PR que solo cambia documentación también ejecuta las verificaciones requeridas.
- Los cambios en infraestructura activan su propia validación aunque no toquen la aplicación.
- Ejecuciones repetidas sobre la misma rama cancelan las anteriores para no gastar minutos.
- Un PR desde un fork no recibe secretos ni permisos de escritura.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Cada PR y cada cambio en `main` MUST ejecutar estilo, formato, tipos, pruebas unitarias
  con cobertura mínima del 80 %, compilación de producción, pruebas de extremo a extremo con axe y
  Lighthouse con los presupuestos de la constitución.
- **FR-002**: Cada PR MUST ejecutar análisis estático de seguridad del código y de los flujos, búsqueda
  de secretos y revisión de dependencias (sin vulnerabilidades altas o críticas).
- **FR-003**: Los cambios en `infra/` MUST validar formato, sintaxis, reglas de buenas prácticas y
  políticas de seguridad del código de infraestructura; las excepciones se documentan con su motivo.
- **FR-004**: Todas las acciones de terceros MUST estar fijadas por SHA completo y los flujos MUST
  declarar permisos mínimos.
- **FR-005**: Las verificaciones principales MUST ser requeridas para fusionar en `main`.
- **FR-006**: El repositorio MUST publicar su evaluación OpenSSF Scorecard y mostrar insignias en el
  README.
- **FR-007**: Las dependencias (npm), las acciones y los proveedores de Terraform MUST tener
  actualizaciones automáticas semanales y agrupadas.
- **FR-008**: El repositorio MUST incluir plantillas de PR (con enlace a la spec y lista de
  verificación) y de issues, y un archivo de propietarios del código.

### Key Entities

- **Verificación**: nombre, disparador, resultado y si es requerida para fusionar.
- **Hallazgo de seguridad**: herramienta, severidad, ubicación y estado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La validación completa de un PR termina en menos de 15 minutos.
- **SC-002**: El 100 % de las acciones de terceros está fijado por SHA.
- **SC-003**: 0 hallazgos altos o críticos abiertos al cerrar la spec.
- **SC-004**: Un PR con una verificación requerida en rojo no se puede fusionar (comprobado).

## Assumptions

- Se usan los runners alojados por GitHub (gratuitos en repositorios públicos), incluido
  `ubuntu-24.04-arm` para la app. El despliegue con runners de CodeBuild llega en la spec 003.
- Los escaneos de seguridad de GitHub (CodeQL, secret scanning, Dependabot) son gratuitos en
  repositorios públicos.
