import { expect, test } from '@playwright/test';

const cards = (page: import('@playwright/test').Page) =>
  page.getByRole('main').getByRole('article');

test.describe('US1 · Explorar el catálogo por categoría y región', () => {
  test('elegir una región filtra la lista y la escribe en la URL', async ({ page }) => {
    await page.goto('sitios');
    await expect(cards(page)).toHaveCount(30);
    await page.getByRole('button', { name: 'Caribe', exact: true }).click();
    await expect(page).toHaveURL(/\/sitios\?region=caribe$/);
    await expect(page.getByRole('button', { name: 'Caribe', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('status')).toHaveText('6 fichas de 30');
    await expect(cards(page)).toHaveCount(6);
  });

  test('un enlace con filtros abre la lista filtrada y sobrevive a la recarga', async ({
    page,
  }) => {
    await page.goto('experiencias?region=orinoquia');
    await expect(cards(page)).toHaveCount(2);
    await page.reload();
    await expect(cards(page)).toHaveCount(2);
  });

  test('el mes incluye las fiestas de fecha móvil y las de varios meses', async ({ page }) => {
    await page.goto('fiestas');
    await page.getByLabel('Mes').selectOption('3');
    await expect(page).toHaveURL(/mes=3/);
    await expect(page.getByRole('heading', { name: 'Carnaval de Barranquilla' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Semana Santa en Popayán' })).toBeVisible();
    await page.getByLabel('Mes').selectOption('10');
    await expect(page.getByRole('heading', { name: 'Fiestas de San Pacho' })).toBeVisible();
  });

  test('sin resultados muestra un mensaje y deja quitar los filtros', async ({ page }) => {
    await page.goto('fiestas?region=insular');
    await expect(page.getByText('No hay fichas con esos filtros.')).toBeVisible();
    await page.getByRole('button', { name: 'Quitar filtros' }).last().click();
    await expect(page).toHaveURL(/\/fiestas$/);
    await expect(cards(page)).toHaveCount(24);
  });

  test('los valores inválidos se ignoran sin error', async ({ page }) => {
    const response = await page.goto('fiestas?region=marte&mes=13');
    expect(response?.status()).toBe(200);
    await expect(cards(page)).toHaveCount(24);
  });

  test('el texto filtra sin importar las tildes', async ({ page }) => {
    await page.goto('platos');
    await page.getByLabel('Buscar en la lista').fill('santafereno');
    await expect(cards(page)).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Ajiaco santafereño' })).toBeVisible();
  });
});

test.describe('US1 · Sin JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('las listas muestran todas las fichas y sus enlaces funcionan', async ({ page }) => {
    await page.goto('platos');
    await expect(cards(page)).toHaveCount(18);
    await page.getByRole('link', { name: 'Bandeja paisa' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Bandeja paisa' })).toBeVisible();
  });
});

test.describe('US2 · Leer la ficha completa', () => {
  test('la ficha muestra su contenido, su crédito y el otro idioma', async ({ page }) => {
    await page.goto('sitios/valle-de-cocora');
    await expect(page).toHaveTitle('Valle de Cocora · Sitio · Viaja Colombia');
    await expect(page.getByRole('heading', { level: 1, name: 'Valle de Cocora' })).toBeVisible();
    await expect(page.getByText(/Foto: /).first()).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Ver la foto de «Valle de Cocora» en Wikimedia Commons' }),
    ).toHaveAttribute('href', /commons\.wikimedia\.org/);
    await page.getByRole('link', { name: 'English' }).click();
    await expect(page).toHaveURL(/\/ViajaCol\/en\/sitios\/valle-de-cocora$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Cocora Valley' })).toBeVisible();
  });

  test('declara su vista previa de 1200 × 630 para redes (SC-008)', async ({ page, request }) => {
    await page.goto('fiestas/feria-de-las-flores');
    const image = page.locator('meta[property="og:image"]');
    await expect(image).toHaveAttribute(
      'content',
      'https://aisergio.dev/ViajaCol/api/og/fiestas/es/feria-de-las-flores',
    );
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
      'content',
      '1200',
    );
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute(
      'content',
      '630',
    );
    const url = new URL((await image.getAttribute('content'))!);
    const response = await request.get(`http://localhost:3100${url.pathname}`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('image/jpeg');
  });

  test('una ficha que no existe responde 404', async ({ page }) => {
    const response = await page.goto('platos/no-existe');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible();
  });
});

test.describe('US5 · Recorrer una región', () => {
  test('la región lista solo sus fichas, agrupadas por categoría', async ({ page }) => {
    await page.goto('regiones/insular');
    await expect(page.getByRole('heading', { level: 1, name: 'Insular' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Sitios' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Isla de Providencia' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ciudad Perdida (Teyuna)' })).toHaveCount(0);
  });

  test('la portada lleva a las seis regiones', async ({ page }) => {
    await page.goto('./');
    const regions = page.getByRole('region', { name: 'Explora por región' }).getByRole('article');
    await expect(regions).toHaveCount(6);
  });
});

test.describe('US6 · Créditos y demostración', () => {
  test('la página de créditos lista las 96 fotos con su licencia', async ({ page }) => {
    await page.goto('creditos');
    await expect(page.getByText('96 fotos')).toBeVisible();
    await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(96);
  });

  test('las noticias llevan la marca de demostración', async ({ page }) => {
    await page.goto('noticias');
    await expect(page.getByRole('main').getByText('Demostración')).toHaveCount(6);
    await page.goto('noticias/temporada-de-ballenas');
    await expect(page.getByText(/Esta noticia es de demostración/).first()).toBeVisible();
  });
});
