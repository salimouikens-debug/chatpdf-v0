"use client";

import { useEffect, useRef, useState } from "react";
import { User, Bot, Send } from "lucide-react";

const DEMO_MESSAGES = [
  {
    role: "user" as const,
    text: "Summarize this document in 3 bullet points",
  },
  {
    role: "ai" as const,
    text: "Based on the document, here are the 3 key takeaways:\n\n• **Market Growth**: The global AI market is projected to reach $1.8 trillion by 2030, with a compound annual growth rate of 37.3%.\n\n• **Key Drivers**: Cloud computing adoption, increased data availability, and advances in deep learning are the primary catalysts.\n\n• **Challenges**: Data privacy regulations, talent shortage, and computational costs remain significant barriers to enterprise adoption.",
  },
  {
    role: "user" as const,
    text: "What are the main risks mentioned?",
  },
  {
    role: "ai" as const,
    text: "The document identifies **4 primary risks**:\n\n1. **Regulatory uncertainty** — evolving compliance requirements across different jurisdictions\n2. **Data security** — potential for breaches in AI training pipelines\n3. **Bias in models** — under-representation in training datasets\n4. **Dependency risk** — over-reliance on third-party AI providers",
  },
];

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

export function ChatPreviewSection() {
  const { ref, isVisible } = useInView(0.15);

  return (
    <section
      id="demo"
      ref={ref}
      className="relative py-24 sm:py-32 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#E8E3DE] via-[#EDE8E3] to-[#F5F1EC] dark:from-[#0F172A] dark:via-[#131C31] dark:to-[#0F172A]" />

      <div
        className={`relative z-10 mx-auto max-w-4xl px-6 transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 dark:text-white tracking-tight">
            See it in action
          </h2>
          <p className="mt-4 text-lg text-stone-500 dark:text-white/50 max-w-2xl mx-auto">
            Upload a document and start chatting — get instant, accurate answers grounded in your content.
          </p>
        </div>

        {/* Chat window mock */}
        <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white/80 dark:bg-[#1E293B]/80 backdrop-blur-sm shadow-2xl overflow-hidden">
          {/* Window bar */}
          <div className="flex items-center gap-2 border-b border-stone-200/80 dark:border-white/5 px-5 py-3">
            <div className="h-3 w-3 rounded-full bg-red-400/80" />
            <div className="h-3 w-3 rounded-full bg-yellow-400/80" />
            <div className="h-3 w-3 rounded-full bg-green-400/80" />
            <span className="ml-4 text-xs text-stone-400 dark:text-white/30 font-mono">talk2pdf — market-analysis.pdf</span>
          </div>

          {/* Messages */}
          <div className="p-5 space-y-5 max-h-[480px] overflow-y-auto scrollbar-hide">
            {DEMO_MESSAGES.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${
                  isVisible ? "animate-in fade-in slide-in-from-bottom-2" : "opacity-0"
                }`}
                style={{ animationDelay: `${i * 200 + 300}ms`, animationFillMode: "both" }}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    msg.role === "user"
                      ? "bg-blue-500/15 dark:bg-blue-500/20 text-blue-500 dark:text-blue-400"
                      : "bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium mb-1.5 text-stone-400 dark:text-white/40">
                    {msg.role === "user" ? "You" : "Talk2PDF AI"}
                  </p>
                  <div
                    className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 text-stone-700 dark:text-white/80"
                        : "bg-stone-50 dark:bg-white/5 border border-stone-200/60 dark:border-white/5 text-stone-600 dark:text-white/70"
                    }`}
                  >
                    {msg.text.split("\n").map((line, j) => (
                      <p key={j} className={j > 0 ? "mt-1.5" : ""}>
                        {line.split(/(\*\*[^*]+\*\*)/).map((part, k) =>
                          part.startsWith("**") && part.endsWith("**") ? (
                            <strong key={k} className="text-stone-900 dark:text-white font-semibold">
                              {part.slice(2, -2)}
                            </strong>
                          ) : (
                            <span key={k}>{part}</span>
                          )
                        )}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input bar */}
          <div className="border-t border-stone-200/80 dark:border-white/5 px-5 py-3">
            <div className="flex items-center gap-3 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-white/5 px-4 py-2.5">
              <span className="flex-1 text-sm text-stone-400 dark:text-white/30">Ask a follow-up question…</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-white">
                <Send className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
