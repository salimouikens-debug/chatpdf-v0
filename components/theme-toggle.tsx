"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ className }: { className?: string }) {
    const { setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    const isDark = resolvedTheme === "dark";

    return (
        <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label="Basculer le mode sombre"
            className={className ?? "relative flex h-8 w-8 items-center justify-center rounded-full text-stone-600 dark:text-white/60 transition-all hover:bg-stone-200/50 dark:hover:bg-white/10 hover:text-stone-900 dark:hover:text-white"}
        >
            {isDark ? (
                <Sun className="h-4 w-4 transition-transform duration-300 rotate-0 scale-100" />
            ) : (
                <Moon className="h-4 w-4 transition-transform duration-300 rotate-0 scale-100" />
            )}
        </button>
    );
}
