import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = [
  './',
  'sitios',
  'fiestas',
  'platos',
  'experiencias',
  'regiones',
  'noticias',
  'creditos',
  'sitios/valle-de-cocora',
  'fiestas/carnaval-de-barranquilla',
  'regiones/pacifica',
  'noticias/nace-el-catalogo',
  'en',
  'en/sitios',
  'en/fiestas',
  'en/platos/bandeja-paisa',
  'en/experiencias/salsa-en-cali',
];
const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test.describe('HU5 · Teclado y lector de pantalla', () => {
  for (const route of routes) {
    test(`axe sin violaciones AA en «${route}» (tema claro y oscuro)`, async ({ page }) => {
      for (const colorScheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme });
        await page.goto(route);
        const results = await new AxeBuilder({ page }).withTags(tags).analyze();
        const summary = results.violations.map((violation) => ({
          rule: violation.id,
          impact: violation.impact,
          targets: violation.nodes.map((node) => node.target.join(' ')),
        }));
        expect(summary, `tema ${colorScheme}`).toEqual([]);
      }
    });
  }

  test('el primer Tab enfoca «Saltar al contenido»', async ({ page }) => {
    await page.goto('./');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused();
  });

  test('la página expone cabecera, navegación, contenido y pie', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('contentinfo')).toHaveCount(1);
  });
});
