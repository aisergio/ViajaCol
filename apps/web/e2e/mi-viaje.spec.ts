import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Sin Cognito ni DynamoDB reales (ci.yml): aquí se prueba lo que no necesita una sesión verdadera. El
// editor con sesión se prueba en Vitest (ViewModel y vistas) y en producción (T040).
const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const TRIP = '0b6f2f2e-6a3e-4c1f-9d1a-1f2e3d4c5b6a';
const add = 'Agregar a Mi viaje';

test.describe('US5 · Borrador sin cuenta', () => {
  test('agregar desde las fichas guarda en el borrador, sin duplicar, y sobrevive a recargar', async ({
    page,
  }) => {
    await page.goto('sitios/monserrate');
    await page.getByRole('button', { name: add }).click();
    await expect(page.getByText('Guardado en tu borrador.')).toBeVisible();
    await page.getByRole('button', { name: add }).click();
    await expect(page.getByText('Ya está en tu borrador.')).toBeVisible();

    await page.goto('platos/bandeja-paisa');
    await page.getByRole('button', { name: add }).click();
    await expect(page.getByText('Guardado en tu borrador.')).toBeVisible();

    await page.goto('mi-viaje');
    const draft = page.getByRole('region', { name: 'Tu borrador' });
    await expect(draft.getByRole('link', { name: 'Cerro de Monserrate' })).toHaveAttribute(
      'href',
      '/ViajaCol/sitios/monserrate',
    );
    await expect(draft.getByRole('link', { name: 'Bandeja paisa' })).toBeVisible();

    await page.reload();
    await expect(draft.getByRole('listitem')).toHaveCount(2);
    await draft.getByRole('button', { name: 'Quitar Bandeja paisa' }).click();
    await expect(draft.getByRole('listitem')).toHaveCount(1);
  });

  test('«Mi viaje» invita a entrar con el regreso a la misma página', async ({ page }) => {
    await page.goto('mi-viaje');
    await expect(page.getByRole('heading', { level: 1, name: 'Mi viaje' })).toBeVisible();
    await expect(page.getByText('Tu borrador está vacío.', { exact: false })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Entra para guardarlo en tu cuenta' }),
    ).toHaveAttribute('href', '/ViajaCol/entrar?volver=%2FViajaCol%2Fmi-viaje');
    await page.goto('en/mi-viaje');
    await expect(page.getByRole('heading', { level: 1, name: 'My trip' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Sign in to save it to your account' }),
    ).toHaveAttribute('href', '/ViajaCol/en/entrar?volver=%2FViajaCol%2Fen%2Fmi-viaje');
  });

  test('«Mi viaje» está en la navegación principal', async ({ page }) => {
    await page.goto('sitios');
    const nav = page.getByRole('navigation', { name: 'Navegación principal' });
    await nav.getByRole('link', { name: 'Mi viaje', exact: true }).click();
    await expect(page).toHaveURL(/\/ViajaCol\/mi-viaje$/);
    await expect(nav.getByRole('link', { name: 'Mi viaje', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});

test.describe('US2 · Diálogo «Agregar a un viaje»', () => {
  test('con el indicador de sesión abre el diálogo; si la sesión venció, guarda en el borrador', async ({
    page,
    context,
  }) => {
    // El encabezado consulta el nombre: se responde como si hubiera sesión para que no borre el indicador.
    await page.route('**/api/cuenta/yo', (route) => route.fulfill({ json: { name: 'Ana' } }));
    await context.addCookies([
      { name: 'viajacol.con_sesion', value: '1', domain: 'localhost', path: '/ViajaCol' },
    ]);

    await page.goto('fiestas/feria-de-manizales');
    const button = page.getByRole('button', { name: add });
    await button.click();
    const dialog = page.getByRole('dialog', { name: 'Agregar «Feria de Manizales» a un viaje' });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText('Tu sesión terminó, así que lo guardamos en tu borrador.'),
    ).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(tags).include('dialog').analyze();
    expect(results.violations).toEqual([]);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(button).toBeFocused();
    expect((await context.cookies()).some((cookie) => cookie.name === 'viajacol.con_sesion')).toBe(
      false,
    );

    await page.goto('mi-viaje');
    await expect(
      page
        .getByRole('region', { name: 'Tu borrador' })
        .getByRole('link', { name: 'Feria de Manizales' }),
    ).toBeVisible();
  });
});

test.describe('Rutas privadas y enlaces compartidos', () => {
  test('un viaje y su calendario, sin sesión, van a «Entrar» con el regreso (307)', async ({
    request,
  }) => {
    for (const [path, signIn, volver] of [
      [`mi-viaje/${TRIP}`, '/ViajaCol/entrar', `/ViajaCol/mi-viaje/${TRIP}`],
      [
        `en/mi-viaje/${TRIP}/calendario`,
        '/ViajaCol/en/entrar',
        `/ViajaCol/en/mi-viaje/${TRIP}/calendario`,
      ],
    ] as const) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(307);
      const location = new URL(response.headers()['location'] ?? '', 'http://localhost:3100');
      expect(location.pathname).toBe(signIn);
      expect(location.searchParams.get('volver')).toBe(volver);
    }
  });

  test('un enlace compartido que no existe responde 404, y su vista previa también', async ({
    request,
  }) => {
    expect((await request.get('viaje/no-existe')).status()).toBe(404);
    expect((await request.get('en/viaje/no-existe')).status()).toBe(404);
    expect((await request.get('api/og/viaje/no-existe')).status()).toBe(404);
  });

  test('«Mi viaje» no se guarda en caché ni se indexa', async ({ request, page }) => {
    const response = await request.get('mi-viaje');
    expect(response.headers()['cache-control']).toContain('no-store');
    await page.goto('mi-viaje');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
});

test.describe('SC-004 · Accesibilidad', () => {
  for (const path of ['mi-viaje', 'en/mi-viaje']) {
    test(`axe sin violaciones en /${path} con borrador`, async ({ page }) => {
      await page.goto('sitios/monserrate');
      await page.getByRole('button', { name: add }).click();
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const draft = page.getByRole('region', {
        name: path.startsWith('en') ? 'Your draft' : 'Tu borrador',
      });
      await expect(draft.getByRole('listitem')).toHaveCount(1);
      const results = await new AxeBuilder({ page }).withTags(tags).analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test('axe sin violaciones en una ficha con el aviso del borrador', async ({ page }) => {
    await page.goto('en/platos/bandeja-paisa');
    await page.getByRole('button', { name: 'Add to My trip' }).click();
    await expect(page.getByText('Saved to your draft.')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(tags).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('Encabezado con «Mi viaje»', () => {
  test('cabe sin desbordarse en los anchos de escritorio comunes', async ({ page }) => {
    for (const width of [1280, 1366, 1440, 1536, 1920]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('mi-viaje');
      const nav = page.getByRole('navigation', { name: 'Navegación principal' });
      await expect(nav.getByRole('link', { name: 'Mi viaje', exact: true })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `ancho ${width}`).toBe(0);
    }
  });
});
