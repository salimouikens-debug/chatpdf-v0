"use client";

import { useState, useEffect } from "react";
import { Loader2, ScanText, Bot, User, HelpCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { detectAiContent, type AiDetectResult } from "@/lib/api";
import { toast } from "sonner";
import { addHistoryEntry } from "@/lib/history";

const MIN_CHARS = 50;

function GaugeRing({ pct, color }: { pct: number; color: string }) {
    const r = 52;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;
    return (
        <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
            <circle cx="64" cy="64" r={r} fill="none" stroke="currentColor" strokeWidth="12" className="text-muted/30" />
            <circle
                cx="64" cy="64" r={r} fill="none"
                stroke={color} strokeWidth="12"
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                style={{ transition: "stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)" }}
            />
        </svg>
    );
}

function VerdictBadge({ verdict }: { verdict: AiDetectResult["verdict"] }) {
    const config = {
        ai: { icon: <Bot className="h-4 w-4" />, label: "Généré par IA", classes: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
        human: { icon: <User className="h-4 w-4" />, label: "Écrit par un humain", classes: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
        uncertain: { icon: <HelpCircle className="h-4 w-4" />, label: "Incertain", classes: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    }[verdict];
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${config.classes}`}>
            {config.icon}
            {config.label}
        </span>
    );
}

export function AiDetector({ initialText, onInitialTextConsumed }: {
    initialText?: string;
    onInitialTextConsumed?: () => void;
}) {
    const [text, setText] = useState(initialText ?? "");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AiDetectResult | null>(null);

    // When initialText changes (restore from history), update text field
    useEffect(() => {
        if (initialText) {
            setText(initialText);
            onInitialTextConsumed?.();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialText]);

    const charCount = text.trim().length;
    const canAnalyze = charCount >= MIN_CHARS && !loading;

    const handleAnalyze = async () => {
        if (!canAnalyze) return;
        setLoading(true);
        setResult(null);
        try {
            const res = await detectAiContent(text.trim());
            setResult(res);
            // Save to global history
            const verdictLabel = res.verdict === "ai" ? "Généré par IA" : res.verdict === "human" ? "Humain" : "Incertain";
            addHistoryEntry({
                type: "detector",
                title: text.trim().slice(0, 60) + (text.length > 60 ? "…" : ""),
                preview: `${verdictLabel} • ${res.ai_probability}% IA • ${res.explanation.slice(0, 100)}…`,
                detectorData: {
                    text: text.trim(),
                    verdict: res.verdict,
                    aiProbability: res.ai_probability,
                    explanation: res.explanation,
                },
            });
        } catch (e) {
            toast.error("Erreur d'analyse", { description: (e as Error).message });
        } finally {
            setLoading(false);
        }
    };

    const gaugeColor =
        result?.verdict === "ai" ? "#f43f5e"
            : result?.verdict === "human" ? "#10b981"
                : "#f59e0b";

    return (
        <div className="flex flex-col w-full px-0 py-2 flex-col gap-4">

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <ScanText className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h2 className="font-bold text-lg leading-tight">Détecteur IA</h2>
                    <p className="text-xs text-muted-foreground">Analyse si un texte est écrit par un humain ou généré par une IA</p>
                </div>
            </div>

            {/* Textarea */}
            <div className="flex flex-col gap-2">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Collez le texte à analyser ici… (au moins 50 caractères)"
                    rows={4}
                    className="w-full resize-none rounded-xl border bg-muted/30 px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                />
                <div className="flex items-center justify-between">
                    <span className={`text-xs ${charCount < MIN_CHARS ? "text-muted-foreground" : "text-emerald-500"}`}>
                        {charCount} / {MIN_CHARS} caractères minimum
                    </span>
                    <Button onClick={handleAnalyze} disabled={!canAnalyze} size="sm" className="gap-2">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanText className="h-4 w-4" />}
                        {loading ? "Analyse en cours…" : "Analyser"}
                    </Button>
                </div>
            </div>

            {/* Results */}
            {result && (
                <div className="rounded-2xl border bg-card card-shadow-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Top section: gauge + verdict */}
                    <div className="flex flex-col sm:flex-row items-center gap-6 p-6 border-b bg-muted/20">
                        {/* Gauge */}
                        <div className="relative shrink-0">
                            <GaugeRing pct={result.ai_probability} color={gaugeColor} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black leading-none" style={{ color: gaugeColor }}>
                                    {result.ai_probability}%
                                </span>
                                <span className="text-[10px] text-muted-foreground font-medium mt-0.5">IA</span>
                            </div>
                        </div>

                        {/* Verdict + probabilities */}
                        <div className="flex flex-col gap-3 flex-1 min-w-0">
                            <VerdictBadge verdict={result.verdict} />

                            <div className="flex flex-col gap-1.5">
                                {/* AI bar */}
                                <div className="flex items-center gap-2 text-xs">
                                    <Bot className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-rose-500 transition-all duration-700"
                                            style={{ width: `${result.ai_probability}%` }}
                                        />
                                    </div>
                                    <span className="w-8 text-right font-semibold text-rose-400">{result.ai_probability}%</span>
                                </div>
                                {/* Human bar */}
                                <div className="flex items-center gap-2 text-xs">
                                    <User className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                                            style={{ width: `${result.human_probability}%` }}
                                        />
                                    </div>
                                    <span className="w-8 text-right font-semibold text-emerald-400">{result.human_probability}%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Explanation */}
                    <div className="p-5 border-b">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Explication</h3>
                        <p className="text-sm leading-relaxed">{result.explanation}</p>
                    </div>

                    {/* Clues */}
                    {result.clues.length > 0 && (
                        <div className="p-5">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Indices linguistiques observés</h3>
                            <ul className="flex flex-col gap-2">
                                {result.clues.map((clue, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                        <AlertCircle className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                                        <span>{clue}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Disclaimer */}
                    <div className="px-5 pb-4">
                        <p className="text-[11px] text-muted-foreground italic">
                            ⚠️ Cette analyse est indicative. La détection parfaite de contenu IA n'est pas possible.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
