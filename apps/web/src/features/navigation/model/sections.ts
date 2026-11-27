export type SectionId =
  'sitios' | 'fiestas' | 'platos' | 'experiencias' | 'regiones' | 'noticias' | 'miViaje' | 'guias';

export type Section = {
  id: SectionId;
  /** Ruta sin idioma; el prefijo `/en` lo agrega la navegación de next-intl. */
  href: `/${string}`;
  status: 'active' | 'soon';
};

/** Secciones de la navegación principal. La portada se abre con el logo; Guías llega en la E3. */
export const SECTIONS: readonly Section[] = [
  { id: 'sitios', href: '/sitios', status: 'active' },
  { id: 'fiestas', href: '/fiestas', status: 'active' },
  { id: 'platos', href: '/platos', status: 'active' },
  { id: 'experiencias', href: '/experiencias', status: 'active' },
  { id: 'regiones', href: '/regiones', status: 'active' },
  { id: 'noticias', href: '/noticias', status: 'active' },
  { id: 'miViaje', href: '/mi-viaje', status: 'active' },
  { id: 'guias', href: '/guias', status: 'soon' },
];

/** Sección activa derivada de la ruta (estado derivado: nadie lo cambia directamente). */
export function findActiveSection(pathname: string): SectionId | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  for (const section of SECTIONS) {
    if (section.status !== 'active') continue;
    if (path === section.href || path.startsWith(`${section.href}/`)) return section.id;
  }
  return null;
}
