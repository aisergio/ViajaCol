import { expect, test } from '@playwright/test';

test.describe('HU3 · Tema claro u oscuro', () => {
  test('el tema elegido persiste al recargar', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('./');
    const toggle = page.getByRole('button', { name: /^Tema/ });
    await expect(toggle).toHaveAccessibleName(/del sistema/);
    await toggle.click(); // sistema → claro
    await expect(toggle).toHaveAccessibleName(/Tema claro/);
    await toggle.click(); // claro → oscuro
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test.describe('con el sistema en modo oscuro', () => {
    test.use({ colorScheme: 'dark' });

    test('la primera visita aparece oscura sin esperar a la hidratación', async ({ page }) => {
      await page.goto('./', { waitUntil: 'commit' });
      await page.waitForSelector('html.dark', { timeout: 5_000 });
      await expect(page.locator('html')).toHaveClass(/dark/);
    });
  });
});
