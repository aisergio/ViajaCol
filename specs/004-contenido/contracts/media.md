# Contrato: fotos del catálogo

## Archivos

- **Ruta:** `apps/web/public/media/<categoria>/<slug>-<hash>-<ancho>.webp`.
- **Anchos:** 480, 960 y 1600 px, en WebP. El alto es proporcional. Si el original mide menos de 1600 px
  (el mínimo aceptado es 1200), la variante «1600» conserva el ancho original.
- **Peso:** cada variante se codifica con calidad 75 y, si no cabe en su presupuesto, baja de a 5 hasta
  un mínimo de 40.

  | Variante | Presupuesto | Quién la usa |
  |---|---|---|
  | 480 | 50 KB | Créditos, pantallas con densidad 1 y la foto de la portada en teléfonos (D-11) |
  | 960 | 140 KB | Fichas y tarjetas en móvil (412 px × 1,75). SC-007 le pone un tope de 150 KB |
  | 1600 | 350 KB | Fichas en escritorio y la vista previa para redes |

- **`hash`:** los 8 primeros caracteres hexadecimales del SHA-256 de las tres variantes. Si cambia la
  foto o su codificación, cambia el nombre.
- **Publicación:** `build-web.sh` las copia a `dist/web/static/ViajaCol/media/`, y `publish-web.sh` las
  sincroniza con S3 con `Cache-Control: public, max-age=31536000, immutable`. No viajan en el paquete de
  Lambda.
- **Servicio:** CloudFront las sirve por el comportamiento `/ViajaCol/media/*` hacia S3 (spec 003).

## Cargador de `next/image` (`apps/web/src/lib/image-loader.ts`)

- **Entrada:** `src` con la forma `media/<categoria>/<slug>-<hash>` y el `width` que pide Next.
- **Salida:** `/ViajaCol/media/<categoria>/<slug>-<hash>-<w>.webp`, donde `w` es el menor ancho
  disponible ≥ `width`, o 1600 si ninguno alcanza.
- **Configuración:** `deviceSizes: [480, 960, 1600]` e `imageSizes: []`.

## Manifiesto (`packages/content/data/media.json`)

Ver `data-model.md`, «Manifiesto de fotos».

## Script (`scripts/content/fetch-commons-images.ts`)

Se ejecuta con `node --no-warnings scripts/content/fetch-commons-images.ts <modo>` (Node 22.6+ elimina
los tipos al cargar).

| Modo | Qué hace |
|---|---|
| `candidates [categoria]` | Busca hasta 4 fotos por ficha sin `photo` (JPEG de 1200 px o más, con licencia aceptada) y arma hojas de contacto de 8 filas en `.build/content/`, que no se versiona |
| `download [categoria] [--force]` | Para cada ficha con `photo`, sin manifiesto o con otro archivo: descarga la miniatura de 1920, genera las variantes y el marcador borroso, y actualiza `media.json`. `--force` regenera también las que ya están |
| `check` | Verifica que cada ficha tenga su foto descargada, que cada entrada tenga sus tres archivos y que no sobren archivos |

**Reglas de Wikimedia:**
- `User-Agent: ViajaColBot/1.0 (+https://github.com/aisergio/ViajaCol; academic project)`, sin datos
  personales;
- una petición a la vez, con 250 ms de pausa, y reintentos ante 429 o 5xx;
- miniaturas de 1920 px, un ancho estándar de Wikimedia;
- sin credenciales.

**Licencias aceptadas:** dominio público, CC0, CC BY y CC BY-SA, de la 2.0 a la 4.0.
