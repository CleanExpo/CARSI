/** Public hub for the six role-specific authority guides (GP-661). */
export const ROLE_GUIDES_HUB_PATH = '/role-guides';

export function roleGuidePagePath(slug: string): string {
  return `${ROLE_GUIDES_HUB_PATH}/${slug}`;
}
