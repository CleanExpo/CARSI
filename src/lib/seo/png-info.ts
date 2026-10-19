import { readFileSync } from 'node:fs';

export type PngInfo = {
  width: number;
  height: number;
  colourType: number;
  hasTransparency: boolean;
};

/** Reads a PNG's IHDR (size, colour type) and whether it carries any alpha/transparency. */
export function readPngInfo(path: string): PngInfo {
  const buf = readFileSync(path);
  if (buf.toString('latin1', 1, 4) !== 'PNG') throw new Error(`${path} is not a PNG`);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const colourType = buf[25];
  // Colour types 4 and 6 carry an alpha channel; a tRNS chunk adds transparency to 0/2/3.
  const hasTransparency =
    colourType === 4 || colourType === 6 || buf.includes('tRNS', 33, 'latin1');
  return { width, height, colourType, hasTransparency };
}
