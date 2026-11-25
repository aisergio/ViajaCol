import { NextResponse } from 'next/server';

// Endpoint de salud (FR-011). Lo usan la comprobación de arranque del Lambda Web Adapter, la prueba
// de humo y la restauración. Solo expone el estado y el commit publicado, nunca datos sensibles.
const noStore = { 'Cache-Control': 'no-store' };

export function GET() {
  return NextResponse.json(
    { status: 'ok', version: process.env.APP_VERSION ?? 'dev' },
    { headers: noStore },
  );
}

// Devuelve el tamaño del cuerpo recibido: demuestra que un POST cruza el Worker y CloudFront (OAC
// exige el hash del cuerpo) sin alterarse.
export async function POST(request: Request) {
  const body = await request.arrayBuffer();
  return NextResponse.json({ status: 'ok', received: body.byteLength }, { headers: noStore });
}
