import { describe, expect, it } from 'vitest';
import { findActiveSection, SECTIONS } from './sections';

describe('findActiveSection', () => {
  it.each([
    ['/', 'noticias'],
    ['/sitios', 'sitios'],
    ['/sitios/', 'sitios'],
    ['/sitios/parque-tayrona', 'sitios'],
    ['/fiestas', 'fiestas'],
    ['/platos', 'platos'],
  ])('la ruta %s activa %s', (pathname, expected) => {
    expect(findActiveSection(pathname)).toBe(expected);
  });

  it('no activa secciones próximas ni rutas desconocidas', () => {
    expect(findActiveSection('/guias')).toBeNull();
    expect(findActiveSection('/sitiosx')).toBeNull();
    expect(findActiveSection('/otra')).toBeNull();
  });

  it('expone Guías como próximamente', () => {
    expect(SECTIONS.find((section) => section.id === 'guias')?.status).toBe('soon');
  });
});
