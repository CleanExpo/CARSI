import { describe, it, expect } from 'vitest';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildFloorCareIntroScenes,
  buildFloorCareSegmentFilter,
  buildFloorCareIntroCandidatePath,
  parseFfmpegProbeOutput,
  validateFloorCareIntroVideo,
  validateFloorCareIntroSceneAssets,
  FLOOR_CARE_INTRO_VIDEO_CONSTRAINTS,
  type FfmpegProbe,
} from './floor-care-intro-plan';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

describe('buildFloorCareIntroScenes', () => {
  const scenes = buildFloorCareIntroScenes();

  it('returns an ordered, non-empty list of scenes covering all four services', () => {
    expect(scenes.length).toBeGreaterThanOrEqual(6);
    const allText = scenes.map((s) => `${s.caption} ${s.narration}`).join(' ').toLowerCase();
    expect(allText).toContain('carpet');
    expect(allText).toContain('tile');
    expect(allText).toContain('vinyl');
    expect(allText).toContain('pressure wash');
  });

  it('mentions WHS/SDS, child-safety and documentation without overclaiming', () => {
    const allText = scenes.map((s) => `${s.caption} ${s.narration}`).join(' ').toLowerCase();
    expect(allText).toMatch(/whs/);
    expect(allText).toMatch(/sds|safety data sheet/);
    expect(allText).toMatch(/child/);
    expect(allText).toMatch(/document/);
  });

  it('never mentions IICRC, CEC, accreditation or certification (non-IICRC floor-care course)', () => {
    const allText = scenes.map((s) => `${s.caption} ${s.narration}`).join(' ').toLowerCase();
    expect(allText).not.toMatch(/iicrc/);
    expect(allText).not.toMatch(/\bcec\b/);
    expect(allText).not.toMatch(/accredit/);
    expect(allText).not.toMatch(/certif/);
  });

  it('every scene references an existing repository image path', () => {
    for (const scene of scenes) {
      expect(scene.image).toMatch(/^public\//);
    }
  });
});

describe('buildFloorCareSegmentFilter', () => {
  it('builds a 1280x720 branded caption filter and escapes punctuation safely', () => {
    const filter = buildFloorCareSegmentFilter("Tile & Grout: schools' edition");
    expect(filter).toContain('scale=1280:720');
    expect(filter).toContain('crop=1280:720');
    expect(filter).toContain('drawbox=');
    expect(filter).toContain('drawtext=');
    expect(filter).toContain("schools\\' edition");
  });
});

describe('parseFfmpegProbeOutput', () => {
  const sample = `
  Duration: 00:00:52.30, start: 0.000000, bitrate: 900 kb/s
  Stream #0:0(und): Video: h264 (High) (avc1 / 0x31637661), yuv420p, 1280x720 [SAR 1:1 DAR 16:9], 700 kb/s, 25 fps, 25 tbr, 12800 tbn, 50 tbc (default)
  Stream #0:1(und): Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, stereo, fltp, 128 kb/s (default)
  `;

  it('extracts duration, resolution and codecs', () => {
    const probe = parseFfmpegProbeOutput(sample);
    expect(probe).not.toBeNull();
    expect(probe?.durationSeconds).toBeCloseTo(52.3, 1);
    expect(probe?.width).toBe(1280);
    expect(probe?.height).toBe(720);
    expect(probe?.videoCodec).toBe('h264');
    expect(probe?.audioCodec).toBe('aac');
  });

  it('returns null when no Duration line is present', () => {
    expect(parseFfmpegProbeOutput('nothing useful here')).toBeNull();
  });
});

describe('validateFloorCareIntroVideo', () => {
  const goodProbe: FfmpegProbe = {
    durationSeconds: 50,
    width: 1280,
    height: 720,
    videoCodec: 'h264',
    audioCodec: 'aac',
  };
  const goodSize = 4 * 1024 * 1024;

  it('accepts a probe that satisfies every AC2 constraint', () => {
    const result = validateFloorCareIntroVideo(goodProbe, goodSize);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects resolution below 1280x720', () => {
    const result = validateFloorCareIntroVideo({ ...goodProbe, width: 640, height: 360 }, goodSize);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/resolution/i);
  });

  it('rejects a non-16:9 aspect ratio', () => {
    const result = validateFloorCareIntroVideo({ ...goodProbe, width: 1280, height: 1000 }, goodSize);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/aspect/i);
  });

  it('rejects missing audio', () => {
    const result = validateFloorCareIntroVideo({ ...goodProbe, audioCodec: null }, goodSize);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/audio/i);
  });

  it('rejects duration outside 30-75 seconds', () => {
    expect(validateFloorCareIntroVideo({ ...goodProbe, durationSeconds: 20 }, goodSize).valid).toBe(false);
    expect(validateFloorCareIntroVideo({ ...goodProbe, durationSeconds: 90 }, goodSize).valid).toBe(false);
  });

  it('rejects a file over 12 MiB', () => {
    const result = validateFloorCareIntroVideo(goodProbe, FLOOR_CARE_INTRO_VIDEO_CONSTRAINTS.maxFileSizeBytes + 1);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/size/i);
  });
});

describe('validateFloorCareIntroSceneAssets', () => {
  it('accepts the current scene set, whose image files all exist in the repository', async () => {
    const result = await validateFloorCareIntroSceneAssets(buildFloorCareIntroScenes(), repoRoot);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects a scene that references a deliberately missing image file', async () => {
    const scenes = [
      ...buildFloorCareIntroScenes(),
      {
        id: 'missing-scene',
        image: 'public/images/courses/does-not-exist-floor-care.webp',
        caption: 'Missing',
        narration: 'This scene points at a file that was never created.',
      },
    ];
    const result = await validateFloorCareIntroSceneAssets(scenes, repoRoot);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/missing-scene/);
    expect(result.errors.join(' ')).toMatch(/does-not-exist-floor-care\.webp/);
  });
});

describe('buildFloorCareIntroCandidatePath', () => {
  it('builds a candidate path in the same directory as the final output path', () => {
    const outputPath = resolve(repoRoot, 'public/videos/course-intros/commercial-floor-care-schools-childcare.mp4');
    const candidate = buildFloorCareIntroCandidatePath(outputPath);
    expect(dirname(candidate)).toBe(dirname(outputPath));
    expect(candidate).not.toBe(outputPath);
    expect(candidate.endsWith('.mp4')).toBe(true);
  });
});
