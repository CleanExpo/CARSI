import { getBackendOrigin, getHealthCheckPath } from '@/lib/env/public-url';

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${getBackendOrigin()}${getHealthCheckPath()}`);
    return response.ok;
  } catch {
    return false;
  }
}
