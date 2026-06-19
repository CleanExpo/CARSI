import Image from 'next/image';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-4"
      style={{ background: '#f6f8fb' }}
    >
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(36,144,237,0.12) 0%, transparent 62%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md py-12">
        {/* Logo + Wordmark */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <Link href="/" className="flex items-center justify-center">
            <Image
              src="/logo/logo1.png"
              alt="CARSI"
              width={440}
              height={88}
              className="h-auto w-auto max-h-24 max-w-[min(380px,92vw)] object-contain"
              priority
            />
          </Link>
          <Link
            href="/"
            className="text-xs font-medium text-slate-500 transition-colors duration-150 hover:text-slate-950"
          >
            &larr; Back to home
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
}
