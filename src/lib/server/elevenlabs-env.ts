/**
 * ElevenLabs runtime config for Margot Listen + course narration scripts.
 * Supports the known production typo `ELEVENLABS_VIOCE_ID` (see generate-course-media workflow).
 */
export type ElevenLabsEnv = {
  apiKey: string;
  voiceId: string;
  modelId: string;
  configured: boolean;
};

export function getElevenLabsEnv(
  env: NodeJS.ProcessEnv = process.env
): ElevenLabsEnv {
  const apiKey = env.ELEVENLABS_API_KEY?.trim() ?? '';
  const voiceId =
    env.ELEVENLABS_VOICE_ID?.trim() ||
    env.ELEVENLABS_VIOCE_ID?.trim() ||
    '';
  const modelId = env.ELEVENLABS_MODEL_ID?.trim() || 'eleven_multilingual_v2';

  return {
    apiKey,
    voiceId,
    modelId,
    configured: Boolean(apiKey && voiceId),
  };
}
