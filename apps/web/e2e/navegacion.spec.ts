import { expect, test } from '@playwright/test';

test.describe('HU1 · Recorrer el sitio en español', () => {
  test('la portada muestra el marco común en español', async ({ page }) => {
    await page.goto('./');
    await expect(page).toHaveTitle(/Viaja Colombia/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es-CO');
    const nav = page.getByRole('navigation', { name: 'Navegación principal' });
    for (const name of ['Noticias', 'Sitios', 'Fiestas', 'Platos']) {
      await expect(nav.getByRole('link', { name, exact: true })).toBeVisible();
    }
    await expect(nav.getByText('Guías')).toBeVisible();
    await expect(nav.getByRole('link', { name: /Guías/ })).toHaveCount(0);
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });

  test('la navegación marca la sección actual', async ({ page }) => {
    await page.goto('./');
    const nav = page.getByRole('navigation', { name: 'Navegación principal' });
    await nav.getByRole('link', { name: 'Sitios', exact: true }).click();
    await expect(page).toHaveURL(/\/ViajaCol\/sitios$/);
    await expect(nav.getByRole('link', { name: 'Sitios', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(page.getByRole('heading', { level: 1, name: 'Sitios' })).toBeVisible();
  });

  test('un enlace directo abre la sección', async ({ page }) => {
    const response = await page.goto('fiestas');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: 'Fiestas' })).toBeVisible();
  });
});
