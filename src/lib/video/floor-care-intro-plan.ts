import { access, mkdir, readFile, stat } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

export type FloorCareIntroScene = {
  id: string;
  image: string;
  caption: string;
  narration: string;
};

export const FLOOR_CARE_INTRO_SCENES: FloorCareIntroScene[] = [
  {
    id: 'intro',
    image: 'public/logo.png',
    caption: 'CARSI — Commercial Floor Care',
    narration:
      "Welcome to CARSI's Commercial Floor Care for Schools and Childcare Contracts.",
  },
  {
    id: 'carpet',
    image: 'public/images/courses/carpet-cleaning-basics.webp',
    caption: 'Carpet Cleaning',
    narration:
      "Carpet cleaning is often the first job that wins the contract. You'll learn spotting, extraction and drying technique suited to a live school environment.",
  },
  {
    id: 'tile-grout',
    image: 'public/images/courses/stone-tile-cleaning.webp',
    caption: 'Tile & Grout',
    narration:
      'Tile and grout brings its own chemistry and technique, working around occupied classrooms and tight turnaround windows.',
  },
  {
    id: 'vinyl-strip-seal',
    image: 'public/images/courses/hard-floor-cleaning.webp',
    caption: 'Vinyl Strip & Seal',
    narration:
      'Vinyl strip and seal covers safe product selection and verifying slip resistance to AS 4663 once the floor is sealed.',
  },
  {
    id: 'pressure-washing',
    image: 'public/images/courses/pressure-washing.webp',
    caption: 'Pressure Washing',
    narration:
      'Pressure washing rounds out the four services, including keeping run-off out of stormwater on site.',
  },
  {
    id: 'whs-documentation',
    image: 'public/images/courses/school-cleaning.webp',
    caption: 'WHS, SDS & Documentation',
    narration:
      "Every service is paired with your WHS duties, Safety Data Sheet obligations, and child-safe, low-tox product selection around children. You'll also build the scheduling and documentation an Australian school or childcare contract expects.",
  },
  {
    id: 'outro',
    image: 'public/logo.png',
    caption: 'CARSI — Contract-Ready Floor Care',
    narration:
      'This is professional development to support your judgement on site. CARSI: contract-ready floor care training for Australian schools and childcare.',
  },
];

export function buildFloorCareIntroScenes(): FloorCareIntroScene[] {
  return FLOOR_CARE_INTRO_SCENES;
}

export async function validateFloorCareIntroSceneAssets(
  scenes: FloorCareIntroScene[],
  baseDir: string
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const scene of scenes) {
    const imagePath = resolve(baseDir, scene.image);
    try {
      await access(imagePath);
    } catch {
      errors.push(`scene "${scene.id}" references a missing image file: ${scene.image}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function buildFloorCareIntroCandidatePath(outputPath: string): string {
  return join(dirname(outputPath), `.${basename(outputPath)}.candidate.mp4`);
}

export type FfmpegProbe = {
  durationSeconds: number;
  width: number;
  height: number;
  videoCodec: string;
  audioCodec: string | null;
};

const DURATION_RE = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/;
const VIDEO_RE = /Stream #\d+:\d+.*?Video:\s*([a-zA-Z0-9_]+).*?(?:^|[,\s])(\d{2,5})x(\d{2,5})(?:\s|\[|,)/m;
const AUDIO_RE = /Stream #\d+:\d+.*?Audio:\s*([a-zA-Z0-9_]+)/;

function escapeFfmpegDrawtext(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/:/g, '\\:').replace(/%/g, '\\%');
}

export function buildFloorCareSegmentFilter(
  caption: string,
  fontFile = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
): string {
  const safeCaption = escapeFfmpegDrawtext(caption);
  const safeFont = escapeFfmpegDrawtext(fontFile);
  return [
    'scale=1280:720:force_original_aspect_ratio=increase',
    'crop=1280:720',
    'eq=brightness=-0.08:saturation=0.9',
    'drawbox=x=0:y=530:w=iw:h=190:color=0x060a14@0.84:t=fill',
    `drawtext=fontfile='${safeFont}':text='${safeCaption}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=h-120`,
  ].join(',');
}

export function parseFfmpegProbeOutput(stderrText: string): FfmpegProbe | null {
  const durationMatch = stderrText.match(DURATION_RE);
  if (!durationMatch) return null;
  const videoMatch = stderrText.match(VIDEO_RE);
  const audioMatch = stderrText.match(AUDIO_RE);

  const [, h, m, s] = durationMatch;
  const durationSeconds = Number(h) * 3600 + Number(m) * 60 + Number(s);

  return {
    durationSeconds,
    width: videoMatch ? Number(videoMatch[2]) : 0,
    height: videoMatch ? Number(videoMatch[3]) : 0,
    videoCodec: videoMatch ? videoMatch[1] : '',
    audioCodec: audioMatch ? audioMatch[1] : null,
  };
}

export type VideoValidationConstraints = {
  minWidth: number;
  minHeight: number;
  aspectRatioTolerance: number;
  minDurationSeconds: number;
  maxDurationSeconds: number;
  maxFileSizeBytes: number;
  requiredVideoCodec: string;
  requiredAudioCodec: string;
};

export const FLOOR_CARE_INTRO_VIDEO_CONSTRAINTS: VideoValidationConstraints = {
  minWidth: 1280,
  minHeight: 720,
  aspectRatioTolerance: 0.02,
  minDurationSeconds: 30,
  maxDurationSeconds: 75,
  maxFileSizeBytes: 12 * 1024 * 1024,
  requiredVideoCodec: 'h264',
  requiredAudioCodec: 'aac',
};

export function validateFloorCareIntroVideo(
  probe: FfmpegProbe,
  fileSizeBytes: number,
  constraints: VideoValidationConstraints = FLOOR_CARE_INTRO_VIDEO_CONSTRAINTS
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (probe.width < constraints.minWidth || probe.height < constraints.minHeight) {
    errors.push(`resolution ${probe.width}x${probe.height} is below the minimum ${constraints.minWidth}x${constraints.minHeight}`);
  }

  const aspect = probe.height > 0 ? probe.width / probe.height : 0;
  if (Math.abs(aspect - 16 / 9) > constraints.aspectRatioTolerance) {
    errors.push(`aspect ratio ${aspect.toFixed(3)} is not 16:9`);
  }

  if (probe.videoCodec !== constraints.requiredVideoCodec) {
    errors.push(`video codec "${probe.videoCodec}" is not ${constraints.requiredVideoCodec}`);
  }

  if (probe.audioCodec !== constraints.requiredAudioCodec) {
    errors.push(`audio codec "${probe.audioCodec ?? 'none'}" is not ${constraints.requiredAudioCodec}`);
  }

  if (probe.durationSeconds < constraints.minDurationSeconds || probe.durationSeconds > constraints.maxDurationSeconds) {
    errors.push(`duration ${probe.durationSeconds.toFixed(1)}s is outside ${constraints.minDurationSeconds}-${constraints.maxDurationSeconds}s`);
  }

  if (fileSizeBytes > constraints.maxFileSizeBytes) {
    errors.push(`file size ${fileSizeBytes} bytes exceeds the ${constraints.maxFileSizeBytes} byte cap`);
  }

  return { valid: errors.length === 0, errors };
}

// --- Real ffprobe-based verification (repo-owned binary, no ffmpeg-stderr parsing) ---

export type FfprobeStream = {
  index: number;
  codec_name?: string;
  codec_type?: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  avg_frame_rate?: string;
};

export type FfprobeFormat = {
  nb_streams?: number;
  duration?: string;
  size?: string;
};

export type FfprobeResult = {
  streams: FfprobeStream[];
  format: FfprobeFormat;
};

export function buildFfprobeArgs(filePath: string): string[] {
  return ['-hide_banner', '-loglevel', 'error', '-print_format', 'json', '-show_format', '-show_streams', filePath];
}

export function parseFrameRate(rate: string | undefined): number {
  if (!rate) return 0;
  const [num, den] = rate.split('/').map(Number);
  if (!den) return 0;
  return num / den;
}

export function parseFfprobeResult(jsonText: string): FfprobeResult {
  const parsed = JSON.parse(jsonText) as Partial<FfprobeResult>;
  return { streams: parsed.streams ?? [], format: parsed.format ?? {} };
}

export type FloorCareProbeSummary = {
  videoStreamCount: number;
  audioStreamCount: number;
  videoCodec: string | null;
  audioCodec: string | null;
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
  fileSizeBytes: number;
};

export function summariseFloorCareProbe(result: FfprobeResult): FloorCareProbeSummary {
  const videoStreams = result.streams.filter((s) => s.codec_type === 'video');
  const audioStreams = result.streams.filter((s) => s.codec_type === 'audio');
  const video = videoStreams[0];
  const audio = audioStreams[0];

  return {
    videoStreamCount: videoStreams.length,
    audioStreamCount: audioStreams.length,
    videoCodec: video?.codec_name ?? null,
    audioCodec: audio?.codec_name ?? null,
    width: video?.width ?? 0,
    height: video?.height ?? 0,
    fps: parseFrameRate(video?.avg_frame_rate ?? video?.r_frame_rate),
    durationSeconds: Number(result.format.duration ?? 0),
    fileSizeBytes: Number(result.format.size ?? 0),
  };
}

export type ProbeValidationConstraints = {
  requiredWidth: number;
  requiredHeight: number;
  requiredFps: number;
  fpsTolerance: number;
  minDurationSeconds: number;
  maxDurationSeconds: number;
  maxFileSizeBytes: number;
  requiredVideoCodec: string;
  requiredAudioCodec: string;
};

export const FLOOR_CARE_INTRO_PROBE_CONSTRAINTS: ProbeValidationConstraints = {
  requiredWidth: 1280,
  requiredHeight: 720,
  requiredFps: 25,
  fpsTolerance: 0.05,
  minDurationSeconds: 30,
  maxDurationSeconds: 75,
  maxFileSizeBytes: 12 * 1024 * 1024,
  requiredVideoCodec: 'h264',
  requiredAudioCodec: 'aac',
};

export function validateFloorCareIntroProbe(
  summary: FloorCareProbeSummary,
  constraints: ProbeValidationConstraints = FLOOR_CARE_INTRO_PROBE_CONSTRAINTS
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (summary.videoStreamCount !== 1) {
    errors.push(`expected exactly one video stream, found ${summary.videoStreamCount}`);
  }
  if (summary.videoCodec !== constraints.requiredVideoCodec) {
    errors.push(`video codec "${summary.videoCodec ?? 'none'}" is not ${constraints.requiredVideoCodec}`);
  }
  if (summary.audioStreamCount < 1) {
    errors.push(`expected at least one audio stream, found ${summary.audioStreamCount}`);
  }
  if (summary.audioCodec !== constraints.requiredAudioCodec) {
    errors.push(`audio codec "${summary.audioCodec ?? 'none'}" is not ${constraints.requiredAudioCodec}`);
  }
  if (summary.width !== constraints.requiredWidth || summary.height !== constraints.requiredHeight) {
    errors.push(`resolution ${summary.width}x${summary.height} is not ${constraints.requiredWidth}x${constraints.requiredHeight}`);
  }
  if (Math.abs(summary.fps - constraints.requiredFps) > constraints.fpsTolerance) {
    errors.push(`fps ${summary.fps} is not ${constraints.requiredFps}`);
  }
  if (summary.durationSeconds < constraints.minDurationSeconds || summary.durationSeconds > constraints.maxDurationSeconds) {
    errors.push(`duration ${summary.durationSeconds.toFixed(1)}s is outside ${constraints.minDurationSeconds}-${constraints.maxDurationSeconds}s`);
  }
  if (summary.fileSizeBytes > constraints.maxFileSizeBytes) {
    errors.push(`file size ${summary.fileSizeBytes} bytes exceeds the ${constraints.maxFileSizeBytes} byte cap`);
  }

  return { valid: errors.length === 0, errors };
}

export type FloorCareFrameSpec = {
  label: 'opening' | 'midpoint' | 'ending';
  timestampSeconds: number;
};

export function buildFloorCareFrameSpecs(durationSeconds: number): FloorCareFrameSpec[] {
  const midpoint = durationSeconds / 2;
  const ending = Math.max(midpoint, durationSeconds - 1);
  return [
    { label: 'opening', timestampSeconds: 0 },
    { label: 'midpoint', timestampSeconds: midpoint },
    { label: 'ending', timestampSeconds: ending },
  ];
}

export function buildFrameExtractionArgs(inputPath: string, timestampSeconds: number, outputPath: string): string[] {
  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-ss',
    String(timestampSeconds),
    '-i',
    inputPath,
    '-frames:v',
    '1',
    outputPath,
  ];
}

export function buildFullDecodeArgs(inputPath: string): string[] {
  return ['-v', 'error', '-i', inputPath, '-f', 'null', '-'];
}

function resolveInstalledBinaryPath(packageName: string): string {
  const require = createRequire(import.meta.url);
  const installer = require(packageName) as { path?: string };
  if (!installer.path) throw new Error(`${packageName} did not expose a binary path.`);
  return installer.path;
}

export function ffprobeBinaryPath(): string {
  return resolveInstalledBinaryPath('@ffprobe-installer/ffprobe');
}

export function ffmpegBinaryPath(): string {
  return resolveInstalledBinaryPath('@ffmpeg-installer/ffmpeg');
}

function runCapture(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolvePromise({ stdout, stderr });
      else reject(new Error(`${command} exited ${code}${stderr ? `: ${stderr.slice(-1000)}` : ''}`));
    });
  });
}

export type FloorCareFrameEvidence = {
  label: FloorCareFrameSpec['label'];
  timestampSeconds: number;
  path: string;
  sha256: string;
};

export type FloorCareVerifyResult = {
  valid: boolean;
  errors: string[];
  decoded: boolean;
  summary: FloorCareProbeSummary;
  frames: FloorCareFrameEvidence[];
};

export async function verifyFloorCareIntroVideo(
  filePath: string,
  evidenceDir: string
): Promise<FloorCareVerifyResult> {
  const ffprobe = ffprobeBinaryPath();
  const ffmpeg = ffmpegBinaryPath();

  const probeRun = await runCapture(ffprobe, buildFfprobeArgs(filePath));
  const probeResult = parseFfprobeResult(probeRun.stdout);
  const summary = summariseFloorCareProbe(probeResult);

  const fileStat = await stat(filePath);
  summary.fileSizeBytes = fileStat.size;

  const validation = validateFloorCareIntroProbe(summary);

  await runCapture(ffmpeg, buildFullDecodeArgs(filePath));

  await mkdir(evidenceDir, { recursive: true });
  const specs = buildFloorCareFrameSpecs(summary.durationSeconds);
  const frames: FloorCareFrameEvidence[] = [];
  for (const spec of specs) {
    const framePath = join(evidenceDir, `${spec.label}.png`);
    await runCapture(ffmpeg, buildFrameExtractionArgs(filePath, spec.timestampSeconds, framePath));
    const bytes = await readFile(framePath);
    frames.push({
      label: spec.label,
      timestampSeconds: spec.timestampSeconds,
      path: framePath,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
  }

  return { valid: validation.valid, errors: validation.errors, decoded: true, summary, frames };
}
