import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SectionIntro } from '@/components/layout/SectionIntro';
import { resolveLocale } from '@/i18n/locale';
import { buildAlternates } from '@/i18n/metadata';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'sections.platos' });
  return {
    title: t('title'),
    description: t('intro'),
    alternates: buildAlternates(locale, '/platos'),
  };
}

export default async function PlatosPage({ params }: Props) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('sections.platos');
  const tCommon = await getTranslations('common');
  return <SectionIntro title={t('title')} intro={t('intro')} badge={tCommon('inProgress')} />;
}
