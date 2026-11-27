import { describe, expect, it } from 'vitest';
import { findActiveSection, SECTIONS } from './sections';

describe('findActiveSection', () => {
  it.each([
    ['/sitios', 'sitios'],
    ['/sitios/', 'sitios'],
    ['/sitios/parque-tayrona', 'sitios'],
    ['/fiestas', 'fiestas'],
    ['/platos', 'platos'],
    ['/experiencias/salsa-en-cali', 'experiencias'],
    ['/regiones/caribe', 'regiones'],
    ['/noticias', 'noticias'],
  ])('la ruta %s activa %s', (pathname, expected) => {
    expect(findActiveSection(pathname)).toBe(expected);
  });

  it('la portada, las secciones próximas y las rutas desconocidas no activan nada', () => {
    expect(findActiveSection('/')).toBeNull();
    expect(findActiveSection('/guias')).toBeNull();
    expect(findActiveSection('/sitiosx')).toBeNull();
    expect(findActiveSection('/creditos')).toBeNull();
  });

  it('expone Guías como próximamente', () => {
    expect(SECTIONS.find((section) => section.id === 'guias')?.status).toBe('soon');
  });
});
