import { describe, expect, it } from 'vitest';

import { readImageSize } from './image-size';

/**
 * Card images are served byte for byte (next.config.ts sets images.unoptimized), so the
 * width/height declared in products.ts must equal the file's real pixels or the card box
 * snaps when the image decodes. These headers are built by hand so each format branch is
 * proven against known bytes, not against the one file that happens to be committed.
 */

function png(width: number, height: number): Uint8Array {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  b.set([0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52], 8); // IHDR chunk header
  new DataView(b.buffer).setUint32(16, width);
  new DataView(b.buffer).setUint32(20, height);
  return b;
}

function riff(chunk: string, body: number[]): Uint8Array {
  const b = new Uint8Array(40);
  b.set([...'RIFF'].map((c) => c.charCodeAt(0)), 0);
  b.set([...'WEBP'].map((c) => c.charCodeAt(0)), 8);
  b.set([...chunk].map((c) => c.charCodeAt(0)), 12);
  b.set(body, 20);
  return b;
}

function vp8x(width: number, height: number): Uint8Array {
  const w = width - 1;
  const h = height - 1;
  return riff('VP8X', [0, 0, 0, 0, w & 0xff, (w >> 8) & 0xff, (w >> 16) & 0xff, h & 0xff, (h >> 8) & 0xff, (h >> 16) & 0xff]);
}

function vp8l(width: number, height: number): Uint8Array {
  const bits = (width - 1) | ((height - 1) << 14);
  return riff('VP8L', [0x2f, bits & 0xff, (bits >> 8) & 0xff, (bits >> 16) & 0xff, (bits >> 24) & 0xff]);
}

function vp8(width: number, height: number): Uint8Array {
  return riff('VP8 ', [0, 0, 0, 0x9d, 0x01, 0x2a, width & 0xff, (width >> 8) & 0x3f, height & 0xff, (height >> 8) & 0x3f]);
}

describe('readImageSize', () => {
  it.each([
    ['png', png(480, 402)],
    ['webp-vp8x', vp8x(480, 402)],
    ['webp-vp8l', vp8l(480, 402)],
    ['webp-vp8', vp8(480, 402)],
  ])('reads %s dimensions', (format, bytes) => {
    const size = readImageSize(bytes);
    expect(size).toEqual({ width: 480, height: 402, format });
  });

  it('distinguishes a 481 px image from a 480 px one (positive control for the size cap)', () => {
    expect(readImageSize(vp8x(481, 402)).width).toBe(481);
    expect(readImageSize(png(481, 402)).width).toBe(481);
  });

  it('throws on a format it does not understand rather than guessing', () => {
    expect(() => readImageSize(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]))).toThrow();
  });
});
