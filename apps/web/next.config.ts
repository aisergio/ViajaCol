import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  basePath: '/ViajaCol',
  // La salida standalone (para Lambda) se genera en CI sobre Linux; en Windows requiere enlaces
  // simbólicos con modo desarrollador. Se activa con NEXT_OUTPUT=standalone.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  // Commit compilado; lo devuelve /api/health para que la prueba de humo confirme la publicación.
  env: { APP_VERSION: process.env.APP_VERSION ?? 'dev' },
  reactCompiler: true,
  poweredByHeader: false,
  transpilePackages: ['@viajacol/ui', '@viajacol/i18n', '@viajacol/content'],
  // Fotos pregeneradas en S3 (spec 004, D-02): el cargador elige el archivo de cada ancho y Lambda
  // nunca procesa imágenes. Cada ancho del srcset corresponde a una variante real.
  images: {
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
    deviceSizes: [480, 960, 1600],
    imageSizes: [],
  },
  // sharp solo se usa en el build (imágenes de vista previa prerenderizadas): fuera del paquete de Lambda.
  outputFileTracingExcludes: {
    '*': ['node_modules/sharp/**', 'node_modules/@img/**'],
  },
  experimental: {
    // El CSS (unos 8 KB con gzip) va en el HTML: la página pinta sin esperar otra petición
    // (spec 004, D-11). La CSP ya admite estilos en línea (`style-src 'unsafe-inline'`).
    inlineCss: true,
  },
};

export default withNextIntl(nextConfig);
