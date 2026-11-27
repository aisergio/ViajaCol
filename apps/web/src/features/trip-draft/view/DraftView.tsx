'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';
import { Link } from '@/i18n/navigation';
import { useDraftStore } from '../model/draftStore';

const KIND_PATH = {
  sitio: '/sitios',
  fiesta: '/fiestas',
  plato: '/platos',
  experiencia: '/experiencias',
} as const;

const subscribeHydration = (onChange: () => void) =>
  useDraftStore.persist.onFinishHydration(onChange);

/** Borrador sin cuenta (US5): lo agregado desde las fichas, guardado en este navegador. */
export function DraftView({ signInHref }: { signInHref: string }) {
  const t = useTranslations('trip');
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => useDraftStore.persist.hasHydrated(),
    () => false,
  );
  const items = useDraftStore((state) => state.items);
  const remove = useDraftStore((state) => state.remove);

  return (
    <section aria-labelledby="borrador" className="mt-10 rounded-lg border border-line p-6">
      <h2 id="borrador" className="font-display text-2xl font-bold">
        {t('draft.title')}
      </h2>
      <p className="mt-2 text-muted">{t('draft.intro')}</p>
      {hydrated && items.length === 0 ? <p className="mt-4">{t('draft.empty')}</p> : null}
      {items.length > 0 ? (
        <ul className="mt-4 divide-y divide-line">
          {items.map((item) => (
            <li
              key={`${item.kind}-${item.slug}`}
              className="flex items-center justify-between gap-3 py-3"
            >
              <span>
                <span className="text-xs font-semibold tracking-wide text-link uppercase">
                  {t(`kinds.${item.kind}`)}
                </span>
                <Link
                  href={`${KIND_PATH[item.kind]}/${item.slug}`}
                  className="block font-semibold hover:underline"
                >
                  {item.title}
                </Link>
              </span>
              <button
                type="button"
                onClick={() => remove(item.kind, item.slug)}
                aria-label={t('draft.remove', { name: item.title })}
                className="inline-flex size-11 items-center justify-center rounded-md border border-line hover:bg-surface"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <a
        href={signInHref}
        className="mt-6 inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-semibold text-primary-foreground"
      >
        {t('draft.signIn')}
      </a>
    </section>
  );
}
