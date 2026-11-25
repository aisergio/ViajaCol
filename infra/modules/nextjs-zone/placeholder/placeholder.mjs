import { createServer } from 'node:http';

const port = Number(process.env.PORT ?? 8080);
const healthPath = process.env.AWS_LWA_READINESS_CHECK_PATH ?? '/api/health';

createServer((request, response) => {
  if (request.url?.startsWith(healthPath)) {
    response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    response.end(JSON.stringify({ status: 'placeholder', version: 'none' }));
    return;
  }
  response.writeHead(503, {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
    'retry-after': '120',
  });
  response.end('Viaja Colombia se está publicando. Vuelve en unos minutos.');
}).listen(port, '127.0.0.1');
