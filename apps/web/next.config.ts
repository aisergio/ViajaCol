import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  basePath: '/ViajaCol',
  // La salida standalone (para Lambda) se genera en CI sobre Linux; en Windows requiere enlaces
  // simbólicos con modo desarrollador. Se activa con NEXT_OUTPUT=standalone.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  reactCompiler: true,
  poweredByHeader: false,
  transpilePackages: ['@viajacol/ui', '@viajacol/i18n'],
};

export default withNextIntl(nextConfig);
