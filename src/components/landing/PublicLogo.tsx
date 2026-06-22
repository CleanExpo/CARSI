import Image from 'next/image';

type PublicLogoProps = {
  variant: 'nav' | 'footer' | 'auth';
};

const logoConfig = {
  nav: {
    width: 240,
    height: 64,
    className: 'h-auto max-h-14 w-auto max-w-[min(240px,48vw)] object-contain object-left',
    sizes: '(max-width: 768px) 48vw, 240px',
    priority: true,
  },
  footer: {
    width: 480,
    height: 96,
    className: 'h-auto max-h-20 w-auto max-w-[min(360px,60vw)] object-contain object-left',
    sizes: undefined,
    priority: false,
  },
  auth: {
    width: 440,
    height: 88,
    className: 'h-auto max-h-24 w-auto max-w-[min(380px,92vw)] object-contain',
    sizes: '(max-width: 768px) 92vw, 380px',
    priority: true,
  },
} as const;

/** CARSI wordmark — intended for {@link PUBLIC_CHROME_NAV_CLASS} / footer chrome surfaces. */
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
