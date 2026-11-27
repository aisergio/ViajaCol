import { UserRound } from 'lucide-react';

export const ACCOUNT_BUTTON =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line px-3 text-sm font-semibold hover:bg-surface';

type Props = { href: string; label: string; busy?: boolean };

/** «Entrar»: un enlace normal a la ruta de inicio de sesión, que funciona sin JavaScript. */
export function SignInLink({ href, label, busy = false }: Props) {
  return (
    <a href={href} className={ACCOUNT_BUTTON} aria-busy={busy || undefined}>
      <UserRound aria-hidden="true" className="size-5" />
      <span className="sr-only sm:not-sr-only">{label}</span>
    </a>
  );
}
