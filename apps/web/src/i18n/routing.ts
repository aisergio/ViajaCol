import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  // Español sin prefijo y `/en` para inglés (contrato de la Entrega 1).
  localePrefix: 'as-needed',
  // Direcciones fijas para que la CDN pueda cachearlas: no se redirige según el navegador.
  localeDetection: false,
});
