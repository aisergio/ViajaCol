import { describe, expect, it } from 'vitest';
import { formatDate, monthName, monthsLabel } from './dates';

describe('fechas del catálogo', () => {
  it('nombra los meses en cada idioma, con mayúscula inicial', () => {
    expect(monthName(1, 'es')).toBe('Enero');
    expect(monthName(12, 'en')).toBe('December');
  });

  it('abrevia los meses de una fiesta', () => {
    expect(monthsLabel([2, 3], 'es')).toBe('Feb · Mar');
    expect(monthsLabel([9, 10], 'en')).toBe('Sep · Oct');
  });

  it('formatea fechas ISO sin correrse de día', () => {
    expect(formatDate('2026-11-20', 'es')).toBe('20 de noviembre de 2026');
    expect(formatDate('2026-07-01', 'en')).toBe('July 1, 2026');
  });
});
