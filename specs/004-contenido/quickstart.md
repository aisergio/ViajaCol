# Quickstart: Contenido del catálogo

## 1. Preparar

```powershell
npm install
```

En este PC, el antivirus intercepta HTTPS. Para que Node confíe en su certificado:

```powershell
$env:NODE_EXTRA_CA_CERTS = [Environment]::GetEnvironmentVariable('NODE_EXTRA_CA_CERTS', 'User')
```

## 2. Elegir las fotos

El script corre con Node 22.6 o superior, que elimina los tipos de TypeScript al cargar.
`--no-warnings` solo oculta el aviso de esa función.

1. Busca candidatas para las fichas que aún no tienen `photo`. Para afinar la búsqueda, agrega
   `photoQuery` a la ficha. Las hojas de contacto quedan en `.build/content/`, que no se versiona.

   ```powershell
   node --no-warnings scripts/content/fetch-commons-images.ts candidates sitios
   ```

2. Revisa la hoja de contacto y copia el título elegido (`File:…`) al campo `photo` de cada ficha.
   Actualiza también el texto alternativo (`alt`) en los dos idiomas.
3. Descarga las elegidas y genera las variantes y el manifiesto:

   ```powershell
   node --no-warnings scripts/content/fetch-commons-images.ts download
   node --no-warnings scripts/content/fetch-commons-images.ts check
   ```

   Si una variante no cabe en su presupuesto ni con calidad 40, el script imprime un `aviso`. Si es la
   de 960 px, la prueba de SC-007 falla: elige otra foto.

   `download --force` regenera todas las fotos, por ejemplo si cambian los presupuestos de peso.

## 3. Validar

```powershell
npm run test -w @viajacol/content    # esquemas, cantidades, meses, fotos, pesos y tamaño del índice
npm run test:coverage                # modelos y ViewModels de filtros y buscador
```

## 4. Probar en local

```powershell
npm run dev                          # http://localhost:3030/ViajaCol
npm run build; npm run e2e           # Playwright + axe sobre el build de producción
```

**Lighthouse en local** (desde `apps/web`, con el Chrome instalado y el puerto 3030 libre). Usa la
misma configuración que CI: móvil, limitación aplicada y 3 corridas por página (research D-11), así
que tarda unos 8 minutos.

```powershell
$env:CHROME_PATH = 'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'; npx --yes @lhci/cli@0.16.1 autorun
```

Si el puerto 3030 está ocupado, por ejemplo por un `npm run dev`, Lighthouse mide ese servidor y no el
build. Ciérralo antes, o usa una copia de `lighthouserc.json` con otro puerto (`--config=…`).

**Qué revisar a mano:**
- `/ViajaCol/sitios?region=caribe`: el filtro sobrevive a la recarga.
- En la lista de Sitios, abre un sitio: aparece en una ventana. Luego recarga: abre la página completa.
- En el buscador, escribe «bogota» y usa las flechas y Enter.
- `/ViajaCol/creditos`: aparecen las 96 fotos.

## 5. Agregar una ficha

1. Agrega la ficha, con los dos idiomas, al JSON de su categoría. Si cambian las cantidades acordadas,
   actualiza `EXPECTED_COUNTS` en `packages/content/src/constants.ts`.
2. Busca la foto (paso 2) y descárgala.
3. Corre la validación (paso 3).
4. Abre un PR. Los compañeros revisan el texto y la foto.
