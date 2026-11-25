'use client';

import { usePathname } from '@/i18n/navigation';
import { findActiveSection, SECTIONS, type Section } from '../model/sections';

export type NavItem = Section & { isActive: boolean; isDisabled: boolean };

/** ViewModel de la navegación: entrega a la vista los ítems listos para pintar. */
export function useNavigationViewModel(): { items: NavItem[]; activeId: string | null } {
  const pathname = usePathname();
  const activeId = findActiveSection(pathname);
  const items = SECTIONS.map((section) => ({
    ...section,
    isActive: section.id === activeId,
    isDisabled: section.status === 'soon',
  }));
  return { items, activeId };
}
