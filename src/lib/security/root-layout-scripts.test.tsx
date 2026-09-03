// @vitest-environment jsdom

import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { buildContentSecurityPolicy } from './csp';

/**
 * WS1 fix 9 (GP-550, DECISIONS #23 decided "off" on 03/09/2026). Break 9 of the funnel walk: the root
 * layout mounted the ElevenLabs voice widget, whose script host (unpkg.com) the policy's script-src
 * does not allow, so every page logged a blocked-script error and the widget never appeared. This
 * test renders the real root layout and holds two things: no `<elevenlabs-convai>` element is shipped,
 * and every external script the layout ships comes from a host the STRICT policy allows. A new
 * third-party script must therefore arrive together with its policy allowance, never alone.
 */

// The widget component read the agent id at module load; an id must be present before the layout
// is imported so that, were the mount still there, the element and its script would render.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID = 'agent-under-test';
});

vi.mock('next/font/google', () => ({
  Outfit: () => ({ variable: 'font-display' }),
  Plus_Jakarta_Sans: () => ({ variable: 'font-sans' }),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
// next/script defers afterInteractive scripts to the client, so a static render would hide them.
// Rendering every Script as a plain tag makes each shipped src visible to the assertions below.
vi.mock('next/script', () => ({
  default: ({ src }: { src?: string }) => (src ? createElement('script', { src }) : null),
}));

function externalScriptOrigins(html: string): string[] {
  return Array.from(html.matchAll(/<script\b[^>]*\ssrc="([^"]+)"/g))
    .map((match) => match[1])
    .filter((src) => /^https?:\/\//.test(src))
    .map((src) => new URL(src).origin);
}

function allowedScriptOrigins(): Set<string> {
  const policy = buildContentSecurityPolicy({
    nonce: 'test-nonce',
    isDev: false,
    appOrigin: 'https://carsi.com.au',
    strict: true,
  });
  const scriptSrc = policy.split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src '));
  if (!scriptSrc) throw new Error('policy has no script-src directive');
  return new Set(scriptSrc.split(/\s+/).slice(1).filter((token) => token.startsWith('https://')));
}

async function renderRootLayout(): Promise<string> {
  const { default: RootLayout } = await import('../../../app/layout');
  return renderToStaticMarkup(
    createElement(RootLayout, null, createElement('main', { id: 'main-content' }, 'page') as ReactNode),
  );
}

describe('root layout third-party scripts under the strict Content-Security-Policy', () => {
  it('ships no ElevenLabs voice-widget element even when an agent id is configured', async () => {
    const html = await renderRootLayout();
    expect(html).toContain('Skip to main content');
    expect(html).toContain('/theme-init.js');
    expect(html).not.toContain('elevenlabs-convai');
    expect(html).not.toContain('unpkg.com');
  });

  it('ships only external scripts whose host the strict policy allows', async () => {
    const html = await renderRootLayout();
    const allowed = allowedScriptOrigins();
    expect(allowed.size).toBeGreaterThan(0);
    for (const origin of externalScriptOrigins(html)) {
      expect(allowed.has(origin), `${origin} is not in script-src`).toBe(true);
    }
  });

  it('positive control: the pre-fix widget script is exactly what the host check rejects', () => {
    const preFix =
      '<body><script src="/theme-init.js"></script>' +
      '<script src="https://unpkg.com/@elevenlabs/convai-widget-embed@0.14.10"></script>' +
      '<elevenlabs-convai agent-id="x"></elevenlabs-convai></body>';
    const origins = externalScriptOrigins(preFix);
    expect(origins).toEqual(['https://unpkg.com']);
    expect(allowedScriptOrigins().has('https://unpkg.com')).toBe(false);
  });
});
