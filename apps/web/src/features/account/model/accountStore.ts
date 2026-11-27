import { create } from 'zustand';

/**
 * Store compartido de la cuenta en el cliente (MVVM con store compartido). El menú del encabezado y
 * el formulario de «Mi cuenta» leen y escriben el mismo nombre, así que un cambio guardado se ve de
 * inmediato en el encabezado (US4). No se persiste: la fuente de verdad es el servidor.
 */
export type AccountStatus = 'anonymous' | 'loading' | 'signed-in';

interface AccountState {
  status: AccountStatus;
  name: string;
  setLoading: () => void;
  signIn: (name: string) => void;
  signOut: () => void;
  rename: (name: string) => void;
}

export const useAccountStore = create<AccountState>()((set) => ({
  status: 'anonymous',
  name: '',
  setLoading: () => set({ status: 'loading' }),
  signIn: (name) => set({ status: 'signed-in', name }),
  signOut: () => set({ status: 'anonymous', name: '' }),
  rename: (name) => set((state) => (state.status === 'signed-in' ? { name } : { status: 'signed-in', name })),
}));
