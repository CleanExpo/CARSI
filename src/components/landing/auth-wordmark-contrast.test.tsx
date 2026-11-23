import { join } from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import AuthLayout from '../../../app/(auth)/layout';
import { PublicLogo } from './PublicLogo';
import { PUBLIC_CHROME_AUTH_BAND_CLASS } from './public-shell-width';

/**
 * GP-779 live smoke found the CARSI wordmark on /login (and every other page under
 * app/(auth)) rendering as dark navy lettering on the dark navy auth band, so the
 * brand name was close to invisible at 1440 and 390 wide.
 *
 * A snapshot of the markup would not have caught it: the markup was valid, the image
 * loaded, and the alt text was right. The defect lives in the pixels. So this test
 * reads the actual logo file the auth band renders, takes the dominant colour of the
 * CARSI lettering, and measures its WCAG contrast against every colour stop of the
 * band gradient, which it reads from the band's own class string so a future change
 * to either side is checked rather than assumed.
 */

const PUBLIC_DIR = join(process.cwd(), 'public');

/** WCAG 2.x 1.4.3 minimum for normal text; the logotype is text, so hold it to that. */
const MIN_CONTRAST = 4.5;

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Every `from-[#…]`, `via-[#…]` and `to-[#…]` stop of the auth band gradient. */
function bandStops(): Rgb[] {
  const stops = [...PUBLIC_CHROME_AUTH_BAND_CLASS.matchAll(/(?:from|via|to)-\[#([0-9a-f]{6})\]/gi)];
  return stops.map((m) => hexToRgb(m[1]));
}

/** The public path of the logo image the auth layout renders (unwrapping next/image). */
function authLogoPath(): string {
  const html = renderToStaticMarkup(
    <AuthLayout>
      <div />
    </AuthLayout>
  );
  const img = html.match(/<img[^>]*alt="CARSI"[^>]*>/);
  expect(img, 'auth layout renders the CARSI wordmark').not.toBeNull();
  const src = img![0].match(/\ssrc="([^"]+)"/)![1].replace(/&amp;/g, '&');
  return src.startsWith('/_next/image')
    ? decodeURIComponent(new URL(src, 'http://x').searchParams.get('url')!)
    : src;
}

/**
 * Mean colour of the opaque pixels in the logotype part of the image. The 3D mark sits
 * in the left ~30% of the asset and is blue on every variant; the CARSI lettering is to
 * its right, and that is the part that went invisible.
 */
async function logotypeColour(publicPath: string): Promise<Rgb> {
  const { data, info } = await sharp(join(PUBLIC_DIR, publicPath))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const sum = [0, 0, 0];
  let n = 0;
  const startX = Math.floor(info.width * 0.3);
  for (let y = 0; y < info.height; y++) {
    for (let x = startX; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      if (data[i + 3] < 200) continue;
      sum[0] += data[i];
      sum[1] += data[i + 1];
      sum[2] += data[i + 2];
      n++;
    }
  }
  expect(n, 'logotype region has opaque pixels').toBeGreaterThan(1000);
  return sum.map((s) => Math.round(s / n)) as Rgb;
}

describe('auth band wordmark contrast (GP-779)', () => {
  it('reads the band colours from the band class', () => {
    expect(bandStops().length).toBeGreaterThanOrEqual(2);
  });

  it('renders a wordmark whose lettering is legible on every stop of the dark auth band', async () => {
    const logo = authLogoPath();
    const ink = await logotypeColour(logo);
    for (const stop of bandStops()) {
      const ratio = contrast(ink, stop);
      expect(
        ratio,
        `${logo} lettering rgb(${ink}) on band rgb(${stop}) is ${ratio.toFixed(2)}:1`
      ).toBeGreaterThanOrEqual(MIN_CONTRAST);
    }
  });

  it('keeps the navy-lettered wordmark on light surfaces, where it already reads', () => {
    const light = renderToStaticMarkup(<PublicLogo variant="nav" surface="light" />);
    const byDefault = renderToStaticMarkup(<PublicLogo variant="footer" />);
    expect(light).toContain(encodeURIComponent('/logo/logo1.png'));
    expect(byDefault).toContain(encodeURIComponent('/logo/logo1.png'));
    expect(light).toContain('data-pv-allow="logo"');
  });
});
