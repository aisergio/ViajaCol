import Link from 'next/link';

/** 404 para rutas que no pasan por el proxy de idioma (raro: archivos o rutas internas). */
export default function GlobalNotFound() {
  return (
    <html lang="es-CO">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          margin: '4rem auto',
          maxWidth: '40rem',
          padding: '0 1rem',
        }}
      >
        <main>
          <h1>Página no encontrada · Page not found</h1>
          <p>
            <Link href="/">Volver a Viaja Colombia · Back to Viaja Colombia</Link>
          </p>
        </main>
      </body>
    </html>
  );
}
