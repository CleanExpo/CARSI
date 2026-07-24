import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildFfprobeArgs,
  parseFrameRate,
  parseFfprobeResult,
  summariseFloorCareProbe,
  validateFloorCareIntroProbe,
  buildFloorCareFrameSpecs,
  buildFrameExtractionArgs,
  buildFullDecodeArgs,
  verifyFloorCareIntroVideo,
  runCapture,
  ffmpegBinaryPath,
  FLOOR_CARE_INTRO_PROBE_CONSTRAINTS,
  type RunCaptureFn,
} from './floor-care-intro-plan';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const FLOOR_CARE_MP4 = resolve(
  repoRoot,
  'public/videos/course-intros/commercial-floor-care-schools-childcare.mp4'
);

// A faithful sample of the JSON `ffprobe -print_format json -show_format -show_streams`
// emits for the committed floor-care intro (captured from the real binary).
const SAMPLE_FFPROBE_JSON = JSON.stringify({
  streams: [
    {
      index: 0,
      codec_name: 'h264',
      codec_type: 'video',
      width: 1280,
      height: 720,
      r_frame_rate: '25/1',
      avg_frame_rate: '25/1',
    },
    {
      index: 1,
      codec_name: 'aac',
      codec_type: 'audio',
      r_frame_rate: '0/0',
      avg_frame_rate: '0/0',
    },
  ],
  format: { nb_streams: 2, duration: '72.584000', size: '2109732' },
});

describe('buildFfprobeArgs', () => {
  it('requests JSON output with both format and stream data for the given file', () => {
    const args = buildFfprobeArgs('/tmp/example.mp4');
    expect(args).toContain('-print_format');
    expect(args[args.indexOf('-print_format') + 1]).toBe('json');
    expect(args).toContain('-show_format');
    expect(args).toContain('-show_streams');
    expect(args[args.length - 1]).toBe('/tmp/example.mp4');
  });
});

describe('parseFrameRate', () => {
  it('reduces an ffprobe rational frame rate to a number', () => {
    expect(parseFrameRate('25/1')).toBe(25);
    expect(parseFrameRate('30000/1001')).toBeCloseTo(29.97, 2);
  });
  it('returns 0 for the undefined "0/0" audio rate', () => {
    expect(parseFrameRate('0/0')).toBe(0);
  });
});

describe('parseFfprobeResult + summariseFloorCareProbe', () => {
  it('summarises exactly one h264 video stream and one aac audio stream', () => {
    const result = parseFfprobeResult(SAMPLE_FFPROBE_JSON);
    const summary = summariseFloorCareProbe(result);
    expect(summary.videoStreamCount).toBe(1);
    expect(summary.audioStreamCount).toBe(1);
    expect(summary.videoCodec).toBe('h264');
    expect(summary.audioCodec).toBe('aac');
    expect(summary.width).toBe(1280);
    expect(summary.height).toBe(720);
    expect(summary.fps).toBe(25);
    expect(summary.durationSeconds).toBeCloseTo(72.584, 2);
    expect(summary.fileSizeBytes).toBe(2109732);
  });
});

describe('validateFloorCareIntroProbe', () => {
  const goodResult = parseFfprobeResult(SAMPLE_FFPROBE_JSON);
  const good = summariseFloorCareProbe(goodResult);

  it('accepts the committed floor-care intro probe summary', () => {
    const { valid, errors } = validateFloorCareIntroProbe(good);
    expect(errors).toEqual([]);
    expect(valid).toBe(true);
  });

  it('rejects a second video stream (must be exactly one H.264 stream)', () => {
    const twoVideo = { ...good, videoStreamCount: 2 };
    const { valid, errors } = validateFloorCareIntroProbe(twoVideo);
    expect(valid).toBe(false);
    expect(errors.join(' ')).toMatch(/video stream/i);
  });

  it('rejects a missing audio stream (needs at least one AAC stream)', () => {
    const noAudio = { ...good, audioStreamCount: 0, audioCodec: null };
    const { valid, errors } = validateFloorCareIntroProbe(noAudio);
    expect(valid).toBe(false);
    expect(errors.join(' ')).toMatch(/audio/i);
  });

  it('rejects a second audio stream (must be exactly one AAC stream)', () => {
    const twoAudio = { ...good, audioStreamCount: 2 };
    const { valid, errors } = validateFloorCareIntroProbe(twoAudio);
    expect(valid).toBe(false);
    expect(errors.join(' ')).toMatch(/exactly one audio stream/i);
  });

  it('rejects a frame rate that is not 25 fps', () => {
    const wrongFps = { ...good, fps: 30 };
    const { valid, errors } = validateFloorCareIntroProbe(wrongFps);
    expect(valid).toBe(false);
    expect(errors.join(' ')).toMatch(/fps|frame rate/i);
  });
});

describe('frame + decode command construction', () => {
  it('places the opening, midpoint and ending frames across the duration', () => {
    const specs = buildFloorCareFrameSpecs(72.584);
    expect(specs.map((s) => s.label)).toEqual(['opening', 'midpoint', 'ending']);
    expect(specs[0].timestampSeconds).toBe(0);
    expect(specs[1].timestampSeconds).toBeCloseTo(36.292, 2);
    expect(specs[2].timestampSeconds).toBeGreaterThan(specs[1].timestampSeconds);
    expect(specs[2].timestampSeconds).toBeLessThan(72.584);
  });

  it('seeks and extracts a single PNG frame', () => {
    const args = buildFrameExtractionArgs('/tmp/in.mp4', 12.5, '/tmp/out.png');
    expect(args).toContain('-ss');
    expect(args[args.indexOf('-ss') + 1]).toBe('12.5');
    expect(args).toContain('-i');
    expect(args).toContain('-frames:v');
    expect(args[args.indexOf('-frames:v') + 1]).toBe('1');
    expect(args[args.length - 1]).toBe('/tmp/out.png');
  });

  it('decodes every packet to the null muxer', () => {
    const args = buildFullDecodeArgs('/tmp/in.mp4');
    expect(args).toContain('-f');
    expect(args[args.indexOf('-f') + 1]).toBe('null');
    expect(args[args.length - 1]).toBe('-');
  });
});

describe('verifyFloorCareIntroVideo (real local integration, no network)', () => {
  let evidenceDir: string;

  beforeAll(async () => {
    evidenceDir = await mkdtemp(join(tmpdir(), 'carsi-floor-care-verify-'));
  });

  it('resolves a repo-owned ffprobe, validates every AC2 constraint and extracts three hashed frames', async () => {
    const result = await verifyFloorCareIntroVideo(FLOOR_CARE_MP4, evidenceDir);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.decoded).toBe(true);

    expect(result.summary.videoStreamCount).toBe(1);
    expect(result.summary.audioStreamCount).toBeGreaterThanOrEqual(1);
    expect(result.summary.videoCodec).toBe('h264');
    expect(result.summary.audioCodec).toBe('aac');
    expect(result.summary.width).toBe(1280);
    expect(result.summary.height).toBe(720);
    expect(result.summary.fps).toBeCloseTo(25, 3);
    expect(result.summary.durationSeconds).toBeGreaterThanOrEqual(
      FLOOR_CARE_INTRO_PROBE_CONSTRAINTS.minDurationSeconds
    );
    expect(result.summary.durationSeconds).toBeLessThanOrEqual(
      FLOOR_CARE_INTRO_PROBE_CONSTRAINTS.maxDurationSeconds
    );
    expect(result.summary.fileSizeBytes).toBeLessThanOrEqual(
      FLOOR_CARE_INTRO_PROBE_CONSTRAINTS.maxFileSizeBytes
    );

    expect(result.frames.map((f) => f.label)).toEqual(['opening', 'midpoint', 'ending']);
    for (const frame of result.frames) {
      expect(frame.sha256).toMatch(/^[0-9a-f]{64}$/);
      const info = await stat(frame.path);
      expect(info.size).toBeGreaterThan(0);
    }
    // Three distinct representative frames should not be byte-identical.
    const hashes = new Set(result.frames.map((f) => f.sha256));
    expect(hashes.size).toBe(3);
  }, 120_000);

  afterAll(async () => {
    await rm(evidenceDir, { recursive: true, force: true });
  });
});

describe('runCapture bounded timeout', () => {
  it('rejects a hung child process instead of waiting forever', async () => {
    const start = Date.now();
    await expect(
      runCapture(process.execPath, ['-e', 'setInterval(() => {}, 1000);'], { timeoutMs: 300 })
    ).rejects.toThrow(/timed out/i);
    expect(Date.now() - start).toBeLessThan(2000);
  }, 3000);

  it('does not wait for the timeout when the child errors immediately (e.g. missing binary)', async () => {
    const start = Date.now();
    let error: unknown;
    try {
      await runCapture('carsi-does-not-exist-binary-xyz', [], { timeoutMs: 5000 });
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    expect(String(error)).not.toMatch(/timed out/i);
    expect(Date.now() - start).toBeLessThan(1000);
  }, 3000);

  it('resolves normally for a fast command well within the timeout', async () => {
    const result = await runCapture(process.execPath, ['-e', 'process.stdout.write("ok")'], {
      timeoutMs: 5000,
    });
    expect(result.stdout).toBe('ok');
  }, 5000);
});

describe('verifyFloorCareIntroVideo fails closed', () => {
  let evidenceDir: string;

  beforeEach(async () => {
    evidenceDir = await mkdtemp(join(tmpdir(), 'carsi-floor-care-verify-failclosed-'));
  });

  afterEach(async () => {
    await rm(evidenceDir, { recursive: true, force: true });
  });

  it('stops at an invalid probe and never invokes decode or frame extraction', async () => {
    const badMp4 = join(evidenceDir, 'bad-resolution.mp4');
    await runCapture(ffmpegBinaryPath(), [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-f',
      'lavfi',
      '-i',
      'testsrc=duration=1:size=320x240:rate=25',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=1000:duration=1',
      '-c:v',
      'libx264',
      '-c:a',
      'aac',
      '-shortest',
      badMp4,
    ]);

    let calls = 0;
    const countingRunCapture: RunCaptureFn = async (command, args) => {
      calls += 1;
      return runCapture(command, args);
    };

    const result = await verifyFloorCareIntroVideo(badMp4, evidenceDir, { runCapture: countingRunCapture });

    expect(result.valid).toBe(false);
    expect(result.decoded).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.frames).toEqual([]);
    expect(calls).toBe(1);
  }, 30_000);

  it('catches a decode failure and reports valid:false, decoded:false instead of throwing', async () => {
    const failingRunCapture: RunCaptureFn = async (command, args) => {
      if (args.includes('-show_streams')) {
        return runCapture(command, args);
      }
      if (args.includes('null')) {
        throw new Error('simulated decode failure: moov atom corrupt');
      }
      return runCapture(command, args);
    };

    const result = await verifyFloorCareIntroVideo(FLOOR_CARE_MP4, evidenceDir, {
      runCapture: failingRunCapture,
    });

    expect(result.valid).toBe(false);
    expect(result.decoded).toBe(false);
    expect(result.errors.join(' ')).toMatch(/decode/i);
  }, 30_000);

  it('catches a frame-extraction failure, reports decoded:false, and keeps frames already collected', async () => {
    let frameCalls = 0;
    const failingRunCapture: RunCaptureFn = async (command, args) => {
      if (args.includes('-frames:v')) {
        frameCalls += 1;
        if (frameCalls === 2) {
          throw new Error('simulated frame extraction failure');
        }
      }
      return runCapture(command, args);
    };

    const result = await verifyFloorCareIntroVideo(FLOOR_CARE_MP4, evidenceDir, {
      runCapture: failingRunCapture,
    });

    expect(result.valid).toBe(false);
    expect(result.decoded).toBe(false);
    expect(result.errors.join(' ')).toMatch(/frame/i);
    expect(result.frames.length).toBe(1);
    expect(result.frames[0].label).toBe('opening');
  }, 60_000);
});
