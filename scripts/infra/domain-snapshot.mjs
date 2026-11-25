#!/usr/bin/env node
// Foto de las respuestas del dominio para SC-002 (spec 003): la raíz y los demás proyectos no deben
// cambiar al activar las rutas del Worker.
//
// Uso:
//   node scripts/infra/domain-snapshot.mjs snapshot <salida.json> [origen]
//   node scripts/infra/domain-snapshot.mjs compare <antes.json> <despues.json>
//
// La foto toma rutas fijas y las rutas del mismo dominio que enlaza la portada. Para cada una guarda
// el estado, las cabeceras estables y el SHA-256 del cuerpo (crudo y sin `nonce`). Las rutas bajo
// BASE_PATH cambian a propósito y se informan aparte.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const BASE_PATH = '/ViajaCol';
const FIXED_PATHS = [
  '/',
  '/robots.txt',
  '/sitemap.xml',
  '/favicon.ico',
  '/no-existe-sc002',
  // Otros proyectos del dominio, con sus propias rutas de Workers.
  '/PlanEstudio',
  '/PlanEstudio/',
  '/MediPoli',
  '/MediPoli/',
  '/ViajaColombia',
  '/viajacolombia',
  '/ViajaCol',
  '/viajacol',
];
const MAX_DISCOVERED = 25;
// Cloudflare espera unos 20 s antes de responder 522 cuando el origen de la raíz no contesta.
const TIMEOUT_MS = 30_000;
// Cambian en cada petición o dependen del estado de las cachés (Cloudflare y CloudFront).
const VOLATILE_HEADERS = new Set([
  'age',
  'alt-svc',
  'cf-cache-status',
  'cf-ray',
  'date',
  'expires',
  'nel',
  'report-to',
  'server-timing',
  'set-cookie',
  'via',
  'x-amz-cf-id',
  'x-amz-cf-pop',
  'x-cache',
]);

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
// Quita lo que cambia en cada petición: los `nonce` y, en las páginas de error de Cloudflare, el
// Ray ID, la hora y la IP del visitante (la foto guarda solo hashes, nunca la IP).
const normalize = (text) =>
  text
    .replace(/nonce="[^"]*"/g, 'nonce=""')
    .replace(/\b[0-9a-f]{16}\b/g, 'RAY')
    .replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC/g, 'FECHA')
    .replace(/(id="cf-footer-ip"[^>]*>)[^<]*/g, '$1IP');
const isOwnPath = (path) => path.toLowerCase().startsWith(BASE_PATH.toLowerCase());

async function probe(origin, path) {
  const res = await fetch(new URL(path, origin), {
    redirect: 'manual',
    headers: { 'user-agent': 'viajacol-sc002/1.0', accept: '*/*' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const headers = {};
  for (const [name, value] of res.headers) {
    if (!VOLATILE_HEADERS.has(name)) headers[name] = value;
  }
  let body;
  try {
    body = Buffer.from(await res.arrayBuffer());
  } catch {
    // Respuestas que no terminan (por ejemplo, flujos SSE): basta con el estado y las cabeceras.
    return { status: res.status, headers, bytes: null, sha256: 'stream', sha256Normalized: 'stream' };
  }
  return {
    status: res.status,
    headers,
    bytes: body.length,
    sha256: sha256(body),
    sha256Normalized: sha256(normalize(body.toString('utf8'))),
  };
}

function discover(origin, html) {
  const host = new URL(origin).host;
  const found = new Set();
  for (const [, raw] of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
    let url;
    try {
      url = new URL(raw.replaceAll('&amp;', '&'), origin);
    } catch {
      continue;
    }
    if (url.host !== host) continue;
    const path = url.pathname + url.search;
    if (!isOwnPath(path) && !FIXED_PATHS.includes(path)) found.add(path);
    if (found.size >= MAX_DISCOVERED) break;
  }
  return [...found];
}

async function snapshot(out, origin = 'https://aisergio.dev') {
  let discovered = [];
  try {
    const home = await fetch(origin, {
      headers: { 'user-agent': 'viajacol-sc002/1.0' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    discovered = discover(origin, await home.text());
  } catch (err) {
    console.error(`No se pudo leer la portada para buscar enlaces: ${err}`);
  }
  const paths = [...FIXED_PATHS, ...discovered];
  const settled = await Promise.all(
    paths.map((path) => probe(origin, path).catch((err) => ({ error: String(err) }))),
  );
  const results = {};
  paths.forEach((path, i) => {
    const r = (results[path] = settled[i]);
    console.log(`${String(r.status ?? 'ERR').padEnd(4)} ${String(r.bytes ?? '-').padStart(8)}  ${path}`);
  });
  const data = { origin, takenAt: new Date().toISOString(), discovered, results };
  await writeFile(out, JSON.stringify(data, null, 2));
  console.log(`\n${Object.keys(results).length} rutas (${discovered.length} enlazadas desde la portada) → ${out}`);
}

function diffHeaders(a = {}, b = {}) {
  const names = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...names].filter((n) => a[n] !== b[n]).sort();
}

async function compare(beforeFile, afterFile) {
  const before = JSON.parse(await readFile(beforeFile, 'utf8'));
  const after = JSON.parse(await readFile(afterFile, 'utf8'));
  let unexpected = 0;
  const paths = new Set([...Object.keys(before.results), ...Object.keys(after.results)]);
  for (const path of paths) {
    const a = before.results[path];
    const b = after.results[path];
    const own = isOwnPath(path) && !/^\/viajacolombia/i.test(path);
    if (!a || !b) {
      console.log(`${own ? 'PROPIA ' : 'FALTA  '} ${path}`);
      continue;
    }
    const changes = [];
    if (a.status !== b.status) changes.push(`estado ${a.status}→${b.status}`);
    const headers = diffHeaders(a.headers, b.headers);
    if (headers.length) changes.push(`cabeceras: ${headers.join(', ')}`);
    if (a.sha256Normalized !== b.sha256Normalized) changes.push('cuerpo distinto');
    const tag = changes.length === 0 ? 'IGUAL  ' : own ? 'PROPIA ' : 'CAMBIO ';
    if (changes.length && !own) unexpected += 1;
    console.log(`${tag} ${path}${changes.length ? `  (${changes.join('; ')})` : ''}`);
  }
  console.log(`\n${unexpected} cambios fuera de ${BASE_PATH}`);
  process.exitCode = unexpected === 0 ? 0 : 1;
}

const [mode, ...args] = process.argv.slice(2);
if (mode === 'snapshot' && args[0]) await snapshot(args[0], args[1]);
else if (mode === 'compare' && args.length === 2) await compare(args[0], args[1]);
else {
  console.error('Uso: domain-snapshot.mjs snapshot <salida.json> [origen] | compare <antes.json> <despues.json>');
  process.exitCode = 2;
}
