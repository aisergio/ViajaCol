import type { DetailItem } from '@viajacol/content';
import { useLocale, useTranslations } from 'next-intl';
import { formatDate } from '@/lib/dates';

type Fact = { label: string; value: string | string[] };

/** Datos propios de cada categoría (US2): época, ingredientes, temporada, departamentos… */
export function FactList({ item }: { item: DetailItem }) {
  const t = useTranslations('catalog');
  const locale = useLocale();
  const facts: Fact[] = [];
  const add = (label: string, value: string | string[] | null | undefined) => {
    if (value && (!Array.isArray(value) || value.length > 0)) facts.push({ label, value });
  };

  add(t('facts.region'), item.regionName);
  switch (item.category) {
    case 'sitios':
      add(t('facts.place'), item.place);
      if (item.kind) add(t('facts.kind'), t(`siteKind.${item.kind as 'naturaleza'}`));
      break;
    case 'fiestas':
      add(t('facts.place'), item.place);
      add(t('facts.when'), item.when);
      if (item.unesco) add(t('facts.unesco'), t('facts.unescoValue'));
      break;
    case 'platos':
      add(t('facts.origin'), item.origin);
      if (item.kind) add(t('facts.kind'), t(`dishKind.${item.kind as 'sopa'}`));
      add(t('facts.ingredients'), item.ingredients);
      break;
    case 'experiencias':
      add(t('facts.place'), item.place);
      add(t('facts.season'), item.season);
      add(t('facts.duration'), item.duration);
      break;
    case 'regiones':
      add(t('facts.departments'), item.departments);
      break;
    case 'noticias':
      if (item.date) add(t('facts.date'), formatDate(item.date, locale));
      break;
  }

  return (
    <aside
      aria-labelledby={`datos-${item.slug}`}
      className="rounded-xl border border-line bg-surface p-5"
    >
      <h2 id={`datos-${item.slug}`} className="font-display text-lg font-bold">
        {t('facts.title')}
      </h2>
      <dl className="mt-3 space-y-3 text-sm">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt className="font-semibold text-muted">{fact.label}</dt>
            <dd className="mt-0.5 text-foreground">
              {Array.isArray(fact.value) ? (
                <ul className="list-inside list-disc">
                  {fact.value.map((value) => (
                    <li key={value}>{value}</li>
                  ))}
                </ul>
              ) : (
                fact.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
