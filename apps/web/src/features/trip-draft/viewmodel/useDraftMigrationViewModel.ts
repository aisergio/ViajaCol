'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { type DraftItem, useDraftStore } from '../model/draftStore';

export type MigrationAction = (
  language: string,
  input: { migrationId: string; items: Pick<DraftItem, 'kind' | 'slug'>[] },
  name: string,
) => Promise<
  { ok: true; trip: { tripId: string; name: string } | null } | { ok: false; error: string }
>;

/**
 * Con sesión, convierte el borrador local en un viaje una sola vez (US5). Si el servidor lo crea,
 * vacía el borrador y recarga la lista. Un error deja el borrador intacto para otro intento.
 * El estado «migrando» se deriva del borrador: hay elementos y la migración no ha fallado.
 */
export function useDraftMigrationViewModel(
  locale: string,
  draftName: string,
  migrate: MigrationAction,
) {
  const router = useRouter();
  const started = useRef(false);
  const [failed, setFailed] = useState(false);
  const pendingItems = useDraftStore((state) => state.items.length);

  useEffect(() => {
    const start = (state: { migrationId: string; items: DraftItem[] }) => {
      if (started.current || state.items.length === 0) return;
      started.current = true;
      const items = state.items.map(({ kind, slug }) => ({ kind, slug }));
      void migrate(locale, { migrationId: state.migrationId, items }, draftName).then((result) => {
        if (!result.ok) {
          setFailed(true);
          return;
        }
        useDraftStore.getState().clear();
        router.refresh();
      });
    };
    const unsubscribe = useDraftStore.persist.onFinishHydration(start);
    if (useDraftStore.persist.hasHydrated()) start(useDraftStore.getState());
    return unsubscribe;
  }, [locale, draftName, migrate, router]);

  return {
    status: failed
      ? ('error' as const)
      : pendingItems > 0
        ? ('migrating' as const)
        : ('idle' as const),
  };
}
