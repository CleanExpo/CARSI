import { permanentRedirect } from 'next/navigation';

/** Legacy path: workshop materials live under /ccw-training/workshop. */
export default function CcwMaterialsRedirectPage() {
  permanentRedirect('/ccw-training/workshop?section=materials');
}
