"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, RotateCcw, Clock } from "lucide-react";
import {
    type HistoryEntry,
    type HistoryEntryType,
    loadHistory,
    removeHistoryEntry,
    clearHistory,
    formatHistoryDate,
    HISTORY_ICONS,
    HISTORY_LABELS,
} from "@/lib/history";

interface HistoryPanelProps {
    onRestore: (entry: HistoryEntry) => void;
}

const TYPE_COLORS: Record<HistoryEntryType, string> = {
    chat: "bg-blue-100 text-blue-700",
    quiz: "bg-emerald-100 text-emerald-700",
    summary: "bg-amber-100 text-amber-700",
    detector: "bg-rose-100 text-rose-700",
};

export function HistoryPanel({ onRestore }: HistoryPanelProps) {
    const [entries, setEntries] = useState<HistoryEntry[]>([]);
    const [filter, setFilter] = useState<HistoryEntryType | "all">("all");

    // Load and refresh history
    const refresh = useCallback(() => {
        setEntries(loadHistory());
    }, []);

    useEffect(() => {
        refresh();
        // Refresh when panel gets focus (another tab may have saved)
        window.addEventListener("focus", refresh);
        return () => window.removeEventListener("focus", refresh);
    }, [refresh]);

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        removeHistoryEntry(id);
        setEntries((prev) => prev.filter((en) => en.id !== id));
    };

    const handleClearAll = () => {
        if (!confirm("Effacer tout l'historique ?")) return;
        clearHistory();
        setEntries([]);
    };

    const filtered = filter === "all" ? entries : entries.filter((e) => e.type === filter);

    const tabs: { key: HistoryEntryType | "all"; label: string }[] = [
        { key: "all", label: "Tout" },
        { key: "chat", label: "Chats" },
        { key: "quiz", label: "QCM" },
        { key: "summary", label: "Résumés" },
        { key: "detector", label: "IA" },
    ];

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-white/60" />
                    <span className="text-sm font-medium text-white/80">Historique</span>
                </div>
                {entries.length > 0 && (
                    <button
                        onClick={handleClearAll}
                        className="text-xs text-white/40 hover:text-rose-400 transition-colors"
                        title="Effacer tout"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 px-3 py-2 overflow-x-auto scrollbar-hide">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${filter === tab.key
                                ? "bg-white/20 text-white"
                                : "text-white/40 hover:text-white/70"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Entries list */}
            <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1.5 scrollbar-hide">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center px-4">
                        <Clock className="h-8 w-8 text-white/20" />
                        <p className="text-xs text-white/30">
                            {filter === "all"
                                ? "Aucune activité enregistrée"
                                : `Aucun historique pour ce type`}
                        </p>
                    </div>
                ) : (
                    filtered.map((entry) => (
                        <div
                            key={entry.id}
                            onClick={() => onRestore(entry)}
                            className="group relative flex flex-col gap-1 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-white/8 transition-colors"
                        >
                            {/* Type badge + time */}
                            <div className="flex items-center justify-between gap-2">
                                <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${TYPE_COLORS[entry.type]}`}>
                                    {HISTORY_ICONS[entry.type]} {HISTORY_LABELS[entry.type]}
                                </span>
                                <span className="text-[10px] text-white/30 shrink-0">
                                    {formatHistoryDate(entry.timestamp)}
                                </span>
                            </div>

                            {/* Title */}
                            <p className="text-xs font-medium text-white/80 truncate leading-tight">
                                {entry.title}
                            </p>

                            {/* Preview */}
                            <p className="text-[11px] text-white/40 line-clamp-2 leading-relaxed">
                                {entry.preview}
                            </p>

                            {/* Delete button */}
                            <button
                                onClick={(e) => handleDelete(entry.id, e)}
                                className="absolute right-2 top-2 hidden group-hover:flex items-center justify-center rounded p-0.5 text-white/30 hover:text-rose-400 hover:bg-white/10 transition-colors"
                                title="Supprimer"
                            >
                                <Trash2 className="h-3 w-3" />
                            </button>

                            {/* Restore hint */}
                            <div className="hidden group-hover:flex items-center gap-1 mt-0.5">
                                <RotateCcw className="h-2.5 w-2.5 text-white/30" />
                                <span className="text-[10px] text-white/30">Cliquer pour restaurer</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
