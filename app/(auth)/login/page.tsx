import { LoginForm } from '@/components/auth/login-form';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div
      className="rounded-xl bg-white p-6 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200 sm:p-8"
      style={{
        border: '1px solid rgba(15,23,42,0.05)',
      }}
    >
      <div className="mb-6 space-y-1.5">
        <h1 className="text-2xl font-bold text-slate-950">Sign in</h1>
        <p className="text-sm text-slate-600">
          Enter your email and password to access your account
        </p>
        <p className="text-xs font-semibold tracking-wide text-[#146fc2]">
          IICRC CEC Accredited restoration training
        </p>
      </div>

      <LoginForm />

      <div className="mt-5 text-center text-sm">
        <span className="text-slate-600">Don&apos;t have an account? </span>
        <Link
          href="/register"
          className="font-semibold text-[#146fc2] underline decoration-[#146fc2]/25 underline-offset-4 transition-colors duration-150 hover:text-[#0f5fa8]"
        >
          Sign up
        </Link>
      </div>
      <div className="mt-2 text-center text-sm">
        <Link
          href="/forgot-password"
          className="text-slate-500 underline decoration-slate-300 underline-offset-4 transition-colors duration-150 hover:text-slate-950"
        >
          Forgot your password?
        </Link>
      </div>
    </div>
  );
}
