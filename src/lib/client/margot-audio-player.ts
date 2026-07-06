let audioContext: AudioContext | null = null;
let activeSource: AudioBufferSourceNode | null = null;
let activeHtmlAudio: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;

function getAudioContextClass(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  );
}

/** Call synchronously inside a user click/tap handler before any await. */
export function unlockMargotAudio(): void {
  try {
    const AudioCtx = getAudioContextClass();
    if (!AudioCtx) return;
    audioContext ??= new AudioCtx();
    void audioContext.resume();
  } catch {
    // Browsers without Web Audio still fall back to HTMLAudioElement.
  }
}

export function stopMargotAudio(): void {
  try {
    activeSource?.stop();
  } catch {
    // already stopped
  }
  activeSource = null;

  activeHtmlAudio?.pause();
  activeHtmlAudio = null;

  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }
}

async function playWithHtmlAudio(blob: Blob): Promise<void> {
  const url = URL.createObjectURL(blob);
  activeObjectUrl = url;
  const audio = new Audio(url);
  activeHtmlAudio = audio;

  await new Promise<void>((resolve, reject) => {
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error('Could not play audio for this message.'));
    void audio.play().catch(reject);
  });
}

async function playWithWebAudio(blob: Blob): Promise<void> {
  const AudioCtx = getAudioContextClass();
  if (!AudioCtx) {
    await playWithHtmlAudio(blob);
    return;
  }

  audioContext ??= new AudioCtx();
  await audioContext.resume();

  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  activeSource = source;

  await new Promise<void>((resolve, reject) => {
    source.onended = () => resolve();
    try {
      source.start(0);
    } catch (error) {
      reject(error instanceof Error ? error : new Error('Voice playback failed.'));
    }
  });
}

export async function playMargotMp3Blob(blob: Blob): Promise<void> {
  if (blob.size === 0) {
    throw new Error('Voice response was empty. Please try again.');
  }

  stopMargotAudio();

  try {
    await playWithWebAudio(blob);
  } catch {
    await playWithHtmlAudio(blob);
  }
}
