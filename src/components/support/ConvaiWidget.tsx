'use client';

import { createElement } from 'react';
import Script from 'next/script';

// Public agent id for the CARSI student-support voice agent (ElevenLabs convai).
// Dark by default: with no id set, this renders nothing — go-live is purely
// setting NEXT_PUBLIC_ELEVENLABS_AGENT_ID on the deployment (DO App Platform).
const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID?.trim();

/**
 * ElevenLabs convai voice widget — a floating student-support agent.
 *
 * Zero new dependencies: the official embed is a script + a custom element
 * (`<elevenlabs-convai>`), not an npm package, so this adds no bundle weight and
 * no @elevenlabs/react. The APP-5 collection notice + overseas-disclosure (APP-8)
 * are carried by the agent's spoken greeting and the /privacy voice subsection.
 */
export function ConvaiWidget() {
  if (!agentId) return null;

  return (
    <>
      <Script
        src="https://unpkg.com/@elevenlabs/convai-widget-embed"
        strategy="afterInteractive"
      />
      {createElement('elevenlabs-convai', { 'agent-id': agentId })}
    </>
  );
}
