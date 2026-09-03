import { afterEach, describe, expect, it, vi } from 'vitest';

import { revalidateHomepage } from './homepage-revalidation';

const URL = 'https://carsi.com.au/api/cron/revalidate-homepage';

function call(authorization: string | null) {
  const revalidatePath = vi.fn();
  const headers = authorization === null ? {} : { authorization };
  const response = revalidateHomepage(new Request(URL, { headers }), {
    revalidatePath,
    now: () => new Date('2026-09-05T14:00:05Z'),
  });
  return { response, revalidatePath };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('revalidateHomepage', () => {
  it('purges the homepage for the configured secret and reports the Brisbane day', async () => {
    vi.stubEnv('CRON_SECRET', 'test-secret');
    const { response, revalidatePath } = call('Bearer test-secret');
    expect(response.status).toBe(200);
    expect(revalidatePath).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith('/');
    await expect(response.json()).resolves.toEqual({
      ok: true,
      revalidated: ['/'],
      brisbaneDay: '2026-09-06',
    });
  });

  it('refuses a wrong token with 401 and purges nothing', () => {
    vi.stubEnv('CRON_SECRET', 'test-secret');
    const { response, revalidatePath } = call('Bearer not-the-secret');
    expect(response.status).toBe(401);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('refuses a missing header with 401 and purges nothing', () => {
    vi.stubEnv('CRON_SECRET', 'test-secret');
    const { response, revalidatePath } = call(null);
    expect(response.status).toBe(401);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('fails closed with 503 when no secret is configured', () => {
    vi.stubEnv('CRON_SECRET', '');
    const { response, revalidatePath } = call('Bearer anything');
    expect(response.status).toBe(503);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
