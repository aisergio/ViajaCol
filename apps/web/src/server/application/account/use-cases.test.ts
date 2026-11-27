import { describe, expect, it, vi } from 'vitest';
import type { IdentityAdmin, Profile, UsersRepository } from './ports';
import { deleteAccount, ensureProfile, initialDisplayName, updateDisplayName } from './use-cases';

function memoryRepo(initial: Profile[] = []): UsersRepository & { items: Map<string, Profile> } {
  const items = new Map(initial.map((p) => [p.sub, p]));
  return {
    items,
    get: async (sub) => items.get(sub) ?? null,
    createIfMissing: async (profile) => {
      if (!items.has(profile.sub)) items.set(profile.sub, profile);
      return items.get(profile.sub) as Profile;
    },
    updateDisplayName: async (sub, displayName, updatedAt) => {
      const current = items.get(sub);
      if (!current) return null;
      const next = { ...current, displayName, updatedAt };
      items.set(sub, next);
      return next;
    },
    delete: async (sub) => {
      items.delete(sub);
    },
  };
}

const ana = { sub: 'sub-ana', email: 'ana.maria@example.com', name: 'Ana María' };
const now = new Date('2026-11-27T15:00:00.000Z');

describe('initialDisplayName', () => {
  it('usa el nombre de Cognito si es válido', () => {
    expect(initialDisplayName(ana)).toBe('Ana María');
  });

  it('si falta, usa la parte local del correo recortada a 50', () => {
    expect(initialDisplayName({ ...ana, name: '   ' })).toBe('ana.maria');
    expect(initialDisplayName({ ...ana, name: '', email: `${'x'.repeat(80)}@example.com` })).toHaveLength(50);
  });
});

describe('ensureProfile', () => {
  it('crea el perfil la primera vez y no lo pisa después', async () => {
    const repo = memoryRepo();
    const first = await ensureProfile(repo, ana, now);
    expect(first).toEqual({ sub: 'sub-ana', displayName: 'Ana María', createdAt: now.toISOString(), updatedAt: now.toISOString() });
    await repo.updateDisplayName('sub-ana', 'Anita', now.toISOString());
    const again = await ensureProfile(repo, { ...ana, name: 'Otro nombre' }, new Date('2026-12-01T00:00:00Z'));
    expect(again.displayName).toBe('Anita');
    expect(again.createdAt).toBe(now.toISOString());
  });
});

describe('updateDisplayName', () => {
  it('guarda el nombre sin espacios a los lados', async () => {
    const repo = memoryRepo();
    const result = await updateDisplayName(repo, ana, '  Ana  ', now);
    expect(result).toEqual({ ok: true, profile: expect.objectContaining({ displayName: 'Ana' }) });
  });

  it.each([[''], ['   '], ['x'.repeat(51)], ['línea\nnueva'], [42], [null]])('rechaza %j sin guardar', async (value) => {
    const repo = memoryRepo();
    const result = await updateDisplayName(repo, ana, value, now);
    expect(result).toEqual({ ok: false, error: 'nombre-invalido' });
    expect(repo.items.size).toBe(0);
  });

  it('solo cambia el perfil del usuario de la sesión', async () => {
    const otro: Profile = { sub: 'sub-otro', displayName: 'Otro', createdAt: 'a', updatedAt: 'a' };
    const repo = memoryRepo([otro]);
    await updateDisplayName(repo, ana, 'Ana', now);
    expect(repo.items.get('sub-otro')).toEqual(otro);
  });
});

describe('deleteAccount', () => {
  it('borra primero en el proveedor y luego el perfil', async () => {
    const repo = memoryRepo([{ sub: 'sub-ana', displayName: 'Ana', createdAt: 'a', updatedAt: 'a' }]);
    const order: string[] = [];
    const identity: IdentityAdmin = { deleteUser: vi.fn(async () => void order.push('identidad')) };
    const spy = vi.spyOn(repo, 'delete').mockImplementation(async (sub) => {
      order.push('perfil');
      repo.items.delete(sub);
    });
    await deleteAccount(repo, identity, ana);
    expect(order).toEqual(['identidad', 'perfil']);
    expect(identity.deleteUser).toHaveBeenCalledWith('sub-ana');
    expect(spy).toHaveBeenCalledWith('sub-ana');
  });

  it('si el proveedor falla, no borra el perfil', async () => {
    const repo = memoryRepo([{ sub: 'sub-ana', displayName: 'Ana', createdAt: 'a', updatedAt: 'a' }]);
    const identity: IdentityAdmin = { deleteUser: vi.fn().mockRejectedValue(new Error('caído')) };
    await expect(deleteAccount(repo, identity, ana)).rejects.toThrow('caído');
    expect(repo.items.has('sub-ana')).toBe(true);
  });
});
