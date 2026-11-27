'use client';

import { Copy, Link2Off, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

type Props = {
  shareId: string | null;
  /** Dirección absoluta hasta `/viaje/` en el idioma de la página. */
  shareBase: string;
  pending: boolean;
  onShare: () => void;
  onUnshare: () => void;
};

/** Enlace de solo lectura (US6): crear, copiar y revocar. */
export function SharePanel({ shareId, shareBase, pending, onShare, onUnshare }: Props) {
  const t = useTranslations('trip.share');
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle');
  const url = shareId ? `${shareBase}${shareId}` : null;

  const copyLink = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopy('copied');
    } catch {
      setCopy('failed');
    }
  };

  return (
    <section aria-labelledby="compartir" className="rounded-lg border border-line p-5">
      <h2 id="compartir" className="font-display text-xl font-bold">
        {t('title')}
      </h2>
      <p className="mt-2 text-sm text-muted">{t('intro')}</p>
      {url ? (
        <div className="mt-4 space-y-3">
          <label htmlFor="enlace-compartido" className="block font-semibold">
            {t('link')}
          </label>
          <input
            id="enlace-compartido"
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
            className="block min-h-11 w-full rounded-md border border-line bg-surface px-3 text-sm"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void copyLink()}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 font-semibold text-primary-foreground hover:opacity-90"
            >
              <Copy aria-hidden="true" className="size-4" />
              {t('copy')}
            </button>
            <button
              type="button"
              onClick={onUnshare}
              disabled={pending}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-4 font-semibold hover:bg-surface disabled:opacity-60"
            >
              <Link2Off aria-hidden="true" className="size-4" />
              {t('revoke')}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onShare}
          disabled={pending}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          <Share2 aria-hidden="true" className="size-4" />
          {t('create')}
        </button>
      )}
      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm font-semibold">
        {copy === 'copied' ? t('copied') : copy === 'failed' ? t('copyFailed') : null}
      </p>
    </section>
  );
}
