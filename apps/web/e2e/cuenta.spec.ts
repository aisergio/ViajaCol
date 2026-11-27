import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Valores de prueba (ci.yml y quickstart): no hay un Cognito real detrás, solo se revisan las
// redirecciones, las cookies y los rechazos sin sesión (research D-09).
const COGNITO = 'https://viajacol-e2e.auth.us-east-2.amazoncognito.com';
const ORIGIN = 'http://localhost:3100';
const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const setCookies = (headers: { name: string; value: string }[]) =>
  headers.filter((h) => h.name.toLowerCase() === 'set-cookie').map((h) => h.value);

test.describe('US1 y US2 · Entrar y salir', () => {
  test('el encabezado ofrece «Entrar» con el regreso a la página actual', async ({ page }) => {
    await page.goto('sitios');
    await expect(page.getByRole('link', { name: 'Entrar' })).toHaveAttribute(
      'href',
      '/ViajaCol/entrar?volver=%2FViajaCol%2Fsitios',
    );
    await page.goto('en/fiestas');
    await expect(page.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/ViajaCol/en/entrar?volver=%2FViajaCol%2Fen%2Ffiestas',
    );
  });

  test('«Entrar» redirige a Cognito con PKCE, el idioma y la cookie de estado (FR-003, FR-016)', async ({
    request,
  }) => {
    for (const [path, lang] of [
      ['entrar?volver=/ViajaCol/sitios', 'es'],
      ['en/entrar', 'en'],
    ] as const) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(302);
      expect(response.headers()['cache-control']).toContain('no-store');
      const location = new URL(response.headers()['location'] ?? '');
      expect(`${location.origin}${location.pathname}`).toBe(`${COGNITO}/oauth2/authorize`);
      expect(location.searchParams.get('lang')).toBe(lang);
      expect(location.searchParams.get('code_challenge_method')).toBe('S256');
      expect(location.searchParams.get('redirect_uri')).toBe(
        `${ORIGIN}/ViajaCol/api/auth/callback/cognito`,
      );
      const cookies = setCookies(response.headersArray());
      const state = cookies.find((c) => c.startsWith('viajacol.oauth_state='));
      expect(state).toMatch(/HttpOnly/i);
      expect(state).toMatch(/Path=\/ViajaCol/);
      expect(state).toMatch(/SameSite=Lax/i);
      expect(cookies.some((c) => c.startsWith('viajacol.con_sesion=1'))).toBe(true);
    }
  });

  test('«Cerrar sesión» desde el sitio borra las cookies y pasa por Cognito (FR-007)', async ({
    request,
  }) => {
    const response = await request.post('salir', { headers: { origin: ORIGIN }, maxRedirects: 0 });
    expect(response.status()).toBe(303);
    expect(response.headers()['location']).toBe(
      `${COGNITO}/logout?client_id=e2e-client&logout_uri=${encodeURIComponent(`${ORIGIN}/ViajaCol`)}`,
    );
    const cookies = setCookies(response.headersArray());
    expect(
      cookies.some((c) => c.startsWith('viajacol.session_token=;') && /Max-Age=0/.test(c)),
    ).toBe(true);
    expect(cookies.some((c) => c.startsWith('viajacol.con_sesion=;'))).toBe(true);
  });

  test('«Cerrar sesión» desde otro sitio se rechaza', async ({ request }) => {
    const response = await request.post('salir', {
      headers: { origin: 'https://evil.example' },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(403);
  });
});

test.describe('US3 · Proteger lo privado', () => {
  test('«Mi cuenta» sin sesión lleva a «Entrar» con el regreso (FR-008)', async ({ request }) => {
    const response = await request.get('cuenta', { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers()['location']).toMatch(
      /\/ViajaCol\/entrar\?volver=%2FViajaCol%2Fcuenta$/,
    );
    const english = await request.get('en/cuenta', { maxRedirects: 0 });
    expect(english.headers()['location']).toMatch(
      /\/ViajaCol\/en\/entrar\?volver=%2FViajaCol%2Fen%2Fcuenta$/,
    );
  });

  test('una cookie de sesión falsa no abre «Mi cuenta» (la verifica el servidor)', async ({
    request,
  }) => {
    const response = await request.get('cuenta', {
      headers: { cookie: 'viajacol.session_token=falsa; viajacol.session_data=falsa' },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(307);
    expect(response.headers()['location']).toContain('/ViajaCol/entrar?volver=');
  });

  test('/api/cuenta/yo sin sesión responde 401, sin caché, y borra el indicador', async ({
    request,
  }) => {
    const response = await request.get('api/cuenta/yo', {
      headers: { cookie: 'viajacol.con_sesion=1' },
    });
    expect(response.status()).toBe(401);
    expect(response.headers()['cache-control']).toContain('no-store');
    expect(
      setCookies(response.headersArray()).some((c) => c.startsWith('viajacol.con_sesion=;')),
    ).toBe(true);
  });

  test('con un indicador sin sesión, el menú vuelve a «Entrar» y lo borra', async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: 'viajacol.con_sesion', value: '1', domain: 'localhost', path: '/ViajaCol' },
    ]);
    await page.goto('sitios');
    await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible();
    await expect
      .poll(async () => (await context.cookies()).some((c) => c.name === 'viajacol.con_sesion'))
      .toBe(false);
  });
});

test.describe('Páginas de la cuenta sin sesión', () => {
  for (const path of [
    'entrar/error',
    'en/entrar/error',
    'cuenta/eliminada',
    'en/cuenta/eliminada',
  ]) {
    test(`${path} es accesible y no se indexa`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      const results = await new AxeBuilder({ page }).withTags(tags).analyze();
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  }
});
