import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { catalog, media } from './index';
import {
  CATEGORIES,
  catalogSchemas,
  EXPECTED_COUNTS,
  LOCALES,
  mediaKey,
  mediaSchema,
  REGION_SLUGS,
} from './schema';
import { buildSearchIndex } from './search';

const PUBLIC_MEDIA = fileURLToPath(new URL('../../../apps/web/public/media', import.meta.url));
const WIDTHS = [480, 960, 1600];

describe('Catálogo (FR-001, FR-002, FR-016)', () => {
  describe.each(CATEGORIES)('%s', (category) => {
    it('cumple su esquema', () => {
      const result = catalogSchemas[category].safeParse(catalog[category]);
      expect(result.error?.issues ?? []).toEqual([]);
    });

    it(`tiene la cantidad acordada`, () => {
      expect(catalog[category]).toHaveLength(EXPECTED_COUNTS[category]);
    });

    it('no repite slugs', () => {
      const slugs = catalog[category].map((entry) => entry.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });

    it('no repite nombres en ningún idioma', () => {
      for (const locale of LOCALES) {
        const names = catalog[category].map((entry) => entry[locale].name);
        expect(new Set(names).size, locale).toBe(names.length);
      }
    });
  });

  it('las regiones son exactamente las seis regiones naturales', () => {
    expect(catalog.regiones.map((region) => region.slug).sort()).toEqual([...REGION_SLUGS].sort());
  });

  it('cada mes tiene al menos dos fiestas (SC-002)', () => {
    for (let month = 1; month <= 12; month++) {
      const count = catalog.fiestas.filter((festival) => festival.months.includes(month)).length;
      expect(count, `mes ${month}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('cada región tiene al menos un sitio, un plato y una experiencia', () => {
    for (const region of REGION_SLUGS) {
      for (const category of ['sitios', 'platos', 'experiencias'] as const) {
        const count = catalog[category].filter((entry) => entry.region === region).length;
        expect(count, `${region} · ${category}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('Fotos (FR-003, FR-017)', () => {
  it('el manifiesto cumple su esquema', () => {
    expect(mediaSchema.safeParse(media).error?.issues ?? []).toEqual([]);
  });

  it('cada ficha tiene su foto en el manifiesto, con el archivo elegido', () => {
    for (const category of CATEGORIES) {
      for (const entry of catalog[category]) {
        const key = mediaKey(category, entry.slug);
        expect(media[key]?.file, key).toBe(entry.photo);
      }
    }
  });

  it('el manifiesto no tiene entradas sin ficha', () => {
    const keys = new Set(
      CATEGORIES.flatMap((category) =>
        catalog[category].map((entry) => mediaKey(category, entry.slug)),
      ),
    );
    expect(Object.keys(media).filter((key) => !keys.has(key))).toEqual([]);
  });

  it('cada foto tiene sus tres anchos en public/media, y no sobran archivos', () => {
    const expected = new Set<string>();
    for (const [key, entry] of Object.entries(media)) {
      for (const width of WIDTHS) {
        const file = join(PUBLIC_MEDIA, `${key}-${entry.hash}-${width}.webp`);
        expected.add(file);
        expect(existsSync(file), file).toBe(true);
      }
    }
    const present = existsSync(PUBLIC_MEDIA)
      ? CATEGORIES.flatMap((category) => {
          const dir = join(PUBLIC_MEDIA, category);
          return existsSync(dir) ? readdirSync(dir).map((name) => join(dir, name)) : [];
        })
      : [];
    expect(present.filter((file) => !expected.has(file))).toEqual([]);
  });

  it('la variante de 960 px, la que baja una ficha en móvil, pesa 150 KB o menos (SC-007)', () => {
    const heavy = Object.entries(media)
      .map(([key, entry]) => ({
        key,
        kb: statSync(join(PUBLIC_MEDIA, `${key}-${entry.hash}-960.webp`)).size / 1024,
      }))
      .filter(({ kb }) => kb > 150)
      .map(({ key, kb }) => `${key}: ${kb.toFixed(0)} KB`);
    expect(heavy).toEqual([]);
  });
});

describe('Índice de búsqueda (FR-008, SC-004)', () => {
  it.each(LOCALES)('%s: incluye todas las fichas y pesa 20 KB o menos comprimido', (locale) => {
    const index = buildSearchIndex(locale);
    const total = Object.values(EXPECTED_COUNTS).reduce((sum, count) => sum + count, 0);
    expect(index.items).toHaveLength(total);
    const gzipped = gzipSync(JSON.stringify(index)).byteLength;
    expect(gzipped).toBeLessThanOrEqual(20 * 1024);
  });
});
