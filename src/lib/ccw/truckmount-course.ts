/** CCW-CARSI Truckmount Operations Course — public asset paths (files live under `/public`). */

/** Interactive, print-ready course pack (open in browser → Cmd/Ctrl-P for PDF). */
export const TRUCKMOUNT_PACK_HTML_PATH =
  '/courses/ccw-carsi-truckmount/course-pack.html' as const;

/** Downloadable PDF edition of the full course pack. */
export const TRUCKMOUNT_PACK_PDF_PATH =
  '/courses/ccw-carsi-truckmount/CCW-CARSI-Truckmount-Operations-Course.pdf' as const;

/** Safe hrefs for links/downloads (encodes any spaces). */
export const TRUCKMOUNT_PACK_HTML_HREF = encodeURI(TRUCKMOUNT_PACK_HTML_PATH);
export const TRUCKMOUNT_PACK_PDF_HREF = encodeURI(TRUCKMOUNT_PACK_PDF_PATH);
