'use client';

import { cn } from '@viajacol/ui';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useNavigationViewModel } from '../viewmodel/useNavigationViewModel';

type Props = { className?: string; orientation?: 'horizontal' | 'vertical'; id?: string };

export function MainNav({ className, orientation = 'horizontal', id }: Props) {
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');
  const { items } = useNavigationViewModel();

  return (
    <nav aria-label={t('label')} className={className} id={id}>
      <ul className={cn('flex gap-1', orientation === 'vertical' ? 'flex-col' : 'items-center')}>
        {items.map((item) => (
          <li key={item.id}>
            {item.isDisabled ? (
              <span
                aria-disabled="true"
                className="inline-flex min-h-11 items-center gap-2 px-3 text-sm text-muted"
              >
                {t(item.id)}
                <span className="rounded-sm bg-surface px-1.5 py-0.5 text-xs font-medium">
                  {tCommon('comingSoon')}
                </span>
              </span>
            ) : (
              <Link
                href={item.href}
                aria-current={item.isActive ? 'page' : undefined}
                className={cn(
                  'relative inline-flex min-h-11 items-center px-3 text-sm font-semibold transition-colors hover:text-primary',
                  item.isActive
                    ? 'text-primary after:absolute after:inset-x-3 after:bottom-1.5 after:h-0.5 after:rounded-full after:bg-primary'
                    : 'text-foreground',
                )}
              >
                {t(item.id)}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
