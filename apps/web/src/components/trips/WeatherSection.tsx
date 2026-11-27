import { getTranslations } from 'next-intl/server';
import { formatTripDay, monthName } from '@/lib/dates';
import type { TripWeather } from '@/server/trips/weather';

type Props = { weather: TripWeather; locale: 'es' | 'en' };

/** Clima del viaje (US7, escenario 3): pronóstico por día o clima típico del mes, con su fuente. */
export async function WeatherSection({ weather, locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'trip.context' });

  return (
    <section aria-labelledby="clima-viaje" className="rounded-lg border border-line p-5">
      <h2 id="clima-viaje" className="font-display text-xl font-bold">
        {t('weather')}
      </h2>
      <ul className="mt-3 space-y-3">
        {weather.mode === 'forecast'
          ? weather.days.map((day) => (
              <li key={day.date}>
                <span className="block font-semibold">
                  {formatTripDay(day.date, locale)} · {t('forecast', { place: day.place })}
                </span>
                <span className="text-sm">
                  {t('temps', { max: day.max, min: day.min })}
                  {day.rain === null ? '' : ` · ${t('rain', { value: day.rain })}`}
                </span>
              </li>
            ))
          : weather.months.map((month) => (
              <li key={month.month}>
                <span className="block font-semibold">
                  {t('typical', { month: monthName(month.month, locale), place: month.place })}
                </span>
                <span className="text-sm">
                  {t('temps', { max: month.max, min: month.min })} ·{' '}
                  {t('rainyDays', { value: month.rainyDays })}
                </span>
              </li>
            ))}
      </ul>
      <p className="mt-3 text-xs text-muted">
        {t.rich('weatherCredit', {
          link: (chunks) => (
            <a href="https://open-meteo.com/" className="underline" rel="noopener">
              {chunks}
            </a>
          ),
        })}
      </p>
    </section>
  );
}
