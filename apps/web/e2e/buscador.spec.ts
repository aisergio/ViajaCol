import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test.describe('US4 · Encontrar algo al instante', () => {
  test('no descarga el índice hasta que se usa el buscador (FR-008)', async ({ page }) => {
    const indexRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/search-index/')) indexRequests.push(request.url());
    });
    await page.goto('./');
    await page.waitForLoadState('networkidle');
    expect(indexRequests).toEqual([]);
    await page.getByRole('combobox', { name: 'Buscar en Viaja Colombia' }).focus();
    await expect.poll(() => indexRequests.length).toBe(1);
    expect(indexRequests[0]).toMatch(/\/ViajaCol\/api\/search-index\/es$/);
  });

  test('encuentra sin tildes y agrupa por categoría', async ({ page }) => {
    await page.goto('./');
    const search = page.getByRole('combobox', { name: 'Buscar en Viaja Colombia' });
    await search.fill('bogota');
    const listbox = page.getByRole('listbox');
    await expect(listbox.getByRole('option', { name: /Plaza de Bolívar/ })).toBeVisible();
    await expect(listbox.getByRole('option', { name: /Ajiaco santafereño/ })).toBeVisible();
    await expect(listbox.getByText('Sitios', { exact: true })).toBeVisible();
    // Con el popup abierto, Base UI oculta a propósito el resto de la página a los lectores de
    // pantalla (y lo restituye al cerrar). Por eso axe revisa aquí solo el popup; la página completa
    // se revisa con el buscador cerrado en accesibilidad.spec.ts.
    const results = await new AxeBuilder({ page })
      .include('[role="listbox"]')
      .withTags(tags)
      .analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });

  test('con el teclado abre la ficha elegida; un sitio se abre en su ventana', async ({ page }) => {
    await page.goto('sitios');
    const search = page.getByRole('combobox', { name: 'Buscar en Viaja Colombia' });
    await search.fill('monserrate');
    await expect(page.getByRole('option', { name: /Cerro de Monserrate/ })).toBeVisible();
    await search.press('Enter');
    await expect(page).toHaveURL(/\/sitios\/monserrate$/);
    await expect(page.getByRole('dialog', { name: 'Cerro de Monserrate' })).toBeVisible();
    // Detrás de la ventana el encabezado queda inerte (fuera del árbol accesible): se lee por CSS.
    await expect(page.locator('input[role="combobox"]')).toHaveValue('');
  });

  test('las flechas recorren las sugerencias', async ({ page }) => {
    await page.goto('en');
    const search = page.getByRole('combobox', { name: 'Search Viaja Colombia' });
    await search.fill('carnival');
    await expect(page.getByRole('option')).toHaveCount(3);
    await search.press('ArrowDown');
    await search.press('Enter');
    await expect(page).toHaveURL(/\/en\/fiestas\//);
  });

  test('sin coincidencias lo dice', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('combobox', { name: 'Buscar en Viaja Colombia' }).fill('zzzz');
    await expect(page.getByText('Sin resultados para «zzzz».')).toBeVisible();
  });
});
