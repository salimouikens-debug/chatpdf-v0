"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatPdfLogo } from "@/components/chatpdf-logo";
import { AuthVisualPanel } from "@/components/auth-visual-panel";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { createClient } from "@/lib/supabase/client";
import { useTranslation, TranslationKey } from "@/lib/i18n";

export default function SignupPage() {
  const t = useTranslation();
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (
      data?.user &&
      data.user.identities &&
      data.user.identities.length === 0
    ) {
      setError("This account already exists. Please sign in.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }

    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "signup",
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  async function handleGoogleSignup() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
    }
  }

  /* ────── OTP Verification Screen ────── */
  if (success) {
    return (
      <div className="flex min-h-screen">
        <AuthVisualPanel />

        <div className="relative flex w-full flex-col bg-white lg:w-1/2">
          <div className="flex items-center justify-between px-6 py-5 sm:px-10">
            <div className="lg:hidden">
              <ChatPdfLogo variant="light" size={36} />
            </div>
            <div className="lg:flex-1" />
            <Link href="/login">
              <Button
                variant="outline"
                className="rounded-full border-gray-300 px-5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Login
              </Button>
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center px-6 sm:px-10">
            <div className="w-full max-w-[420px] text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
                <CheckCircle2 className="h-7 w-7 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                Confirm your email
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                We sent a confirmation code to{" "}
                <strong className="text-gray-700">{email}</strong>.
                <br />
                Please enter it below to activate your account.
              </p>

              <form
                onSubmit={handleVerifyOtp}
                className="mt-8 flex flex-col items-center gap-5"
              >
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>

                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="h-12 w-full rounded-xl bg-gradient-to-r from-gray-800 to-gray-900 text-sm font-medium text-white shadow-sm hover:from-gray-700 hover:to-gray-800 transition-all"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Verify Code"
                  )}
                </Button>
              </form>

              <button
                onClick={() => setSuccess(false)}
                className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                type="button"
              >
                Back to sign up
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ────── Signup Form ────── */
  return (
    <div className="flex min-h-screen">
      <AuthVisualPanel />

      <div className="relative flex w-full flex-col bg-white lg:w-1/2">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-5 sm:px-10">
          <div className="lg:hidden">
            <ChatPdfLogo variant="light" size={36} />
          </div>
          <div className="lg:flex-1" />
          <Link href="/login">
            <Button
              variant="outline"
              className="rounded-full border-gray-300 px-5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t("loginBtn" as TranslationKey)}
            </Button>
          </Link>
        </div>

        {/* Centered form */}
        <div className="flex flex-1 items-center justify-center px-6 sm:px-10">
          <div className="w-full max-w-[420px]">
            <h1 className="text-3xl font-bold text-gray-900">
              {t("signupWelcome" as TranslationKey)}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {t("signupDesc" as TranslationKey)}
            </p>

            <form onSubmit={handleEmailSignup} className="mt-8 space-y-4">
              {/* Email */}
              <div>
                <input
                  type="email"
                  placeholder={t("emailPlaceholder" as TranslationKey)}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50/60 px-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password (min. 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50/60 px-4 pr-11 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-[18px] w-[18px]" />
                  ) : (
                    <Eye className="h-[18px] w-[18px]" />
                  )}
                </button>
              </div>

              {/* Confirm password */}
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50/60 px-4 pr-11 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? (
                    <EyeOff className="h-[18px] w-[18px]" />
                  ) : (
                    <Eye className="h-[18px] w-[18px]" />
                  )}
                </button>
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-gray-800 to-gray-900 text-sm font-medium text-white shadow-sm hover:from-gray-700 hover:to-gray-800 transition-all"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {t("continueEmailSignup" as TranslationKey)}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-gray-400">
                  {t("orContinueWith" as TranslationKey)}
                </span>
              </div>
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleSignup}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>

            {/* Terms */}
            <p className="mt-6 text-center text-xs leading-relaxed text-gray-400">
              By creating an account, you agree to our{" "}
              <span className="text-gray-600 underline cursor-pointer">
                Terms of Service
              </span>{" "}
              and{" "}
              <span className="text-gray-600 underline cursor-pointer">
                Privacy Policy
              </span>
            </p>

            {/* Trust badge */}
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-400">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>{t("trustBadge" as TranslationKey)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
