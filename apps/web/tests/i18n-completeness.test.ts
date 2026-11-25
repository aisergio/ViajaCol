import { messages } from '@viajacol/i18n';
import { describe, expect, it } from 'vitest';

function flatten(value: Record<string, unknown>, prefix = ''): Array<[string, unknown]> {
  return Object.entries(value).flatMap(([key, child]) =>
    child !== null && typeof child === 'object'
      ? flatten(child as Record<string, unknown>, `${prefix}${key}.`)
      : [[`${prefix}${key}`, child] as [string, unknown]],
  );
}

describe('Catálogo de textos ES/EN (FR-004)', () => {
  const es = flatten(messages.es);
  const en = flatten(messages.en);

  it('tiene exactamente las mismas claves en español e inglés', () => {
    expect(en.map(([key]) => key).sort()).toEqual(es.map(([key]) => key).sort());
  });

  it('no tiene textos vacíos en ningún idioma', () => {
    for (const [key, text] of [...es, ...en]) {
      expect(typeof text, key).toBe('string');
      expect(String(text).trim(), key).not.toBe('');
    }
  });
});
