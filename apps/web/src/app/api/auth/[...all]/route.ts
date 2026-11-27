import { getAuth } from '@/server/auth/auth';
import { withBasePath } from '@/server/auth/with-base-path';

// Better Auth: inicio de sesión con Cognito, regreso, sesión y salida (contracts/rutas.md).
export async function GET(request: Request) {
  const auth = await getAuth();
  return auth.handler(withBasePath(request));
}

export async function POST(request: Request) {
  const auth = await getAuth();
  return auth.handler(withBasePath(request));
}
