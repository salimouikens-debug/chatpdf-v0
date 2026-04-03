import { LandingHeader } from "@/components/landing-header";
import { HeroSection } from "@/components/hero-section";
import { ChatPreviewSection } from "@/components/chat-preview-section";
import { FeaturesSection } from "@/components/features-section";
import { SecuritySection } from "@/components/security-section";
import { LandingFooter } from "@/components/landing-footer";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F5F1EC] dark:bg-[#0F172A] text-stone-900 dark:text-white overflow-x-hidden">
      <LandingHeader />
      <HeroSection />
      <FeaturesSection />
      <ChatPreviewSection />
      <SecuritySection />

      {/* CTA Section */}
      <section className="relative py-24 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-[#EDE8E3] to-[#F5F1EC] dark:from-[#0A0F1A] dark:to-[#0F172A]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,rgba(59,130,246,0.08),transparent)] dark:bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,rgba(59,130,246,0.12),transparent)]" />

        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-stone-900 dark:text-white">
            Ready to chat with your{" "}
            <span className="bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
              documents
            </span>
            ?
          </h2>
          <p className="mt-6 text-lg text-stone-500 dark:text-white/50 max-w-xl mx-auto">
            Join thousands of students, researchers, and professionals who use Talk2PDF to work smarter with their documents.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-blue-500 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-blue-500/25 transition-all hover:bg-blue-600 hover:shadow-blue-500/40 hover:scale-[1.02]"
            >
              Get Started — It&apos;s Free
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-stone-300 dark:border-white/20 px-8 py-4 text-base font-semibold text-stone-700 dark:text-white transition-all hover:bg-stone-100 dark:hover:bg-white/10"
            >
              Try as Guest
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
