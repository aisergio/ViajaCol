import { expect, test } from '@playwright/test';

const cases = [
  { path: 'no-existe', heading: 'Página no encontrada', back: 'Volver a la portada' },
  { path: 'en/no-existe', heading: 'Page not found', back: 'Back to the home page' },
];

test.describe('HU4 · Direcciones inexistentes', () => {
  for (const { path, heading, back } of cases) {
    test(`/${path} responde 404 en su idioma`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expect(page.getByRole('link', { name: back })).toBeVisible();
    });
  }
});
