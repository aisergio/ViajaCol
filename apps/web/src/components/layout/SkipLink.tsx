/** Primer elemento enfocable: lleva al contenido principal (WCAG 2.4.1). */
export function SkipLink({ label }: { label: string }) {
  return (
    <a
      href="#contenido"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:font-semibold focus:text-primary-foreground"
    >
      {label}
    </a>
  );
}
