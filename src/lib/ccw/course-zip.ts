/** Public URL path (file lives under `/public`). Single source for client + docs. */
export const CCW_COURSE_ZIP_PATH = '/2 Day CARSI - CCW Course-20260419T212049Z-3-001.zip' as const;

/** Safe href for `<a download>` (spaces encoded). */
export const CCW_COURSE_ZIP_HREF = encodeURI(CCW_COURSE_ZIP_PATH);
