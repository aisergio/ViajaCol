import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IdentityAdmin, Profile, UsersRepository } from '@/server/application/account/ports';
import { actualizarNombre, eliminarCuenta } from './actions';

const getSessionUser = vi.fn();
const jar = { set: vi.fn() };
const redirect = vi.fn<(target: unknown) => never>(() => {
  throw new Error('NEXT_REDIRECT');
});
const items = new Map<string, Profile>();
const users: UsersRepository = {
  get: async (sub) => items.get(sub) ?? null,
  createIfMissing: async (p) => {
    if (!items.has(p.sub)) items.set(p.sub, p);
    return items.get(p.sub) as Profile;
  },
  updateDisplayName: async (sub, displayName, updatedAt) => {
    const current = items.get(sub);
    if (!current) return null;
    items.set(sub, { ...current, displayName, updatedAt });
    return items.get(sub) as Profile;
  },
  delete: async (sub) => {
    items.delete(sub);
  },
};
const identity: IdentityAdmin = { deleteUser: vi.fn(async () => undefined) };

vi.mock('@/server/auth/session', () => ({ getSessionUser: () => getSessionUser() }));
vi.mock('@/server/account-services', () => ({ getAccountServices: async () => ({ users, identity }) }));
vi.mock('@/server/auth/auth', () => ({ getAuthConfig: async () => ({ origin: 'https://aisergio.dev' }) }));
vi.mock('next/headers', () => ({ cookies: async () => jar }));
vi.mock('@/i18n/navigation', () => ({ redirect: (arg: unknown) => redirect(arg) }));

const ana = { sub: 'sub-ana', email: 'ana@example.com', name: 'Ana' };
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

describe('actualizarNombre', () => {
  beforeEach(() => {
    items.clear();
    getSessionUser.mockReset();
  });

  it('sin sesión no cambia nada', async () => {
    getSessionUser.mockResolvedValue(null);
    await expect(actualizarNombre({ status: 'idle' }, form({ nombre: 'Hacker' }))).resolves.toEqual({ status: 'error', error: 'sin-sesion' });
    expect(items.size).toBe(0);
  });

  it('usa el sub de la sesión aunque el formulario mande otro', async () => {
    getSessionUser.mockResolvedValue(ana);
    items.set('sub-otro', { sub: 'sub-otro', displayName: 'Otro', createdAt: 'a', updatedAt: 'a' });
    const result = await actualizarNombre({ status: 'idle' }, form({ nombre: 'Anita', sub: 'sub-otro' }));
    expect(result).toEqual({ status: 'ok', name: 'Anita' });
    expect(items.get('sub-ana')?.displayName).toBe('Anita');
    expect(items.get('sub-otro')?.displayName).toBe('Otro');
  });

  it('rechaza un nombre inválido', async () => {
    getSessionUser.mockResolvedValue(ana);
    await expect(actualizarNombre({ status: 'idle' }, form({ nombre: '' }))).resolves.toEqual({ status: 'error', error: 'nombre-invalido' });
  });
});

describe('eliminarCuenta', () => {
  beforeEach(() => {
    items.clear();
    getSessionUser.mockReset();
    jar.set.mockReset();
    redirect.mockClear();
    vi.mocked(identity.deleteUser).mockClear();
  });

  it('sin sesión no elimina nada', async () => {
    getSessionUser.mockResolvedValue(null);
    await expect(eliminarCuenta('es', { status: 'idle' }, form({ confirmar: 'eliminar' }))).resolves.toEqual({ status: 'error', error: 'sin-sesion' });
    expect(identity.deleteUser).not.toHaveBeenCalled();
  });

  it('exige la confirmación escrita', async () => {
    getSessionUser.mockResolvedValue(ana);
    await expect(eliminarCuenta('es', { status: 'idle' }, form({ confirmar: 'si' }))).resolves.toEqual({ status: 'error', error: 'confirmacion' });
    expect(identity.deleteUser).not.toHaveBeenCalled();
  });

  it('borra usuario y perfil, expira las cookies y redirige', async () => {
    getSessionUser.mockResolvedValue(ana);
    items.set('sub-ana', { sub: 'sub-ana', displayName: 'Ana', createdAt: 'a', updatedAt: 'a' });
    await expect(eliminarCuenta('en', { status: 'idle' }, form({ confirmar: 'eliminar' }))).rejects.toThrow('NEXT_REDIRECT');
    expect(identity.deleteUser).toHaveBeenCalledWith('sub-ana');
    expect(items.has('sub-ana')).toBe(false);
    const names = jar.set.mock.calls.map((call) => call[0]);
    expect(names).toEqual(['__Secure-viajacol.session_token', '__Secure-viajacol.session_data', 'viajacol.con_sesion']);
    expect(jar.set.mock.calls.every((call) => call[2].maxAge === 0 && call[2].path === '/ViajaCol')).toBe(true);
    expect(redirect).toHaveBeenCalledWith({ href: '/cuenta/eliminada', locale: 'en' });
  });

  it('si el proveedor falla, avisa y no cierra la sesión', async () => {
    getSessionUser.mockResolvedValue(ana);
    vi.mocked(identity.deleteUser).mockRejectedValueOnce(new Error('caído'));
    await expect(eliminarCuenta('es', { status: 'idle' }, form({ confirmar: 'eliminar' }))).resolves.toEqual({ status: 'error', error: 'no-disponible' });
    expect(jar.set).not.toHaveBeenCalled();
  });
});
