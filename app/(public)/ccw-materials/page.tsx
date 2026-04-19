import { permanentRedirect } from 'next/navigation';

/** Legacy path: single landing lives at /ccw-training (materials anchor). */
export default function CcwMaterialsRedirectPage() {
  permanentRedirect('/ccw-training?section=materials');
}
