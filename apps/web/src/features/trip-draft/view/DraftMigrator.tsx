'use client';

import { useTranslations } from 'next-intl';
import {
  type MigrationAction,
  useDraftMigrationViewModel,
} from '../viewmodel/useDraftMigrationViewModel';

type Props = { locale: string; migrate: MigrationAction };

/** Migra el borrador al entrar (US5). Solo se ve mientras trabaja o si falla. */
export function DraftMigrator({ locale, migrate }: Props) {
  const t = useTranslations('trip');
  const { status } = useDraftMigrationViewModel(locale, t('list.draftName'), migrate);
  return (
    <p role="status" aria-live="polite" className="text-sm text-muted">
      {status === 'migrating'
        ? t('list.migrating')
        : status === 'error'
          ? t('errors.no-disponible')
          : null}
    </p>
  );
}
