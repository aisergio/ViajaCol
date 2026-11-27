import { describe, expect, it } from 'vitest';
import { homeFor, safeReturnPath } from './return-path';

describe('safeReturnPath', () => {
  it.each([
    ['/ViajaCol', '/ViajaCol'],
    ['/ViajaCol/sitios', '/ViajaCol/sitios'],
    ['/ViajaCol/en/cuenta', '/ViajaCol/en/cuenta'],
    ['/ViajaCol/sitios?region=caribe#lista', '/ViajaCol/sitios?region=caribe#lista'],
  ])('acepta la ruta interna %s', (input, expected) => {
    expect(safeReturnPath(input, 'es')).toBe(expected);
  });

  it.each([
    ['https://evil.example/ViajaCol'],
    ['//evil.example/ViajaCol'],
    ['/\\evil.example'],
    ['/ViajaCol\\..\\otro'],
    ['/ViajaCol/../otro'],
    ['/ViajaCol/%2e%2e/otro'],
    ['/otro-proyecto'],
    ['/ViajaColX'],
    ['javascript:alert(1)'],
    ['/ViajaCol/\nSet-Cookie:x'],
    [`/ViajaCol/${'a'.repeat(600)}`],
    [''],
  ])('rechaza %s y devuelve la portada', (input) => {
    expect(safeReturnPath(input, 'es')).toBe('/ViajaCol');
    expect(safeReturnPath(input, 'en')).toBe('/ViajaCol/en');
  });

  it('sin valor devuelve la portada del idioma', () => {
    expect(safeReturnPath(null, 'en')).toBe(homeFor('en'));
    expect(safeReturnPath(undefined, 'es')).toBe(homeFor('es'));
  });

  it('normaliza los segmentos que siguen dentro del sitio', () => {
    expect(safeReturnPath('/ViajaCol/sitios/../fiestas', 'es')).toBe('/ViajaCol/fiestas');
  });
});
