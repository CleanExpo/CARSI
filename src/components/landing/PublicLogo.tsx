import Image from 'next/image';

type PublicLogoProps = {
  variant: 'nav' | 'footer' | 'auth';
  /** Kept for callers; both surfaces use the official wordmark. */
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
export function PublicLogo({ variant }: PublicLogoProps) {
  const config = logoConfig[variant];

  return (
    <Image
      src="/logo/logo1.png"
      alt="CARSI"
      width={config.width}
      height={config.height}
      className={config.className}
      sizes={config.sizes}
      priority={config.priority}
    />
  );
}
