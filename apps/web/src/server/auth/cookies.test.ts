import { describe, expect, it } from 'vitest';
import { clearSessionCookies, hasSessionCookie, sessionHintCookie } from './cookies';

describe('cookies de la sesión', () => {
  it('reconoce las cookies de sesión con y sin el prefijo __Secure-', () => {
    expect(hasSessionCookie('otra=1; __Secure-viajacol.session_token=abc')).toBe(true);
    expect(hasSessionCookie('viajacol.session_data=abc')).toBe(true);
    expect(hasSessionCookie('viajacol.con_sesion=1; tema=oscuro')).toBe(false);
    expect(hasSessionCookie(null)).toBe(false);
  });

  it('la cookie indicadora vive en /ViajaCol, 7 días, y es legible por JavaScript', () => {
    const header = sessionHintCookie('on', true);
    expect(header).toBe('viajacol.con_sesion=1; Path=/ViajaCol; SameSite=Lax; Max-Age=604800; Secure');
    expect(header).not.toContain('HttpOnly');
  });

  it('borrar la sesión expira las dos cookies y el indicador', () => {
    const headers = clearSessionCookies(true);
    expect(headers).toHaveLength(3);
    expect(headers[0]).toMatch(/^__Secure-viajacol\.session_token=; Path=\/ViajaCol; Max-Age=0; HttpOnly/);
    expect(headers[2]).toMatch(/^viajacol\.con_sesion=; .*Max-Age=0/);
  });
});
