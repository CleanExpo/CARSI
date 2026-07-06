import { describe, expect, it } from 'vitest';

import { getElevenLabsEnv } from './elevenlabs-env';

describe('getElevenLabsEnv', () => {
  it('reads standard voice id env vars', () => {
    const env = getElevenLabsEnv({
      ELEVENLABS_API_KEY: ' key ',
      ELEVENLABS_VOICE_ID: ' voice ',
    });
    expect(env.configured).toBe(true);
    expect(env.apiKey).toBe('key');
    expect(env.voiceId).toBe('voice');
  });

  it('falls back to the known VIOCE typo', () => {
    const env = getElevenLabsEnv({
      ELEVENLABS_API_KEY: 'key',
      ELEVENLABS_VIOCE_ID: 'typo-voice',
    });
    expect(env.configured).toBe(true);
    expect(env.voiceId).toBe('typo-voice');
  });

  it('is not configured when keys are missing', () => {
    expect(getElevenLabsEnv({}).configured).toBe(false);
  });
});
