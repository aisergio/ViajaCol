/**
 * Fotos del catálogo desde Wikimedia Commons (spec 004, contrato `contracts/media.md`).
 *
 *   node scripts/content/fetch-commons-images.ts candidates [categoria]   hojas de contacto en .build/content/
 *   node scripts/content/fetch-commons-images.ts download [categoria] [--force]
 *                                                                         variantes WebP + data/media.json
 *   node scripts/content/fetch-commons-images.ts check                    manifiesto y archivos coherentes
 *
 * `download` salta las fotos que ya están; `--force` las vuelve a generar (p. ej., si cambia el
 * presupuesto de peso).
 *
 * Reglas de Wikimedia: User-Agent descriptivo sin datos personales, una petición a la vez con pausa,
 * miniaturas de anchos estándar y sin credenciales. Solo se aceptan licencias libres con atribución.
 * Se ejecuta con Node 22.6+ (tipos eliminados en tiempo de carga, sin dependencias de TypeScript).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA = join(ROOT, 'packages', 'content', 'data');
const PUBLIC_MEDIA = join(ROOT, 'apps', 'web', 'public', 'media');
const OUT = join(ROOT, '.build', 'content');
const API = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'ViajaColBot/1.0 (+https://github.com/aisergio/ViajaCol; academic project)';
const CATEGORIES = ['regiones', 'sitios', 'fiestas', 'platos', 'experiencias', 'noticias'];
const WIDTHS = [1600, 960, 480];
/**
 * Peso máximo por variante. La de 960 es la que baja la foto principal de una ficha en un móvil
 * (412 px × 1,75), y SC-007 le pone un tope de 150 KB: el presupuesto deja margen.
 */
const BUDGET_KB: Record<number, number> = { 1600: 350, 960: 140, 480: 50 };
/** Calidad WebP: se baja de a 5 desde 75 hasta que la variante cabe en su presupuesto, sin pasar de 40. */
const QUALITY = { start: 75, min: 40, step: 5 };
const THUMB_REQUEST = 1920;
/** Ancho mínimo del original. Si no llega a 1600, la variante «1600» queda con el ancho original. */
const MIN_WIDTH = 1200;
const PAUSE_MS = 250;
const ALLOWED_LICENSE = /^(cc0|public domain|pd\b|cc by(-sa)? [234]\.[05]?)/i;
const EXCLUDED_TITLE = /logo|mapa|map\b|escudo|coat of arms|bandera|flag|diagram|\.svg$/i;

type Entry = { slug: string; photo?: string; photoQuery?: string; es?: { name?: string } };
type MediaEntry = {
  file: string;
  page: string;
  author: string;
  license: string;
  licenseUrl: string;
  hash: string;
  width: number;
  height: number;
  blur: string;
};
type ImageInfo = {
  url: string;
  thumburl?: string;
  descriptionurl: string;
  width: number;
  height: number;
  mime: string;
  extmetadata?: Record<string, { value: string } | undefined>;
};
type Page = { title: string; imageinfo?: ImageInfo[] };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(url: string, attempt = 1): Promise<Response> {
  await sleep(PAUSE_MS);
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if ((response.status === 429 || response.status >= 500) && attempt < 5) {
    const wait = Number(response.headers.get('retry-after')) * 1000 || attempt * 3000;
    console.warn(`  ${response.status}, reintento en ${wait} ms`);
    await sleep(wait);
    return request(url, attempt + 1);
  }
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} · ${url}`);
  return response;
}

async function api(params: Record<string, string>): Promise<{ query?: { pages?: Page[] } }> {
  const query = new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  return (await request(`${API}?${query}`)).json() as Promise<{ query?: { pages?: Page[] } }>;
}

function readCategory(category: string): Entry[] {
  return JSON.parse(readFileSync(join(DATA, `${category}.json`), 'utf8')) as Entry[];
}

function readMedia(): Record<string, MediaEntry> {
  const file = join(DATA, 'media.json');
  return existsSync(file)
    ? (JSON.parse(readFileSync(file, 'utf8')) as Record<string, MediaEntry>)
    : {};
}

function writeMedia(media: Record<string, MediaEntry>): void {
  const sorted = Object.fromEntries(Object.entries(media).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(join(DATA, 'media.json'), `${JSON.stringify(sorted, null, 2)}\n`);
}

function meta(info: ImageInfo, key: string): string {
  return info.extmetadata?.[key]?.value ?? '';
}

/** Texto plano desde el HTML de Commons (autor y descripción). */
function plain(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function categoriesFrom(arg: string | undefined): string[] {
  if (!arg) return CATEGORIES;
  if (!CATEGORIES.includes(arg)) throw new Error(`Categoría desconocida: ${arg}`);
  return [arg];
}

function acceptable(page: Page): ImageInfo | null {
  const info = page.imageinfo?.[0];
  if (!info || EXCLUDED_TITLE.test(page.title)) return null;
  if (!/^image\/(jpeg|png|tiff)$/.test(info.mime)) return null;
  const ratio = info.width / info.height;
  if (info.width < MIN_WIDTH || ratio < 1.2 || ratio > 2.4) return null;
  return ALLOWED_LICENSE.test(meta(info, 'LicenseShortName')) ? info : null;
}

const escapeXml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const CANDIDATES_PER_ENTRY = 4;
const ROWS_PER_SHEET = 8;

/** Hojas de contacto de 8 filas: una fila por ficha, con su slug y hasta cuatro candidatas numeradas. */
async function contactSheets(
  category: string,
  rows: Array<{ slug: string; candidates: Array<{ thumb: Buffer; label: string }> }>,
): Promise<string[]> {
  const files: string[] = [];
  for (let start = 0; start < rows.length; start += ROWS_PER_SHEET) {
    const page = rows.slice(start, start + ROWS_PER_SHEET);
    const file = join(OUT, `candidates-${category}-${start / ROWS_PER_SHEET + 1}.png`);
    await contactSheet(file, page, start);
    files.push(file);
  }
  return files;
}

async function contactSheet(
  file: string,
  rows: Array<{ slug: string; candidates: Array<{ thumb: Buffer; label: string }> }>,
  offset: number,
): Promise<void> {
  const cell = { w: 300, h: 200 };
  const labelW = 230;
  const width = labelW + CANDIDATES_PER_ENTRY * (cell.w + 8);
  const height = rows.length * (cell.h + 34) + 10;
  const composites: sharp.OverlayOptions[] = [];
  rows.forEach((row, r) => {
    const y = 10 + r * (cell.h + 34);
    composites.push({
      input: Buffer.from(
        `<svg width="${labelW}" height="${cell.h}"><text x="8" y="28" font-family="Arial" font-size="17" font-weight="bold" fill="#0e1a20">${escapeXml(`${offset + r + 1}. ${row.slug}`)}</text></svg>`,
      ),
      left: 0,
      top: y,
    });
    row.candidates.forEach((candidate, c) => {
      const left = labelW + c * (cell.w + 8);
      composites.push({ input: candidate.thumb, left, top: y });
      composites.push({
        input: Buffer.from(
          `<svg width="${cell.w}" height="30"><text x="2" y="20" font-family="Arial" font-size="15" fill="#0e1a20">${escapeXml(candidate.label)}</text></svg>`,
        ),
        left,
        top: y + cell.h + 2,
      });
    });
  });
  await sharp({ create: { width, height, channels: 3, background: '#ffffff' } })
    .composite(composites)
    .png()
    .toFile(file);
}

async function candidates(arg?: string): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  for (const category of categoriesFrom(arg)) {
    const pending = readCategory(category).filter((entry) => !entry.photo);
    if (pending.length === 0) continue;
    console.log(`${category}: ${pending.length} fichas sin foto`);
    const found: Record<string, Array<Record<string, string | number>>> = {};
    const rows: Array<{ slug: string; candidates: Array<{ thumb: Buffer; label: string }> }> = [];
    for (const entry of pending) {
      const query = entry.photoQuery ?? entry.es?.name ?? entry.slug.replace(/-/g, ' ');
      const result = await api({
        action: 'query',
        generator: 'search',
        gsrnamespace: '6',
        gsrlimit: '30',
        gsrsearch: `${query} filemime:image/jpeg filew:>${MIN_WIDTH - 1}`,
        prop: 'imageinfo',
        iiprop: 'url|size|mime|extmetadata',
        iiurlwidth: '330',
        iiextmetadatafilter: 'LicenseShortName|Artist',
      });
      const pages = (result.query?.pages ?? [])
        .map((page) => ({ page, info: acceptable(page) }))
        .filter((item): item is { page: Page; info: ImageInfo } => item.info !== null)
        .slice(0, CANDIDATES_PER_ENTRY);
      found[entry.slug] = pages.map(({ page, info }) => ({
        title: page.title,
        width: info.width,
        height: info.height,
        license: meta(info, 'LicenseShortName'),
        author: plain(meta(info, 'Artist')).slice(0, 80),
      }));
      const thumbs = [];
      for (const [i, { info }] of pages.entries()) {
        const bytes = Buffer.from(await (await request(info.thumburl ?? info.url)).arrayBuffer());
        const thumb = await sharp(bytes).resize(300, 200, { fit: 'cover' }).png().toBuffer();
        thumbs.push({ thumb, label: `#${i + 1} ${meta(info, 'LicenseShortName')}` });
      }
      rows.push({ slug: entry.slug, candidates: thumbs });
      console.log(`  ${entry.slug}: ${pages.length} candidatas («${query}»)`);
    }
    writeFileSync(join(OUT, `candidates-${category}.json`), `${JSON.stringify(found, null, 2)}\n`);
    for (const file of await contactSheets(category, rows)) console.log(`  hoja: ${file}`);
  }
}

type Variant = { data: Buffer; width: number; height: number; quality: number };

/** Codifica una variante con la mejor calidad que cabe en su presupuesto de peso. */
async function encode(source: Buffer, width: number): Promise<Variant> {
  for (let quality = QUALITY.start; ; quality -= QUALITY.step) {
    const { data, info } = await sharp(source)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, effort: 5 })
      .toBuffer({ resolveWithObject: true });
    const fits = data.byteLength <= BUDGET_KB[width]! * 1024;
    if (fits || quality - QUALITY.step < QUALITY.min) {
      if (!fits)
        console.warn(`  aviso: ${width} px sigue en ${(data.byteLength / 1024).toFixed(0)} KB`);
      return { data, width: info.width, height: info.height, quality };
    }
  }
}

async function download(arg?: string, force = false): Promise<void> {
  const media = readMedia();
  for (const category of categoriesFrom(arg)) {
    for (const entry of readCategory(category)) {
      if (!entry.photo) continue;
      const key = `${category}/${entry.slug}`;
      const current = media[key];
      const filesOk =
        current &&
        WIDTHS.every((w) => existsSync(join(PUBLIC_MEDIA, `${key}-${current.hash}-${w}.webp`)));
      if (!force && current?.file === entry.photo && filesOk) continue;

      const result = await api({
        action: 'query',
        titles: entry.photo,
        prop: 'imageinfo',
        iiprop: 'url|size|mime|extmetadata',
        iiurlwidth: String(THUMB_REQUEST),
        iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|Credit',
      });
      const page = result.query?.pages?.[0];
      const info = page?.imageinfo?.[0];
      if (!info) throw new Error(`${key}: no existe ${entry.photo}`);
      const license = meta(info, 'LicenseShortName');
      if (!ALLOWED_LICENSE.test(license))
        throw new Error(`${key}: licencia no permitida (${license})`);
      if (info.width < MIN_WIDTH) throw new Error(`${key}: ${info.width} px (mínimo ${MIN_WIDTH})`);

      const source = Buffer.from(await (await request(info.thumburl ?? info.url)).arrayBuffer());
      const variants = new Map<number, Variant>();
      for (const width of WIDTHS) variants.set(width, await encode(source, width));
      const large = variants.get(1600)!;
      // El hash cubre las tres variantes: si cambia cualquiera, cambia la dirección (caché inmutable).
      const digest = createHash('sha256');
      for (const width of WIDTHS) digest.update(variants.get(width)!.data);
      const hash = digest.digest('hex').slice(0, 8);
      const blur = await sharp(source)
        .rotate()
        .resize({ width: 16 })
        .webp({ quality: 40 })
        .toBuffer();

      const dir = join(PUBLIC_MEDIA, category);
      mkdirSync(dir, { recursive: true });
      for (const old of readdirSync(dir).filter((name) => name.startsWith(`${entry.slug}-`))) {
        if (/^[0-9a-f]{8}-\d+\.webp$/.test(old.slice(entry.slug.length + 1)))
          rmSync(join(dir, old));
      }
      for (const [width, variant] of variants) {
        writeFileSync(join(dir, `${entry.slug}-${hash}-${width}.webp`), variant.data);
      }
      media[key] = {
        file: entry.photo,
        page: info.descriptionurl,
        author: plain(meta(info, 'Artist')) || plain(meta(info, 'Credit')) || 'Desconocido',
        license,
        licenseUrl: meta(info, 'LicenseUrl'),
        hash,
        width: large.width,
        height: large.height,
        blur: `data:image/webp;base64,${blur.toString('base64')}`,
      };
      writeMedia(media);
      const sizes = WIDTHS.map((width) => {
        const variant = variants.get(width)!;
        return `${width}: ${(variant.data.byteLength / 1024).toFixed(0)} KB q${variant.quality}`;
      });
      console.log(`${key}: ${large.width}×${large.height}, ${sizes.join(' · ')}, ${license}`);
    }
  }
}

function check(): void {
  const media = readMedia();
  const problems: string[] = [];
  const expected = new Set<string>();
  for (const category of CATEGORIES) {
    for (const entry of readCategory(category)) {
      const key = `${category}/${entry.slug}`;
      if (!entry.photo) problems.push(`${key}: sin foto elegida`);
      else if (media[key]?.file !== entry.photo) problems.push(`${key}: falta descargar`);
    }
  }
  for (const [key, entry] of Object.entries(media)) {
    for (const width of WIDTHS) {
      const file = join(PUBLIC_MEDIA, `${key}-${entry.hash}-${width}.webp`);
      expected.add(file);
      if (!existsSync(file)) problems.push(`${key}: falta ${width}`);
    }
  }
  for (const category of CATEGORIES) {
    const dir = join(PUBLIC_MEDIA, category);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!expected.has(join(dir, name))) problems.push(`sobra ${category}/${name}`);
    }
  }
  console.log(problems.length ? problems.join('\n') : 'Todo en orden.');
  if (problems.length) process.exitCode = 1;
}

const [mode, ...rest] = process.argv.slice(2);
const arg = rest.find((value) => !value.startsWith('--'));
if (mode === 'candidates') await candidates(arg);
else if (mode === 'download') await download(arg, rest.includes('--force'));
else if (mode === 'check') check();
else {
  console.error('Uso: fetch-commons-images.ts candidates|download|check [categoria] [--force]');
  process.exitCode = 2;
}
