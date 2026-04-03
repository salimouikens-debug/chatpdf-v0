/**
 * ChatPDF professional logo – uses the generated isometric icon with word-mark.
 *
 * Variants:
 *   "sidebar"  → white text for dark sidebar background (default)
 *   "light"    → dark/teal text for white backgrounds (modals, auth pages)
 *
 * The `size` prop controls the icon height in pixels.
 * `showText` controls whether the "ChatPDF" word-mark appears next to the icon.
 */

import Image from "next/image";

interface ChatPdfLogoProps {
    variant?: "sidebar" | "light";
    size?: number;
    showText?: boolean;
    className?: string;
}

export function ChatPdfLogo({
    variant = "sidebar",
    size = 40,
    showText = true,
    className = "",
}: ChatPdfLogoProps) {
    const isSidebar = variant === "sidebar";

    return (
        <div className={`flex items-center gap-2.5 ${className}`}>
            {/* Icon */}
            <div
                className="relative shrink-0 flex items-center justify-center rounded-lg overflow-hidden"
                style={{ width: size, height: size }}
            >
                <Image
                    src="/chatpdf-logo.png"
                    alt="Talk2PDF"
                    width={size}
                    height={size}
                    className="object-contain"
                    priority
                    unoptimized
                />
            </div>

            {/* Word-mark */}
            {showText && (
                <span
                    className={`font-semibold tracking-tight ${isSidebar
                        ? "text-white text-lg"
                        : "text-foreground text-lg"
                        }`}
                >
                    Talk2PDF
                </span>
            )}
        </div>
    );
}
