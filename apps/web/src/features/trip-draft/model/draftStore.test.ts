import { beforeEach, describe, expect, it } from 'vitest';
import { DRAFT_LIMIT, DRAFT_STORAGE_KEY, useDraftStore } from './draftStore';

const cocora = { kind: 'sitio' as const, slug: 'valle-de-cocora', title: 'Valle de Cocora' };

describe('useDraftStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useDraftStore.getState().clear();
  });

  it('agrega, evita duplicados y persiste en localStorage', () => {
    expect(useDraftStore.getState().add(cocora)).toBe('added');
    expect(useDraftStore.getState().add(cocora)).toBe('duplicate');
    const saved = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) ?? '{}');
    expect(saved.state.items).toEqual([cocora]);
    expect(saved.state.migrationId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('respeta el límite y quita por categoría y slug', () => {
    for (let i = 0; i < DRAFT_LIMIT; i++)
      useDraftStore.getState().add({ ...cocora, slug: `s${i}` });
    expect(useDraftStore.getState().add({ ...cocora, slug: 'extra' })).toBe('limit');
    useDraftStore.getState().remove('sitio', 's0');
    expect(useDraftStore.getState().items).toHaveLength(DRAFT_LIMIT - 1);
  });

  it('vaciar cambia el identificador de migración', () => {
    const before = useDraftStore.getState().migrationId;
    useDraftStore.getState().add(cocora);
    useDraftStore.getState().clear();
    expect(useDraftStore.getState().items).toEqual([]);
    expect(useDraftStore.getState().migrationId).not.toBe(before);
  });
});
