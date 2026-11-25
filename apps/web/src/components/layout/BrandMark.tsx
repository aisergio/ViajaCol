/** Isotipo: círculo con los tres colores de la bandera. Decorativo (el texto de la marca lo acompaña). */
export function BrandMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="size-8 shrink-0">
      <clipPath id="vc-brand-clip">
        <circle cx="16" cy="16" r="15" />
      </clipPath>
      <g clipPath="url(#vc-brand-clip)">
        <rect width="32" height="16" fill="var(--vc-flag-yellow)" />
        <rect y="16" width="32" height="8" fill="var(--vc-flag-blue)" />
        <rect y="24" width="32" height="8" fill="var(--vc-flag-red)" />
      </g>
      <circle cx="16" cy="16" r="15" fill="none" stroke="currentColor" strokeOpacity="0.15" />
    </svg>
  );
}
