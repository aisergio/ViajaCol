import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { DeleteAccountForm } from '@/features/account/view/DeleteAccountForm';
import { ProfileForm } from '@/features/account/view/ProfileForm';
import { resolveLocale } from '@/i18n/locale';
import { getAccountServices } from '@/server/account-services';
import { ensureProfile } from '@/server/application/account/use-cases';
import { homeFor } from '@/server/auth/return-path';
import { getSessionUser } from '@/server/auth/session';
import { actualizarNombre, eliminarCuenta } from './actions';

type Props = { params: Promise<{ locale: string }> };

// Página privada: se genera en cada petición y Next.js la marca `no-store` (FR-013).
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'account.page' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

/** «Mi cuenta» (US3, US4, US5): exige sesión y muestra el perfil del usuario de la sesión. */
export default async function AccountPage({ params }: Props) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);

  const user = await getSessionUser();
  if (!user) {
    const prefix = locale === 'en' ? '/en' : '';
    redirect(`${prefix}/entrar?volver=${encodeURIComponent(`${homeFor(locale)}/cuenta`)}`);
  }

  const { users } = await getAccountServices();
  const profile = await ensureProfile(users, user);
  const t = await getTranslations('account.page');
  const format = await getFormatter();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">{t('title')}</h1>
      <p className="mt-4 text-lg text-muted">{t('intro')}</p>

      <section aria-labelledby="perfil" className="mt-10 rounded-lg border border-line p-6">
        <h2 id="perfil" className="font-display text-2xl font-bold">
          {t('profileTitle')}
        </h2>
        <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
          <dt className="font-semibold">{t('email')}</dt>
          <dd className="break-all">{user.email}</dd>
          <dt className="font-semibold">{t('memberSince')}</dt>
          <dd>{format.dateTime(new Date(profile.createdAt), { dateStyle: 'long' })}</dd>
        </dl>
        <div className="mt-6">
          <ProfileForm initialName={profile.displayName} action={actualizarNombre} />
        </div>
      </section>

      <section aria-labelledby="datos" className="mt-8 rounded-lg border border-line p-6">
        <h2 id="datos" className="font-display text-2xl font-bold">
          {t('privacyTitle')}
        </h2>
        <p className="mt-3">{t('privacy')}</p>
      </section>

      <section aria-labelledby="eliminar" className="mt-8 rounded-lg border border-line p-6">
        <h2 id="eliminar" className="font-display text-2xl font-bold">
          {t('deleteTitle')}
        </h2>
        <p className="mt-3 mb-4">{t('deleteIntro')}</p>
        <DeleteAccountForm action={eliminarCuenta.bind(null, locale)} />
      </section>
    </div>
  );
}
