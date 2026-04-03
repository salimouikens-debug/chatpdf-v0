"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquareText, Sparkles, Brain, ScanText } from "lucide-react";
import { useTranslation, TranslationKey } from "@/lib/i18n";


function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

export function FeaturesSection() {
  const { ref, isVisible } = useInView(0.1);
  const t = useTranslation();

  const FEATURES = [
    {
      icon: MessageSquareText,
      title: t("feat1Title" as TranslationKey),
      description: t("feat1Desc" as TranslationKey),
      gradient: "from-blue-500 to-blue-600",
      glow: "bg-blue-500/10",
    },
    {
      icon: Sparkles,
      title: t("feat2Title" as TranslationKey),
      description: t("feat2Desc" as TranslationKey),
      gradient: "from-purple-500 to-purple-600",
      glow: "bg-purple-500/10",
    },
    {
      icon: Brain,
      title: t("feat3Title" as TranslationKey),
      description: t("feat3Desc" as TranslationKey),
      gradient: "from-emerald-500 to-emerald-600",
      glow: "bg-emerald-500/10",
    },
    {
      icon: ScanText,
      title: t("feat4Title" as TranslationKey),
      description: t("feat4Desc" as TranslationKey),
      gradient: "from-amber-500 to-orange-600",
      glow: "bg-amber-500/10",
    },
  ];

  return (
    <section
      id="features"
      ref={ref}
      className="relative py-24 sm:py-32 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#F5F1EC] via-[#EDE8E3] to-[#E8E3DE] dark:from-[#0F172A] dark:via-[#0F172A] dark:to-[#131C31]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 dark:text-white tracking-tight">
            {t("featMainTitle" as TranslationKey)}
          </h2>
          <p className="mt-4 text-lg text-stone-500 dark:text-white/50 max-w-2xl mx-auto">
            {t("featMainDesc" as TranslationKey)}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              className={`group relative rounded-2xl border border-stone-200/80 dark:border-white/5 bg-white/70 dark:bg-[#1E293B]/60 backdrop-blur-sm p-6 transition-all duration-500 hover:border-stone-300 dark:hover:border-white/10 hover:-translate-y-1 hover:shadow-xl shadow-sm ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{
                transitionDelay: isVisible ? `${i * 100 + 200}ms` : "0ms",
              }}
            >
              {/* Icon */}
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} mb-5 shadow-lg transition-transform group-hover:scale-110`}>
                <feature.icon className="h-6 w-6 text-white" />
              </div>

              <h3 className="text-lg font-semibold text-stone-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-stone-500 dark:text-white/50 leading-relaxed">
                {feature.description}
              </p>

              {/* Hover glow */}
              <div className={`absolute -inset-px rounded-2xl ${feature.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
