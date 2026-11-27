import { describe, expect, it } from 'vitest';
import mediaLoader from './image-loader';

const src = 'media/sitios/valle-de-cocora-3f2a9c1e';

describe('mediaLoader (contrato media.md)', () => {
  it.each([
    [240, 480],
    [480, 480],
    [481, 960],
    [960, 960],
    [1200, 1600],
    [3840, 1600],
  ])('para %i px pide la variante de %i', (width, variant) => {
    expect(mediaLoader({ src, width })).toBe(`/ViajaCol/${src}-${variant}.webp`);
  });

  it('deja pasar las imágenes que no son del catálogo', () => {
    expect(mediaLoader({ src: '/ViajaCol/icon.svg', width: 64 })).toBe('/ViajaCol/icon.svg');
  });
});
