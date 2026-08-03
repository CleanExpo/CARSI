import Image from 'next/image';

type PublicLogoProps = {
  variant: 'nav' | 'footer' | 'auth';
  /** Chrome = silver wordmark on dark; light = blue mark + typographic wordmark. */
  surface?: 'chrome' | 'light';
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

/** CARSI wordmark. Chrome for dark bars; light for white professional surfaces. */
export function PublicLogo({ variant, surface = 'chrome' }: PublicLogoProps) {
  if (surface === 'light') {
    const markSize = variant === 'footer' ? 44 : variant === 'auth' ? 48 : 36;
    const textClass =
      variant === 'footer'
        ? 'text-3xl tracking-[-0.04em]'
        : variant === 'auth'
          ? 'text-4xl tracking-[-0.04em]'
          : 'text-xl tracking-[-0.03em]';

    return (
      <span className="inline-flex items-center gap-2.5">
        <Image
          src="/logo.png"
          alt=""
          width={markSize}
          height={markSize}
          className="shrink-0 rounded-[0.65rem] object-contain"
          priority={variant === 'nav' || variant === 'auth'}
          aria-hidden
        />
        <span
          className={`font-[family-name:var(--font-display)] font-bold text-slate-950 ${textClass}`}
        >
          CARSI
        </span>
      </span>
    );
  }

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
