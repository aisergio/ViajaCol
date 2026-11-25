export type SectionId = 'noticias' | 'sitios' | 'fiestas' | 'platos' | 'guias';

export type Section = {
  id: SectionId;
  /** Ruta sin idioma; el prefijo `/en` lo agrega la navegación de next-intl. */
  href: '/' | `/${string}`;
  status: 'active' | 'soon';
};

/** Secciones de la navegación principal (Guías llega en la Entrega 3). */
export const SECTIONS: readonly Section[] = [
  { id: 'noticias', href: '/', status: 'active' },
  { id: 'sitios', href: '/sitios', status: 'active' },
  { id: 'fiestas', href: '/fiestas', status: 'active' },
  { id: 'platos', href: '/platos', status: 'active' },
  { id: 'guias', href: '/guias', status: 'soon' },
];

/** Sección activa derivada de la ruta (estado derivado: nadie lo cambia directamente). */
export function findActiveSection(pathname: string): SectionId | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  for (const section of SECTIONS) {
    if (section.status !== 'active') continue;
    if (section.href === '/') {
      if (path === '/') return section.id;
      continue;
    }
    if (path === section.href || path.startsWith(`${section.href}/`)) return section.id;
  }
  return null;
}
