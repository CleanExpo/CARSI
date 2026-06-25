/**
 * Minimal Jina Reader client (https://jina.ai/reader).
 *
 * Jina's reader is a plain HTTPS:443 GET to `https://r.jina.ai/<target>`, which means it
 * tunnels through restricted egress proxies (unlike a CDP/websocket scraping browser) and
 * runs unchanged on Vercel. It renders client-side JS and can read PDFs (e.g. SDS sheets).
 *
 * Auth: set `JINA_API_KEY`. Without a key Jina still serves anonymous requests at a lower
 * rate limit; the key raises limits and is required for some features.
 *
 * Note for restricted-proxy environments: Node's built-in fetch only honours `HTTPS_PROXY`
 * when run with `NODE_USE_ENV_PROXY=1` (Node >= 22.21). The scrape script sets this.
 */

const JINA_READER_BASE = 'https://r.jina.ai/';

export type JinaLink = { text: string; url: string };

export type JinaReadResult = {
  url: string;
  title: string | null;
  /** Page content as markdown (or text for PDFs). */
  content: string;
  /** Hyperlinks found on the page, when requested. */
  links: JinaLink[];
  /** Image URLs found on the page, when requested. */
  images: string[];
};

export type JinaReadOptions = {
  apiKey?: string;
  /** Include a link summary in the response. Default true. */
  withLinks?: boolean;
  /** Include an image summary in the response. Default false. */
  withImages?: boolean;
  /** Return format requested from Jina. Default "markdown". */
  format?: 'markdown' | 'text' | 'html';
  /** Per-request timeout in ms. Default 60000. */
  timeoutMs?: number;
};

function normalizeLinks(raw: unknown): JinaLink[] {
  // Jina returns `links` either as { anchorText: url } or as an array of [text, url].
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => {
        if (Array.isArray(entry)) return { text: String(entry[0] ?? ''), url: String(entry[1] ?? '') };
        if (entry && typeof entry === 'object') {
          const e = entry as Record<string, unknown>;
          return { text: String(e.text ?? e.title ?? ''), url: String(e.url ?? e.href ?? '') };
        }
        return { text: '', url: String(entry) };
      })
      .filter((l) => l.url);
  }
  if (typeof raw === 'object') {
    return Object.entries(raw as Record<string, unknown>)
      .map(([text, url]) => ({ text, url: String(url) }))
      .filter((l) => l.url);
  }
  return [];
}

function normalizeImages(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === 'object') return Object.values(raw as Record<string, unknown>).map(String).filter(Boolean);
  return [];
}

/**
 * Fetch and read a single URL through Jina. Throws on non-2xx after the timeout.
 */
export async function jinaRead(targetUrl: string, options: JinaReadOptions = {}): Promise<JinaReadResult> {
  const {
    apiKey = process.env.JINA_API_KEY,
    withLinks = true,
    withImages = false,
    format = 'markdown',
    timeoutMs = 60_000,
  } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Return-Format': format,
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  if (withLinks) headers['X-With-Links-Summary'] = 'true';
  if (withImages) headers['X-With-Images-Summary'] = 'true';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(JINA_READER_BASE + targetUrl, { headers, signal: controller.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Jina read failed for ${targetUrl}: HTTP ${res.status} ${res.statusText} ${body.slice(0, 300)}`);
    }
    const json = (await res.json()) as { data?: Record<string, unknown> } & Record<string, unknown>;
    const data = (json.data ?? json) as Record<string, unknown>;
    return {
      url: typeof data.url === 'string' ? data.url : targetUrl,
      title: typeof data.title === 'string' ? data.title : null,
      content: typeof data.content === 'string' ? data.content : '',
      links: normalizeLinks(data.links),
      images: normalizeImages(data.images),
    };
  } finally {
    clearTimeout(timer);
  }
}
