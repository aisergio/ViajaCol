import type { ReactNode } from 'react';

/**
 * Layout raíz mínimo: el documento (`<html>`, `<body>`) lo define `[locale]/layout.tsx`.
 * Se necesita porque existe `app/not-found.tsx` para rutas fuera de un idioma.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
