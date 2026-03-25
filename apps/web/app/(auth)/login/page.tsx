import { LoginForm } from '@/components/auth/login-form';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="rounded-sm border border-border bg-card p-6 sm:p-8">
      <div className="mb-6 space-y-1.5">
        <h1 className="text-2xl font-bold text-foreground">
          Sign in
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and password to access your account
        </p>
        <p className="text-xs font-medium tracking-wide text-primary">
          IICRC CEC-approved restoration training
        </p>
      </div>

      <LoginForm />

      <div className="mt-5 text-center text-sm">
        <span className="text-muted-foreground">Don&apos;t have an account? </span>
        <Link
          href="/register"
          className="font-medium text-primary underline decoration-white/20 underline-offset-4 transition-colors duration-150 hover:text-white hover:decoration-white/50"
        >
          Sign up
        </Link>
      </div>
      <div className="mt-2 text-center text-sm">
        <Link
          href="/forgot-password"
          className="text-muted-foreground underline decoration-white/10 underline-offset-4 transition-colors duration-150 hover:text-white hover:decoration-white/30"
        >
          Forgot your password?
        </Link>
      </div>
    </div>
  );
}
