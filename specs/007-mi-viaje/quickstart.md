# Quickstart: Mi viaje

## 1. Infraestructura (antes de aprobar el despliegue)

```powershell
./scripts/infra/tf.ps1 live plan
./scripts/infra/tf.ps1 live apply
```

El plan debe crear la tabla `viajacol-trips` con el índice `shareId-index` y la política de la función,
y cambiar sus variables de entorno (`TRIPS_TABLE`).

## 2. Local

Las variables de la spec 006 (`apps/web/.env.local`) más `TRIPS_TABLE=viajacol-trips`.

## 3. Pruebas

```powershell
npm run test --workspace @viajacol/web
npm run e2e --workspace @viajacol/web
```

## 4. Verificación después de publicar (T040)

1. Sin sesión: agregar dos fichas, abrir «Mi viaje» y ver el borrador.
2. Entrar: el borrador se convierte en «Mi borrador».
3. Crear un viaje de 3 días, agregar elementos desde fichas de tres categorías y moverlos entre días con
   el ratón y con el teclado.
4. Poner costos y revisar los totales.
5. Abrir el mismo viaje en dos pestañas, mover algo en una y luego en la otra: la segunda avisa del
   conflicto.
6. Compartir, abrir el enlace en una ventana privada, revocarlo y comprobar el 404.
7. Descargar el `.ics` e importarlo en un calendario.
