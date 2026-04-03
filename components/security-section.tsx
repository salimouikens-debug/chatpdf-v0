"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Lock, ShieldCheck, Eye, Server } from "lucide-react";

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

function MatrixRain() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*(){}[]|;:,.<>?/~`";

  const columns = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: `${(i / 60) * 100}%`,
      delay: `${Math.random() * 8}s`,
      duration: `${8 + Math.random() * 12}s`,
      chars: Array.from({ length: 25 }, () => chars[Math.floor(Math.random() * chars.length)]),
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden opacity-[0.07]">
      {columns.map((col) => (
        <div
          key={col.id}
          className="absolute top-0 text-green-400 text-xs font-mono leading-5 whitespace-pre animate-matrix-fall"
          style={{
            left: col.left,
            animationDelay: col.delay,
            animationDuration: col.duration,
          }}
        >
          {col.chars.map((c, j) => (
            <div key={j}>{c}</div>
          ))}
        </div>
      ))}
    </div>
  );
}

const TRUST_ITEMS = [
  {
    icon: Lock,
    label: "Chiffrement",
    description: "Chiffrement AES-256 de bout en bout",
  },
  {
    icon: ShieldCheck,
    label: "RGPD",
    description: "Conforme aux normes européennes",
  },
  {
    icon: Eye,
    label: "Confidentialité",
    description: "Vos documents ne sont jamais partagés",
  },
  {
    icon: Server,
    label: "Hébergement",
    description: "Serveurs sécurisés en Europe",
  },
];

export function SecuritySection() {
  const { ref, isVisible } = useInView(0.15);

  return (
    <section
      ref={ref}
      className="relative py-24 sm:py-32 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[#EDE8E3] dark:bg-[#0A0F1A]" />
      <div className="dark:block hidden"><MatrixRain /></div>

      <div
        className={`relative z-10 mx-auto max-w-4xl px-6 text-center transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {/* Lock icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white dark:bg-[#1E293B] shadow-2xl shadow-black/10 dark:shadow-black/40 border border-stone-200 dark:border-white/10">
          <Lock className="h-10 w-10 text-stone-700 dark:text-white/80" />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 dark:border-white/10 bg-white/60 dark:bg-white/5 px-4 py-1.5 mb-6">
          <ShieldCheck className="h-3.5 w-3.5 text-green-500 dark:text-green-400" />
          <span className="text-xs font-medium text-stone-600 dark:text-white/60">Chiffrement</span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-stone-900 dark:text-white tracking-tight leading-tight">
          Vos données sont en sécurité{" "}
          <br className="hidden sm:block" />
          avec nous !
        </h2>

        <p className="mt-6 text-base sm:text-lg text-stone-500 dark:text-white/40 max-w-2xl mx-auto leading-relaxed">
          Talk2PDF est conforme au RGPD, garantissant les normes les plus élevées de sécurité et de confidentialité des données.
        </p>

        {/* Trust items grid */}
        <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {TRUST_ITEMS.map((item, i) => (
            <div
              key={item.label}
              className={`rounded-xl border border-stone-200/80 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-sm p-5 transition-all duration-500 hover:border-stone-300 dark:hover:border-white/10 hover:bg-white/90 dark:hover:bg-white/[0.06] shadow-sm ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: isVisible ? `${i * 100 + 300}ms` : "0ms" }}
            >
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <item.icon className="h-5 w-5 text-green-500 dark:text-green-400" />
              </div>
              <p className="text-sm font-semibold text-stone-900 dark:text-white mb-1">{item.label}</p>
              <p className="text-xs text-stone-500 dark:text-white/40 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
