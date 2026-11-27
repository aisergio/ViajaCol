import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

/**
 * Borrador de «Mi viaje» sin cuenta (US5): estado global compartido y persistente en `localStorage`.
 * El middleware `devtools` lo muestra en Redux DevTools (plan, modelo de estado). Al iniciar sesión
 * se migra con `migrarBorrador` y se vacía.
 */
export const DRAFT_STORAGE_KEY = 'viajacol:mi-viaje-borrador';
export const DRAFT_LIMIT = 100;

export type DraftKind = 'sitio' | 'fiesta' | 'plato' | 'experiencia';

export interface DraftItem {
  kind: DraftKind;
  slug: string;
  title: string;
}

export type DraftAddResult = 'added' | 'duplicate' | 'limit';

interface DraftState {
  migrationId: string;
  items: DraftItem[];
  add: (item: DraftItem) => DraftAddResult;
  remove: (kind: DraftKind, slug: string) => void;
  /** Vacía el borrador y prepara un identificador nuevo para la próxima migración. */
  clear: () => void;
}

const newMigrationId = () => crypto.randomUUID();

export const useDraftStore = create<DraftState>()(
  devtools(
    persist(
      (set, get) => ({
        migrationId: newMigrationId(),
        items: [],
        add: (item) => {
          const { items } = get();
          if (items.some((entry) => entry.kind === item.kind && entry.slug === item.slug))
            return 'duplicate';
          if (items.length >= DRAFT_LIMIT) return 'limit';
          set({ items: [...items, item] }, false, 'borrador/agregar');
          return 'added';
        },
        remove: (kind, slug) =>
          set(
            (state) => ({
              items: state.items.filter((entry) => !(entry.kind === kind && entry.slug === slug)),
            }),
            false,
            'borrador/quitar',
          ),
        clear: () => set({ items: [], migrationId: newMigrationId() }, false, 'borrador/vaciar'),
      }),
      {
        name: DRAFT_STORAGE_KEY,
        // En el servidor no hay navegador: sin almacenamiento, el store arranca vacío y no lo toca.
        storage: createJSONStorage(() => {
          if (typeof window === 'undefined') throw new Error('sin navegador');
          return window.localStorage;
        }),
        partialize: (state) => ({ migrationId: state.migrationId, items: state.items }),
      },
    ),
    { name: 'Mi viaje · borrador', enabled: process.env.NODE_ENV !== 'production' },
  ),
);
