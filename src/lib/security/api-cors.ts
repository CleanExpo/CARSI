/**
 * WS5 — /api/:path* CORS response headers (pure, dependency-free so it is safe to
 * import from next.config.ts).
 *
 * FAIL CLOSED: emit the credentialed CORS grant (Access-Control-Allow-Origin +
 * Access-Control-Allow-Credentials) ONLY when a frontend origin is configured.
 * When NEXT_PUBLIC_FRONTEND_URL is unset we omit both — never advertise a
 * credentialed cross-origin grant to a localhost fallback. Methods/Headers stay
 * (they carry no credential risk). The Next app serves its own API same-origin,
 * so failing closed is safe for the default/dev deployment.
 */
export type ApiHeader = { key: string; value: string };

const CORS_METHODS_HEADERS: ApiHeader[] = [
  { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
  {
    key: 'Access-Control-Allow-Headers',
    value:
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
  },
];

export function buildApiCorsHeaders(frontendUrl: string | undefined | null): ApiHeader[] {
  const origin = frontendUrl?.trim();
  if (!origin) {
    return [...CORS_METHODS_HEADERS];
  }
  return [
    { key: 'Access-Control-Allow-Credentials', value: 'true' },
    { key: 'Access-Control-Allow-Origin', value: origin },
    ...CORS_METHODS_HEADERS,
  ];
}
