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
