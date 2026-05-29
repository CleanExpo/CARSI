import { NextResponse } from 'next/server';

/** Safe proxy of an upstream `fetch` Response for App Router route handlers. */
export async function nextResponseFromFetch(res: Response): Promise<NextResponse> {
  const contentType = res.headers.get('content-type') ?? 'application/json';
  const body = new Uint8Array(await res.arrayBuffer());
  return new NextResponse(body, {
    status: res.status,
    headers: { 'content-type': contentType },
  });
}
