# CCW Take-Home Materials — Server-Only Files

Files in this folder are served **only** through the authenticated API route
`/api/ccw-materials/download?file=<key>` after a caller presents a valid CCW
access cookie set by `/api/ccw-materials/auth`.

**These files are intentionally NOT under `public/`.** If they were, anyone
who guessed a filename could download them directly — bypassing the password
gate. Keeping them here and streaming them through the API guarantees every
download checks the cookie.

## Files in this folder

| Key (API param)            | Filename                                |
| -------------------------- | --------------------------------------- |
| `participant-manual-pdf`   | `CARSI_Participant_Manual.pdf`          |
| `participant-manual-docx`  | `CARSI_Participant_Manual.docx`         |
| `ccw-product-guide`        | `CARSI_CCW_Product_Guide.docx`          |

## Adding or replacing a file

1. Drop the new file in this directory.
2. Register it in `src/lib/ccw/file-registry.ts` with a unique `key`, the
   filename, a display name, and the byte size.
3. Ship it. The page and download API pick up the registry automatically.

## Password rotation

The workshop password is the `CCW_ACCESS_PASSWORD` environment variable in
Vercel. Change it in the Vercel project settings and redeploy (or use
Vercel's "Redeploy" action on the current production deployment). Existing
signed-in participants keep access until their 7-day cookie expires unless
you also rotate `CCW_COOKIE_SECRET`, which invalidates all outstanding
cookies immediately.
