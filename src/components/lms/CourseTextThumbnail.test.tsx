import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { CourseTextThumbnail } from './CourseTextThumbnail';

/**
 * Every course surface — the catalogue grid via CourseCard, the course-page hero and the
 * dashboard via CourseThumbnail — funnels its backdrop image through this component. These
 * cases pin the Cloudinary delivery transformation to the rendered `<img src>` rather than to
 * the helper alone, because the defect was never that the helper was wrong: it was that nothing
 * called one. Measured on production 2026-08-18, /courses shipped 22 raw PNGs totalling
 * 48,486,199 bytes into cards a few hundred pixels wide.
 */
const RAW_CLOUDINARY =
  'https://res.cloudinary.com/dmaulkthb/image/upload/v1782410710/carsi/admin-courses/9e530122-2810-43e5-81e9-f30941703ceb.png';

function srcOf(markup: string): string | null {
  return markup.match(/<img[^>]*\ssrc="([^"]+)"/)?.[1] ?? null;
}

describe('CourseTextThumbnail backdrop delivery', () => {
  it('requests a card-sized image for the catalogue grid', () => {
    const markup = renderToStaticMarkup(
      <CourseTextThumbnail variant="card" title="Water Damage Restoration" backdropImageSrc={RAW_CLOUDINARY} />,
    );
    const src = srcOf(markup);
    expect(src).toContain('f_auto,q_auto,c_limit,w_400');
    expect(src, 'the raw upload must not reach the browser').not.toMatch(/upload\/v1782410710/);
  });

  it('requests a larger image for the course-page hero', () => {
    const markup = renderToStaticMarkup(
      <CourseTextThumbnail variant="hero" title="Water Damage Restoration" backdropImageSrc={RAW_CLOUDINARY} />,
    );
    expect(srcOf(markup)).toContain('f_auto,q_auto,c_limit,w_1200');
  });

  it('leaves a non-Cloudinary backdrop untouched', () => {
    const local = '/images/course-fallback.png';
    const markup = renderToStaticMarkup(
      <CourseTextThumbnail variant="card" title="Local" backdropImageSrc={local} />,
    );
    expect(srcOf(markup)).toBe(local);
  });

  it('renders no image at all when there is no backdrop', () => {
    const markup = renderToStaticMarkup(<CourseTextThumbnail variant="card" title="No image" />);
    expect(srcOf(markup)).toBeNull();
  });
});
