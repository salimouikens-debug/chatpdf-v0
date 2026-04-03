"use client";

import Link from "next/link";
import { ChatPdfLogo } from "@/components/chatpdf-logo";

const FOOTER_LINKS = {
  Produits: [
    { label: "Chat avec vos documents", href: "/dashboard" },
    { label: "Résumer les documents", href: "/dashboard" },
    { label: "Générateur de QCM", href: "/dashboard" },
    { label: "Détecteur IA", href: "/dashboard" },
  ],
  Ressources: [
    { label: "Documentation", href: "#features" },
    { label: "FAQ", href: "#" },
    { label: "Commencer", href: "/signup" },
  ],
  Entreprise: [
    { label: "À propos", href: "#" },
    { label: "Sécurité & Conformité", href: "#" },
    { label: "Politique de confidentialité", href: "#" },
    { label: "Termes et Conditions", href: "#" },
  ],
  Comparaison: [
    { label: "Humata AI", href: "#" },
    { label: "ChatPDF", href: "#" },
    { label: "PDF AI", href: "#" },
    { label: "AskYourPDF", href: "#" },
  ],
};

export function LandingFooter() {
  return (
    <footer className="border-t border-stone-200 dark:border-white/5 bg-[#E8E3DE] dark:bg-[#0B1120]">
      {/* Main footer grid */}
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 lg:gap-12">
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-stone-900 dark:text-white mb-4">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-stone-500 dark:text-white/40 hover:text-stone-700 dark:hover:text-white/70 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-8 border-t border-stone-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ChatPdfLogo variant="sidebar" size={28} className="dark:flex hidden" />
            <ChatPdfLogo variant="light" size={28} className="dark:hidden" />
            <span className="text-sm text-stone-500 dark:text-white/40">
              Talk2PDF est votre assistant intelligent de documents, utilisant une IA avancée pour vous aider à interagir avec, résumer et gérer vos documents.
            </span>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* YouTube */}
            <a href="#" className="text-stone-400 dark:text-white/30 hover:text-stone-600 dark:hover:text-white/60 transition-colors" aria-label="YouTube">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
            {/* X / Twitter */}
            <a href="#" className="text-stone-400 dark:text-white/30 hover:text-stone-600 dark:hover:text-white/60 transition-colors" aria-label="Twitter">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            {/* LinkedIn */}
            <a href="#" className="text-stone-400 dark:text-white/30 hover:text-stone-600 dark:hover:text-white/60 transition-colors" aria-label="LinkedIn">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
            {/* GitHub */}
            <a href="#" className="text-stone-400 dark:text-white/30 hover:text-stone-600 dark:hover:text-white/60 transition-colors" aria-label="GitHub">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-6 text-center">
          <p className="text-xs text-stone-400 dark:text-white/20">
            &copy; {new Date().getFullYear()} Talk2PDF. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
