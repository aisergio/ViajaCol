# Guía: rutas interceptadas y ventanas con dirección propia

**Spec:** 004-contenido (US3) · **Decisión:** research D-04 · **Pruebas:** `apps/web/e2e/ventanas.spec.ts`

## El problema

En la lista de sitios, abrir una ficha no debería hacer perder la lista ni los filtros. Pero la ficha
necesita su propia dirección, `/sitios/valle-de-cocora`, para compartirla, recargarla o abrirla
desde un buscador.

Una ventana hecha solo con estado (`useState`) no tiene dirección. Una página aparte sí la tiene, pero
saca al usuario de la lista. Next.js resuelve las dos cosas con dos piezas del App Router: las **rutas
paralelas** y las **rutas interceptadas**.

## Las dos piezas

### Rutas paralelas: un hueco en el layout

Una carpeta que empieza con `@` es un *slot*: el layout la recibe como una prop más, junto a
`children`.

```text
app/[locale]/
├── layout.tsx            # recibe { children, modal }
├── @modal/
│   ├── default.tsx       # qué mostrar en el slot cuando no hay ventana: null
│   └── [...rest]/page.tsx  # cualquier otra ruta también cierra la ventana: null
└── sitios/…
```

```tsx
// app/[locale]/layout.tsx (resumido)
export default async function LocaleLayout({ children, modal }: Props) {
  return (
    <>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      {modal}
    </>
  );
}
```

`children` y `modal` se resuelven por separado: cada uno muestra lo que corresponde a la URL actual en
su propio árbol de carpetas.

### Rutas interceptadas: otra vista de la misma dirección

Una carpeta que empieza con `(.)` intercepta la navegación hacia un segmento hermano:

```text
app/[locale]/@modal/
├── (.)sitios/[slug]/page.tsx    # la ficha de un sitio en ventana
└── (.)fiestas/[slug]/page.tsx   # la foto de una fiesta en grande
```

La regla clave es **cómo se llegó** a la dirección:

| Cómo se llega a `/sitios/valle-de-cocora` | `children` muestra | `modal` muestra |
|---|---|---|
| Clic en un `<Link>` desde la lista (navegación suave) | La lista, que no cambia | La ventana de `(.)sitios/[slug]` |
| Recargar, pegar el enlace o abrir una pestaña nueva (navegación dura) | La página completa de `sitios/[slug]` | `default.tsx`, que devuelve `null` |

Por eso la misma dirección se puede compartir y recargar (FR-007): quien la abre directo ve la página
completa.

## Cerrar la ventana

Cerrar es **volver atrás en el historial**: la URL regresa a la de la lista, con sus filtros, y el slot
vuelve a `default.tsx`.

```tsx
// components/catalog/RouteModal.tsx (resumido)
export function RouteModal({ title, closeLabel, path, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  if (pathname !== path) return null; // ya se navegó a otra parte
  return (
    <Modal title={title} closeLabel={closeLabel} onClose={() => router.back()}>
      {children}
    </Modal>
  );
}
```

- **`Modal`** (`packages/ui/src/modal.tsx`) es el `Dialog` de Base UI: atrapa el foco, cierra con Escape
  o con un clic fuera, vuelve inerte el fondo y, al cerrar, devuelve el foco al enlace que la abrió.
- **La guarda de `pathname`:** al navegar desde la ventana a otra ruta, el slot tarda un instante en
  cambiar. Sin la guarda, la ventana se vería abierta sobre la página nueva durante la transición.

## Lo que costó: cinco tropiezos reales

1. **Dos comodines con distinto nombre.** El slot tenía `@modal/[...catchAll]` y la página 404 era
   `[locale]/[...rest]`. Next 16 falló en el build con *«Ambiguous route pattern»*: los comodines de la
   misma posición deben llamarse igual. Se renombró a `@modal/[...rest]`.
2. **El título de la pestaña.** Con la ventana abierta, el título seguía siendo el de la lista. Cada
   ruta interceptada exporta su propio `generateMetadata`, que reutiliza el de la ficha.
3. **El selector de idioma abría una ventana.** Desde una ficha, cambiar a inglés es navegar a
   `/en/sitios/…`, y un `<Link>` lo interceptaba. El selector usa ahora un `<a>` normal: una
   navegación dura carga la página completa en el otro idioma. El botón «Ver la ficha completa» de la
   ventana hace lo mismo.
4. **La ventana salía sin estilos.** Tailwind 4 solo escanea `apps/web`, y la ventana vive en
   `packages/ui`. `globals.css` agrega `@source '../../../../packages/ui/src'`.
5. **Páginas estáticas.** Las rutas interceptadas también necesitan `generateStaticParams` y
   `dynamicParams = false`. Si no, Next las renderiza en Lambda en cada visita.

## Límite aceptado

Con la ventana abierta, la lista de fondo pierde sus filtros de la URL (la URL es la de la ficha). Al
cerrar, `router.back()` restaura la dirección anterior y los filtros vuelven.

## Cómo verlo funcionar

- **En el navegador:** en `/ViajaCol/sitios?region=caribe`, abre una ficha, recarga, vuelve atrás y
  prueba Escape.
- **En DevTools, pestaña Network:** la navegación suave pide solo el payload RSC (`?_rsc=…`), no un
  documento HTML nuevo. La recarga sí pide el documento.
- **En React DevTools:** el árbol muestra el slot `modal` junto a `children`.
- **Pruebas:** `ventanas.spec.ts` cubre abrir, la URL, recargar, atrás, Escape con retorno del foco, la
  foto de una fiesta y el paso a la ficha completa, con axe.

## Para repasar

1. ¿Por qué la misma dirección muestra una ventana en un caso y una página en otro?
2. ¿Qué pasaría si `default.tsx` no existiera en el slot?
3. ¿Por qué cerrar con `router.back()` y no con `router.push('/sitios')`?
4. ¿Qué se rompe si el selector de idioma usa `<Link>`?

## Referencias

- Next.js: [Parallel Routes](https://nextjs.org/docs/app/api-reference/file-conventions/parallel-routes)
  e [Intercepting Routes](https://nextjs.org/docs/app/api-reference/file-conventions/intercepting-routes).
- Base UI: [Dialog](https://base-ui.com/react/components/dialog).
