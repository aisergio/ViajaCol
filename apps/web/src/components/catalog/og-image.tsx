import { getDetail, type Category, type Locale } from '@viajacol/content';
import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';
import { join } from 'node:path';
import sharp from 'sharp';
import { OG_SIZE } from './og-path';

/**
 * Vista previa para redes (FR-009, D-07): JPEG de 1200 × 630 generado en el build por
 * `app/api/og/[category]/[locale]/[slug]/route.ts`.
 *
 * `next/og` dibuja solo la capa de texto, transparente, porque su renderizador no acepta WebP y su
 * PNG con foto pesaría más de 1 MB. Luego `sharp` la combina con la foto y la guarda en JPEG
 * (unos 100 KB). Las imágenes quedan prerenderizadas, así que `sharp` no viaja a Lambda
 * (`outputFileTracingExcludes` en next.config.ts).
 */
async function textLayer(eyebrow: string, name: string): Promise<Buffer> {
  const layer = new ImageResponse(
    <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1200,
          height: 630,
          display: 'flex',
          backgroundImage:
            'linear-gradient(180deg, rgba(14,26,32,0) 25%, rgba(14,26,32,0.55) 55%, rgba(14,26,32,0.95) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          bottom: 72,
          display: 'flex',
          flexDirection: 'column',
          color: '#ffffff',
        }}
      >
        <div style={{ fontSize: 30, color: '#FCD116', textTransform: 'uppercase' }}>{eyebrow}</div>
        <div style={{ fontSize: name.length > 32 ? 60 : 76, lineHeight: 1.05, marginTop: 12 }}>
          {name}
        </div>
        <div style={{ fontSize: 28, marginTop: 18, opacity: 0.9 }}>Viaja Colombia</div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: 1200,
          height: 16,
          display: 'flex',
        }}
      >
        <div style={{ width: 600, height: 16, background: '#FCD116' }} />
        <div style={{ width: 300, height: 16, background: '#003893' }} />
        <div style={{ width: 300, height: 16, background: '#CE1126' }} />
      </div>
    </div>,
    OG_SIZE,
  );
  return Buffer.from(await layer.arrayBuffer());
}

export async function renderOgImage(
  category: Category,
  locale: Locale,
  slug: string,
): Promise<Response> {
  const item = getDetail(category, slug, locale);
  if (!item) return new Response('Not Found', { status: 404 });
  const t = await getTranslations({ locale, namespace: 'catalog' });
  const eyebrow = [t(`category.${category}`), item.regionName].filter(Boolean).join(' · ');

  const base = item.photo
    ? sharp(join(process.cwd(), 'public', `${item.photo.src}-1600.webp`)).resize(
        OG_SIZE.width,
        OG_SIZE.height,
        { fit: 'cover' },
      )
    : sharp({ create: { ...OG_SIZE, channels: 3, background: '#0e1a20' } });
  const jpeg = await base
    .composite([{ input: await textLayer(eyebrow, item.name) }])
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();

  return new Response(new Uint8Array(jpeg), { headers: { 'Content-Type': 'image/jpeg' } });
}
