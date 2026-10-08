export type FormSurface = 'light' | 'dark';

/** Explicit surface colours: independent of the page's global dark-mode setting. */
export const formSurfaceStyles = {
  light: {
    card: 'border-[#d1d5db] bg-[#ffffff] [color-scheme:light]',
    label: 'text-[#374151]',
    help: 'text-[#4b5563]',
    input:
      'border-[#6b7280] bg-[#ffffff] text-[#1f2937] placeholder:text-[#4b5563] focus-visible:ring-[#1d4ed8]',
    divider: 'border-[#d1d5db]',
    error: 'text-[#b91c1c]',
    link: 'text-[#146fc2]',
  },
  dark: {
    card: 'border-[#6b7280] bg-[#111827] [color-scheme:dark]',
    label: 'text-[#e5e7eb]',
    help: 'text-[#d1d5db]',
    input:
      'border-[#9ca3af] bg-[#1f2937] text-[#f9fafb] placeholder:text-[#d1d5db] focus-visible:ring-[#93c5fd]',
    divider: 'border-[#6b7280]',
    error: 'text-[#fca5a5]',
    link: 'text-[#93c5fd]',
  },
} satisfies Record<FormSurface, Record<string, string>>;
