'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState, type ComponentType } from 'react';
import type { SearchComboboxProps } from './SearchCombobox';

type Combobox = ComponentType<SearchComboboxProps>;

/** El combobox (Base UI) y su ViewModel van en un fragmento aparte. La descarga se comparte. */
let pending: Promise<Combobox> | null = null;
function loadCombobox(): Promise<Combobox> {
  pending ??= import('./SearchCombobox').then((module) => module.SearchCombobox);
  return pending;
}

/**
 * Buscador del encabezado en dos tiempos (D-05, D-11). Primero es un campo simple, con el mismo
 * aspecto y el mismo nombre accesible, que no suma Base UI a la carga de cada página. Al acercar el
 * puntero, enfocarlo o escribir, se descarga el combobox, que lo reemplaza con el texto y el foco.
 */
export function SearchBox() {
  const t = useTranslations('search');
  const id = useId();
  const [Loaded, setLoaded] = useState<Combobox | null>(null);
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);

  const prepare = () => {
    if (!Loaded) loadCombobox().then((component) => setLoaded(() => component));
  };

  if (Loaded) return <Loaded initialQuery={draft} autoFocus={focused} />;
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {t('label')}
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
        />
        <input
          id={id}
          // ARIA 1.2 exige aria-controls solo con la lista abierta, y esta aún no existe.
          // eslint-disable-next-line jsx-a11y/role-has-required-aria-props
          role="combobox"
          aria-expanded="false"
          aria-autocomplete="list"
          autoComplete="off"
          value={draft}
          placeholder={t('placeholder')}
          onPointerEnter={prepare}
          onFocus={() => {
            setFocused(true);
            prepare();
          }}
          onBlur={() => setFocused(false)}
          onChange={(event) => {
            setDraft(event.target.value);
            prepare();
          }}
          className="h-11 w-full min-w-0 rounded-full border border-line bg-surface pr-3 pl-9 text-sm text-foreground placeholder:text-muted focus:border-primary"
        />
      </div>
    </>
  );
}
