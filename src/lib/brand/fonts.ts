import { Fraunces, JetBrains_Mono, Manrope } from 'next/font/google';

/** Editorial display — public marketing + key headings (Premium Visual standard). */
export const fontDisplay = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

/** Interface and body copy. */
export const fontSans = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

/** Technical labels, data, and code. */
export const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});