process.env.TZ = 'Australia/Brisbane';

import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Same-origin default for getBackendOrigin() in tests (no separate API)
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
delete process.env.NEXT_PUBLIC_BACKEND_URL;
delete process.env.BACKEND_URL;
delete process.env.NEXT_PUBLIC_API_URL;
