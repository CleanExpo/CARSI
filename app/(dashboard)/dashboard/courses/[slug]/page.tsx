export { default, generateMetadata } from '../../../../(public)/courses/[slug]/page';

// Mirror the public course page config here instead of re-exporting it, so Next.js
// can statically analyse the route segment config.
export const dynamic = 'force-dynamic';
