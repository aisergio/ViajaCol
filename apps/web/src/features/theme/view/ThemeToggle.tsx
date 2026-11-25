'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useThemeViewModel } from '../viewmodel/useThemeViewModel';

const ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

export function ThemeToggle() {
  const t = useTranslations('theme');
  const { mode, nextMode, cycle } = useThemeViewModel();
  const Icon = ICONS[mode];
  const label = t('toggle', { current: t(mode), next: t(nextMode) });

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={label}
      title={label}
      className="inline-flex size-11 items-center justify-center rounded-md border border-line hover:bg-surface"
    >
      <Icon aria-hidden="true" className="size-5" />
    </button>
  );
}
