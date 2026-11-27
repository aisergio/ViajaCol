import { expect, test } from '@playwright/test';

test.describe('HU2 · Cambiar de idioma sin perder el lugar', () => {
  test('cambiar a inglés conserva la sección', async ({ page }) => {
    await page.goto('sitios');
    await page.getByRole('link', { name: 'English' }).click();
    await expect(page).toHaveURL(/\/ViajaCol\/en\/sitios$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1, name: 'Places' })).toBeVisible();
  });

  test('volver a español quita el prefijo de idioma', async ({ page }) => {
    await page.goto('en/fiestas');
    await page.getByRole('link', { name: 'Español' }).click();
    await expect(page).toHaveURL(/\/ViajaCol\/fiestas$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es-CO');
    await expect(page.getByRole('heading', { level: 1, name: 'Fiestas' })).toBeVisible();
  });

  test('el prefijo /es redundante redirige a la ruta sin prefijo', async ({ page }) => {
    await page.goto('es/platos');
    await expect(page).toHaveURL(/\/ViajaCol\/platos$/);
  });
});
