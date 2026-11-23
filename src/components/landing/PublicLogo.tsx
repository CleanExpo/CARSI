import Image from 'next/image';

import { CARSI_LOGO_SRC } from './carsi-logo';

type PublicLogoProps = {
  variant: 'nav' | 'footer' | 'auth';
  /**
   * Background the wordmark sits on. `light` (default) uses the navy-lettered
   * `/logo/logo1.png`; `chrome` is for the dark navy bands (auth card, dark nav and
   * footer) and uses the reversed white-lettered `/logo/dark-logo.png`, the same
   * official asset the transactional emails use. Navy lettering on navy measured
   * 1.03:1 contrast (GP-779 live smoke).
   */
  surface?: 'chrome' | 'light';
};

const logoConfig = {
  nav: {
    width: 220,
    height: 48,
    className: 'h-10 w-auto max-w-[min(200px,52vw)] object-contain object-left',
    sizes: '(max-width: 768px) 52vw, 200px',
    priority: true,
  },
  footer: {
    width: 280,
    height: 64,
    className: 'h-12 w-auto max-w-[min(260px,70vw)] object-contain object-left sm:h-14',
    sizes: '(max-width: 768px) 70vw, 260px',
    priority: false,
  },
  auth: {
    width: 280,
    height: 64,
    className: 'h-14 w-auto max-w-[min(240px,88vw)] object-contain',
    sizes: '(max-width: 768px) 88vw, 240px',
    priority: true,
  },
} as const;

/** Official CARSI wordmark — 3D mark + CARSI logotype. */
export function PublicLogo({ variant, surface = 'light' }: PublicLogoProps) {
  const config = logoConfig[variant];

  return (
    <Image
      src={CARSI_LOGO_SRC[surface]}
      alt="CARSI"
      width={config.width}
      height={config.height}
      className={config.className}
      sizes={config.sizes}
      priority={config.priority}
      data-pv-allow="logo"
    />
  );
}
