/**
 * Pixel size of a PNG or WebP from its header bytes, so a test can prove the width/height
 * declared for a card image match the file. Images are served byte for byte here
 * (next.config.ts sets images.unoptimized), so a mismatch shows as a layout shift.
 * Throws on any other format rather than guessing.
 */
export function readImageSize(bytes: Uint8Array): { width: number; height: number; format: string } {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (bytes[0] === 0x89 && ascii(1, 4) === 'PNG' && ascii(12, 16) === 'IHDR') {
    return { width: view.getUint32(16), height: view.getUint32(20), format: 'png' };
  }

  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') {
    const chunk = ascii(12, 16);
    if (chunk === 'VP8X') {
      const w = bytes[24] | (bytes[25] << 8) | (bytes[26] << 16);
      const h = bytes[27] | (bytes[28] << 8) | (bytes[29] << 16);
      return { width: w + 1, height: h + 1, format: 'webp-vp8x' };
    }
    if (chunk === 'VP8L') {
      const bits = view.getUint32(21, true);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, format: 'webp-vp8l' };
    }
    if (chunk === 'VP8 ') {
      return {
        width: view.getUint16(26, true) & 0x3fff,
        height: view.getUint16(28, true) & 0x3fff,
        format: 'webp-vp8',
      };
    }
  }

  throw new Error('readImageSize: not a PNG or WebP file');
}
