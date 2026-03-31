/**
 * Public site origin for client-side fetch (same-origin relative paths).
 */

export function getBackendOrigin(): string {
  return '';
}

export function getHealthCheckPath(): string {
  const path = process.env.NEXT_PUBLIC_BACKEND_HEALTH_PATH?.trim() || '/health';
  return path.startsWith('/') ? path : `/${path}`;
}
