"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

export function LandingHeader() {
  const t = useTranslation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/70 dark:bg-[#0F172A]/80 backdrop-blur-xl border-b border-stone-200/50 dark:border-white/5 shadow-lg shadow-black/5 dark:shadow-black/10"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Spacer removed Logo */}
        <div className="w-[120px]" />

        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-stone-600 dark:text-white/60 hover:text-stone-900 dark:hover:text-white transition-colors">
            {t("landingFeatures")}
          </a>
          <a href="#demo" className="text-sm text-stone-600 dark:text-white/60 hover:text-stone-900 dark:hover:text-white transition-colors">
            {t("landingDemo")}
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle className="relative flex h-8 w-8 items-center justify-center rounded-full text-stone-600 dark:text-white/60 transition-all hover:bg-stone-200/50 dark:hover:bg-white/10 hover:text-stone-900 dark:hover:text-white" />
          <Button
            variant="ghost"
            className="text-stone-600 dark:text-white/70 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10"
            asChild
          >
            <Link href="/login">{t("landingLogin")}</Link>
          </Button>
          <Button
            className="bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25"
            asChild
          >
            <Link href="/signup">{t("landingSignup")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
