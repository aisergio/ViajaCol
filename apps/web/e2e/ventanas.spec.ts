import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test.describe('US3 · Abrir una ficha sin perder la lista', () => {
  test('la ficha de un sitio se abre encima de la lista, con su URL', async ({ page }) => {
    await page.goto('sitios?region=caribe');
    await page.getByRole('link', { name: 'Parque Nacional Natural Tayrona' }).click();
    const dialog = page.getByRole('dialog', { name: 'Parque Nacional Natural Tayrona' });
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/\/sitios\/parque-tayrona$/);
    await expect(page).toHaveTitle(/Parque Nacional Natural Tayrona · Sitio/);
    const results = await new AxeBuilder({ page }).withTags(tags).analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });

  test('recargar la dirección abre la página completa (SC-005)', async ({ page }) => {
    await page.goto('sitios');
    await page.getByRole('link', { name: 'Desierto de la Tatacoa' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Desierto de la Tatacoa' }),
    ).toBeVisible();
  });

  test('«atrás» cierra la ventana y conserva los filtros', async ({ page }) => {
    await page.goto('sitios?region=amazonia');
    await page.getByRole('link', { name: 'Puerto Nariño' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(/\/sitios\?region=amazonia$/);
    await expect(page.getByRole('main').getByRole('article')).toHaveCount(4);
  });

  test('Escape cierra la ventana y devuelve el foco al enlace', async ({ page }) => {
    await page.goto('sitios');
    const link = page.getByRole('link', { name: 'Caño Cristales' });
    await link.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(/\/sitios$/);
    await expect(link).toBeFocused();
  });

  test('la foto de una fiesta se abre en grande', async ({ page }) => {
    await page.goto('fiestas');
    await page.getByRole('link', { name: 'Feria de las Flores' }).click();
    const dialog = page.getByRole('dialog', { name: 'Feria de las Flores' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('img')).toHaveAttribute('alt', /Silleta/);
    await dialog.getByRole('button', { name: 'Cerrar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('«Ver la ficha completa» sale de la ventana a la página completa', async ({ page }) => {
    await page.goto('sitios');
    await page.getByRole('link', { name: 'Valle de Cocora' }).click();
    const dialog = page.getByRole('dialog', { name: 'Valle de Cocora' });
    await dialog.getByRole('link', { name: 'Ver la ficha completa' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: 'Valle de Cocora' })).toBeVisible();
  });
});
