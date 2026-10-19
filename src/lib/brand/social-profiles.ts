/**
 * CARSI's social profiles — the single source for every on-site link and the Organisation
 * JSON-LD `sameAs`. Each entry was checked live on 19/10/2026 (HTTP 200 and the page names
 * CARSI's own handle). Add a profile only after the same check; CARSI has no X or TikTok
 * account, so neither appears here or in the Twitter card metadata.
 */
export type SocialProfile = {
  id: 'facebook' | 'linkedin' | 'youtube' | 'instagram' | 'podcast';
  label: string;
  url: string;
};

export const CARSI_SOCIAL_PROFILES: readonly SocialProfile[] = [
  { id: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/CARSIaus' },
  { id: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/company/carsiaus' },
  {
    id: 'youtube',
    label: 'YouTube',
    url: 'https://www.youtube.com/channel/UC3HpNvGJXivLGoPo4m7Qleg',
  },
  { id: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/carsi_aus/' },
  { id: 'podcast', label: 'Podcast', url: 'https://open.spotify.com/show/4FVBn8Cfyx2jOx0m4MksuG' },
];

export const CARSI_SOCIAL_PROFILE_URLS: readonly string[] = CARSI_SOCIAL_PROFILES.map((p) => p.url);

export function socialProfileUrl(id: SocialProfile['id']): string {
  const profile = CARSI_SOCIAL_PROFILES.find((p) => p.id === id);
  if (!profile) throw new Error(`Unknown CARSI social profile: ${id}`);
  return profile.url;
}

/** CARSI's LinkedIn Page id (urn:li:organization:65591140, read from its Page on 19/10/2026). */
export const CARSI_LINKEDIN_ORGANIZATION_ID = '65591140';
