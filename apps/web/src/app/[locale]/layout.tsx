import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SkipLink } from '@/components/layout/SkipLink';
import { TricolorStrip } from '@/components/layout/TricolorStrip';
import { ThemeScript } from '@/features/theme/view/ThemeScript';
import { htmlLang, resolveLocale } from '@/i18n/locale';
import { routing } from '@/i18n/routing';
import '@/styles/globals.css';

// `optional` con precarga (spec 004, D-11): Chrome espera hasta ~100 ms a la fuente precargada. Si
// llega, se usa desde el primer pintado; si no, la página sigue con la de respaldo, sin reacomodar el
// texto (CLS), y la fuente queda en caché para la próxima carga.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'optional' });
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'optional',
});

/** `modal` es el slot paralelo de las fichas en ventana (rutas interceptadas, spec 004). */
type Props = { children: ReactNode; modal: ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1a20' },
  ],
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    metadataBase: new URL('https://aisergio.dev'),
    title: { default: t('title'), template: `%s · ${t('siteName')}` },
    description: t('description'),
    applicationName: t('siteName'),
    openGraph: {
      type: 'website',
      siteName: t('siteName'),
      title: t('title'),
      description: t('description'),
      locale: locale === 'es' ? 'es_CO' : 'en_US',
    },
  };
}

export default async function LocaleLayout({ children, modal, params }: Props) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('common');

  return (
    <html
      lang={htmlLang(locale)}
      className={`${inter.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <NextIntlClientProvider>
          <SkipLink label={t('skipToContent')} />
          <TricolorStrip />
          <SiteHeader />
          {/* Cada página lleva su transición (PageTransition); el layout no se desmonta al navegar. */}
          <main id="contenido" tabIndex={-1} className="outline-none">
            {children}
          </main>
          <SiteFooter />
          {modal}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
