"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";


const TYPING_SPEED = 70;
const PAUSE_DURATION = 2200;
const DELETING_SPEED = 35;

function useTypewriter(phrases: string[]) {
  const [displayed, setDisplayed] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];

    const tick = () => {
      if (!isDeleting) {
        if (displayed.length < currentPhrase.length) {
          setDisplayed(currentPhrase.slice(0, displayed.length + 1));
          timeoutRef.current = setTimeout(tick, TYPING_SPEED);
        } else {
          timeoutRef.current = setTimeout(() => {
            setIsDeleting(true);
          }, PAUSE_DURATION);
        }
      } else {
        if (displayed.length > 0) {
          setDisplayed(currentPhrase.slice(0, displayed.length - 1));
          timeoutRef.current = setTimeout(tick, DELETING_SPEED);
        } else {
          setIsDeleting(false);
          setPhraseIndex((prev) => (prev + 1) % phrases.length);
        }
      }
    };

    timeoutRef.current = setTimeout(tick, isDeleting ? DELETING_SPEED : TYPING_SPEED);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [displayed, isDeleting, phraseIndex, phrases]);

  return displayed;
}

export function HeroSection() {
  const t = useTranslation();
  
  const TYPEWRITER_PHRASES = [
    t("askAnythingAbout") + " PDF…",
    t("feat2Title"),
    t("feat3Title"),
    t("feat4Title")
  ];
  
  const typed = useTypewriter(TYPEWRITER_PHRASES);

  return (
    <section className="relative h-screen min-h-[700px] flex items-center justify-center overflow-hidden">
      {/* Full-screen background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/3202364-hd_1920_1080_25fps.mp4" type="video/mp4" />
      </video>

      {/* Overlay on video for text readability */}
      <div className="absolute inset-0 bg-black/35 dark:bg-black/50" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 dark:from-[#0F172A]/60 via-transparent to-[#F5F1EC] dark:to-[#0F172A]" />

      {/* Content centered on top of video */}
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center flex flex-col items-center">
        <p className="text-base sm:text-lg text-blue-300 dark:text-blue-300/80 font-medium tracking-wide mb-6 drop-shadow-[0_1px_4px_rgba(0,0,0,0.3)]">
          {t("aiMeetsDoc")}
        </p>

        {/* Typewriter heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] min-h-[1.2em] drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
          <span className="text-white/90">{t("askQuestion")} </span>
          <span className="bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
            {typed}
          </span>
          <span className="animate-pulse text-blue-400">|</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-white/70 dark:text-white/50 max-w-xl leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
          {t("heroUpload")}
        </p>

        {/* Buttons */}
        <div className="mt-10 flex flex-wrap justify-center items-center gap-4">
          <Button
            size="lg"
            className="bg-blue-500 hover:bg-blue-600 text-white text-base px-8 py-6 rounded-xl shadow-xl shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:scale-[1.02]"
            asChild
          >
            <Link href="/signup">
              {t("startFreeBtn")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-stone-800/30 dark:border-white/30 bg-stone-900/10 dark:bg-transparent text-stone-900 dark:text-white hover:bg-stone-900/20 dark:hover:bg-white/15 hover:text-stone-900 dark:hover:text-white text-base px-8 py-6 rounded-xl backdrop-blur-sm transition-all"
            asChild
          >
            <Link href="/dashboard">{t("tryGuestBtn")}</Link>
          </Button>
        </div>

        <div className="mt-6 flex items-center gap-6 text-sm text-white/60 dark:text-white/40 drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            {t("noCreditCard")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            {t("mbLimit")}
          </span>
        </div>
      </div>

      {/* Bottom fade into next section */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#F5F1EC] dark:from-[#0F172A] to-transparent pointer-events-none" />
    </section>
  );
}
