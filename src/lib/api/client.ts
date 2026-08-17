/**
 * API client — same-origin requests to this Next.js app’s `/api/*` routes.
 */

const API_BASE = '';

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 500;

export interface ApiError {
  detail: string;
  error_code?: string;
  request_id?: string;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public errorCode?: string,
    public requestId?: string
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * Determine whether a status code is retryable (5xx server errors)
 */
function isRetryable(status: number): boolean {
  return status >= 500 && status < 600;
}

/**
 * The status the APPLICATION answered with, when a gateway rewrote it.
 *
 * DigitalOcean's edge replaces the origin's response with its own error page and records what
 * it received in `x-do-orig-status`. Measured on production: the subscription checkout route
 * answers `503 {"detail":"Membership purchasing is not yet available."}` and the client receives
 * `504` with 1,263 bytes of HTML. The header is therefore proof the request reached the app and
 * got a deliberate answer — it is not a gateway timeout at all.
 */
export function originStatusOf(response: { headers: { get(name: string): string | null } }): number | null {
  const raw = response.headers.get('x-do-orig-status');
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 100 && parsed <= 599 ? parsed : null;
}

/**
 * Decide retry and message status together, so a rewritten response is judged on what the
 * application actually said.
 *
 * Without this, a learner clicking "Start membership" against a 503 spends 3.5 s over four
 * requests — 500 ms, 1 s, 2 s of backoff on a refusal that will never change — and is then shown
 * the string "HTTP 504: Gateway Timeout", because the edge destroyed the JSON body the route
 * wrote and the fallback synthesises a message from the edge's status. The route's own honest
 * wording never reaches the page.
 *
 * A 503 that the app chose is permanent until configuration changes, so it is terminal. Other
 * origin 5xx values keep the existing retry behaviour: a genuine fault may well be transient,
 * and narrowing this to the proven case avoids trading one defect for another.
 */
export function resolveResponseStatus(response: {
  status: number;
  headers: { get(name: string): string | null };
}): { effectiveStatus: number; retryable: boolean } {
  const origin = originStatusOf(response);
  const effectiveStatus = origin ?? response.status;
  const deliberateRefusal = origin === 503;
  return { effectiveStatus, retryable: !deliberateRefusal && isRetryable(effectiveStatus) };
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Only send users to /login after a hard 401 when they are inside the LMS app shell.
 * Public marketing pages (courses, home, etc.) call the same API client for optional auth
 * (e.g. getCurrentUser) — those must not redirect anonymous visitors.
 */
function shouldRedirect401ToLogin(): boolean {
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname;
  const appPrefixes = ['/student', '/dashboard', '/admin', '/instructor'];
  return appPrefixes.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

/**
 * Attempt a single token refresh via the server-side route.
 * Returns true if the refresh succeeded and the caller should retry.
 */
async function attemptTokenRefresh(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Make an authenticated API request with timeout and retry
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  retriesLeft = MAX_RETRIES,
  didRefresh = false
): Promise<T> {
  // Auth travels via the httpOnly `auth_token` cookie (sent automatically by
  // `credentials: 'include'` below). No JS-readable token / Bearer header.
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  // Abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle 401 — attempt token refresh once
    if (response.status === 401 && !didRefresh) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        return fetchApi<T>(endpoint, options, retriesLeft, true);
      }
      // Refresh failed — redirect only from protected LMS routes (not /courses, /, etc.)
      if (typeof window !== 'undefined' && shouldRedirect401ToLogin()) {
        window.location.href = '/login';
      }
      throw new ApiClientError('Session expired', 401);
    }

    // Retry on 5xx with exponential backoff — but judge a gateway-rewritten response on the
    // status the application actually returned, so a deliberate refusal is not retried.
    const { effectiveStatus, retryable } = resolveResponseStatus(response);
    if (retryable && retriesLeft > 0) {
      const delay = RETRY_BASE_MS * 2 ** (MAX_RETRIES - retriesLeft);
      await sleep(delay);
      return fetchApi<T>(endpoint, options, retriesLeft - 1, didRefresh);
    }

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        detail: `HTTP ${effectiveStatus}: ${response.statusText}`,
      }));

      throw new ApiClientError(error.detail, effectiveStatus, error.error_code, error.request_id);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (err) {
    clearTimeout(timeoutId);

    // Re-throw ApiClientError as-is
    if (err instanceof ApiClientError) throw err;

    // Wrap AbortError (timeout)
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiClientError('Request timed out', 408, 'TIMEOUT');
    }

    throw new ApiClientError(
      err instanceof Error ? err.message : 'Network error',
      0,
      'NETWORK_ERROR'
    );
  }
}

/**
 * API Client - Browser-side
 */
export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    fetchApi<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    fetchApi<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    fetchApi<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    fetchApi<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    fetchApi<T>(endpoint, { ...options, method: 'DELETE' }),
};

/**
 * Create a browser client (for compatibility with existing code)
 */
export function createClient() {
  return apiClient;
}
