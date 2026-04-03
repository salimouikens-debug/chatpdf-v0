"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MessageCircle, Trash2, Clock, Pin, Pencil, PinOff, RotateCcw } from "lucide-react";
import {
    type HistoryEntry,
    type HistoryEntryType,
    loadHistory,
    removeHistoryEntry,
    clearHistory,
    formatHistoryDate,
    HISTORY_ICONS,
    HISTORY_LABELS,
    updateHistoryEntry,
} from "@/lib/history";
import { type ChatSessionMeta } from "@/lib/api";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";

/* ─── Types ─── */
type UnifiedEntry =
    | { kind: "chat"; data: ChatSessionMeta }
    | { kind: "history"; data: HistoryEntry };

const TYPE_BADGE: Record<HistoryEntryType, string> = {
    chat: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
    quiz: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
    summary: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    detector: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
};

/* ─── Date grouping ─── */
function groupLabel(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor(
        (now.setHours(0, 0, 0, 0) - date.setHours(0, 0, 0, 0)) / 86400000
    );
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return "Cette semaine";
    if (diffDays < 30) return "Ce mois-ci";
    return "Plus ancien";
}

const GROUP_ORDER = ["Épinglés", "Aujourd'hui", "Hier", "Cette semaine", "Ce mois-ci", "Plus ancien"];

/* ─── Component ─── */
interface DiscussionsPanelProps {
    chats: ChatSessionMeta[];
    activeChatId: string | null;
    onSelectChat: (chat: ChatSessionMeta) => void;
    onRestoreHistory: (entry: HistoryEntry) => void;
    onDeleteChat: (chatId: string) => void;
    onRenameChat?: (chatId: string, newTitle: string) => void;
    onPinChat?: (chatId: string, pinned: boolean) => void;
    onResetChat?: (chatId: string) => void;
}

export function DiscussionsPanel({
    chats,
    activeChatId,
    onSelectChat,
    onRestoreHistory,
    onDeleteChat,
    onRenameChat,
    onPinChat,
    onResetChat,
}: DiscussionsPanelProps) {
    const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
    const [filter, setFilter] = useState<HistoryEntryType | "all">("all");

    // Rename state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const editRef = useRef<HTMLInputElement>(null);

    const startRename = (id: string, currentTitle: string) => {
        setEditingId(id);
        setEditValue(currentTitle);
        setTimeout(() => editRef.current?.focus(), 0);
    };

    const confirmRename = useCallback(() => {
        if (!editingId) return;
        const trimmed = editValue.trim();
        if (trimmed) {
            // Check if it's a chat
            const isChat = chats.some((c) => c.id === editingId);
            if (isChat && onRenameChat) {
                onRenameChat(editingId, trimmed);
            } else {
                // Otherwise it's a history entry
                updateHistoryEntry(editingId, { title: trimmed });
                setHistoryEntries((prev) =>
                    prev.map((h) => (h.id === editingId ? { ...h, title: trimmed } : h))
                );
            }
        }
        setEditingId(null);
    }, [editingId, editValue, chats, onRenameChat]);

    const cancelRename = useCallback(() => setEditingId(null), []);

    const handlePinHistory = (id: string, pinned: boolean) => {
        updateHistoryEntry(id, { pinned });
        setHistoryEntries((prev) =>
            prev.map((h) => (h.id === id ? { ...h, pinned } : h))
        );
    };

    const refresh = useCallback(() => setHistoryEntries(loadHistory()), []);
    useEffect(() => {
        refresh();
        window.addEventListener("focus", refresh);
        return () => window.removeEventListener("focus", refresh);
    }, [refresh]);

    /* Build unified entries */
    const allEntries: UnifiedEntry[] = [
        ...chats.map((c) => ({ kind: "chat" as const, data: c })),
        ...historyEntries
            .filter((h) => h.type !== "chat") // chats already come from server
            .map((h) => ({ kind: "history" as const, data: h })),
    ];

    /* Filter by type */
    const filtered = allEntries.filter((e) => {
        if (filter === "all") return true;
        if (filter === "chat") return e.kind === "chat";
        return e.kind === "history" && e.data.type === filter;
    });

    /* Sort by date desc */
    const sorted = [...filtered].sort((a, b) => {
        const dateA = a.kind === "chat" ? a.data.updated_at : a.data.timestamp;
        const dateB = b.kind === "chat" ? b.data.updated_at : b.data.timestamp;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    /* Group */
    const groups: Record<string, UnifiedEntry[]> = {};
    for (const entry of sorted) {
        const isPinned = entry.kind === "chat" ? entry.data.pinned : entry.data.pinned;
        const date = entry.kind === "chat" ? entry.data.updated_at : entry.data.timestamp;
        const label = isPinned ? "Épinglés" : groupLabel(date);
        if (!groups[label]) groups[label] = [];
        groups[label].push(entry);
    }

    const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        removeHistoryEntry(id);
        setHistoryEntries((prev) => prev.filter((en) => en.id !== id));
    };

    const filterTabs: { key: HistoryEntryType | "all"; label: string }[] = [
        { key: "all", label: "Tout" },
        { key: "chat", label: "Chats" },
        { key: "quiz", label: "QCM" },
        { key: "summary", label: "Résumés" },
        { key: "detector", label: "IA" },
    ];

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Filter pills */}
            <div className="flex gap-1 px-3 py-2 overflow-x-auto scrollbar-hide shrink-0">
                {filterTabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${filter === tab.key
                            ? "bg-stone-800/10 dark:bg-white/20 text-stone-800 dark:text-white"
                            : "text-stone-500 dark:text-white/40 hover:text-stone-700 dark:hover:text-white/70 hover:bg-stone-200/50 dark:hover:bg-white/10"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Unified list */}
            <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-hide">
                {sorted.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center px-4">
                        <Clock className="h-8 w-8 text-stone-300 dark:text-white/20" />
                        <p className="text-xs text-stone-400 dark:text-white/30">Aucune activité</p>
                    </div>
                ) : (
                    GROUP_ORDER.filter((g) => groups[g]?.length).map((groupName) => (
                        <div key={groupName}>
                            {/* Group header */}
                            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-white/25 select-none">
                                {groupName}
                            </p>

                            {groups[groupName].map((entry) => {
                                if (entry.kind === "chat") {
                                    const chat = entry.data;
                                    const isActive = chat.id === activeChatId;
                                    const isEditing = editingId === chat.id;

                                    return (
                                        <ContextMenu key={`chat-${chat.id}`}>
                                            <ContextMenuTrigger>
                                                <button
                                                    onClick={() => {
                                                        if (!isEditing) onSelectChat(chat);
                                                    }}
                                                    className={`group relative w-full flex flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left transition-all mb-0.5 ${isActive
                                                        ? "bg-blue-50/80 dark:bg-white/15 text-stone-900 dark:text-white border border-blue-200/50 dark:border-transparent shadow-sm"
                                                        : "text-stone-700 dark:text-white/65 hover:bg-stone-200/40 dark:hover:bg-white/8 hover:text-stone-900 dark:hover:text-white border border-transparent"
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-1.5 w-full">
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 px-1.5 py-0.5 text-[10px] font-semibold shrink-0">
                                                            <MessageCircle className="h-2.5 w-2.5" /> Chat
                                                        </span>
                                                        {chat.pinned && (
                                                            <Pin className="h-2.5 w-2.5 text-amber-500 dark:text-amber-400 shrink-0" />
                                                        )}
                                                        <span className="text-[10px] text-stone-400 dark:text-white/30 ml-auto shrink-0 flex-1 text-right">
                                                            {formatHistoryDate(chat.updated_at)}
                                                        </span>
                                                    </div>

                                                    <div className="w-full mt-1">
                                                        {isEditing ? (
                                                            <Input
                                                                ref={editRef}
                                                                value={editValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                onBlur={confirmRename}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter") confirmRename();
                                                                    if (e.key === "Escape") cancelRename();
                                                                }}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="h-6 text-xs bg-white/80 dark:bg-white/10 border-stone-200 dark:border-white/20 text-stone-800 dark:text-white focus-visible:ring-1 focus-visible:ring-blue-300 dark:focus-visible:ring-white/30 px-1.5 py-0 w-full"
                                                            />
                                                        ) : (
                                                            <p className="text-xs font-medium truncate leading-snug pr-6">
                                                                {chat.title}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {chat.document_filename && !isEditing && (
                                                        <p className="text-[10px] text-stone-400 dark:text-white/35 truncate">
                                                            {chat.document_filename}
                                                        </p>
                                                    )}

                                                    {/* Quick Delete button on hover */}
                                                    {!isEditing && (
                                                        <div
                                                            role="button"
                                                            onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center justify-center rounded-lg p-1 text-stone-400 dark:text-white/30 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-white/10 transition-colors cursor-pointer"
                                                            title="Supprimer"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </div>
                                                    )}
                                                </button>
                                            </ContextMenuTrigger>
                                            <ContextMenuContent className="w-48">
                                                <ContextMenuItem onClick={() => startRename(chat.id, chat.title)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Renommer
                                                </ContextMenuItem>
                                                <ContextMenuItem onClick={() => onPinChat?.(chat.id, !chat.pinned)}>
                                                    {chat.pinned ? (
                                                        <>
                                                            <PinOff className="mr-2 h-4 w-4" />
                                                            Désépingler
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Pin className="mr-2 h-4 w-4" />
                                                            Épingler
                                                        </>
                                                    )}
                                                </ContextMenuItem>
                                                <ContextMenuItem onClick={() => onResetChat?.(chat.id)}>
                                                    <RotateCcw className="mr-2 h-4 w-4" />
                                                    Réinitialiser (Vider)
                                                </ContextMenuItem>
                                                <ContextMenuSeparator />
                                                <ContextMenuItem
                                                    variant="destructive"
                                                    onClick={() => onDeleteChat(chat.id)}
                                                    className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Supprimer
                                                </ContextMenuItem>
                                            </ContextMenuContent>
                                        </ContextMenu>
                                    );
                                }

                                // History entry
                                const h = entry.data;
                                const isEditing = editingId === h.id;

                                return (
                                    <ContextMenu key={`hist-${h.id}`}>
                                        <ContextMenuTrigger>
                                            <button
                                                onClick={() => {
                                                    if (!isEditing) onRestoreHistory(h);
                                                }}
                                                className="group relative w-full flex flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left transition-all mb-0.5 text-stone-700 dark:text-white/65 hover:bg-stone-200/40 dark:hover:bg-white/8 hover:text-stone-900 dark:hover:text-white border border-transparent"
                                            >
                                                <div className="flex items-center gap-1.5 w-full">
                                                    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold shrink-0 ${TYPE_BADGE[h.type]}`}>
                                                        {HISTORY_ICONS[h.type]} {HISTORY_LABELS[h.type]}
                                                    </span>
                                                    {h.pinned && (
                                                        <Pin className="h-2.5 w-2.5 text-amber-500 dark:text-amber-400 shrink-0" />
                                                    )}
                                                    <span className="text-[10px] text-stone-400 dark:text-white/30 ml-auto shrink-0 flex-1 text-right">
                                                        {formatHistoryDate(h.timestamp)}
                                                    </span>
                                                </div>

                                                <div className="w-full mt-1">
                                                    {isEditing ? (
                                                        <Input
                                                            ref={editRef}
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={confirmRename}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") confirmRename();
                                                                if (e.key === "Escape") cancelRename();
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="h-6 text-xs bg-white/80 dark:bg-white/10 border-stone-200 dark:border-white/20 text-stone-800 dark:text-white focus-visible:ring-1 focus-visible:ring-blue-300 dark:focus-visible:ring-white/30 px-1.5 py-0 w-full"
                                                        />
                                                    ) : (
                                                        <p className="text-xs font-medium truncate leading-snug pr-6">
                                                            {h.title}
                                                        </p>
                                                    )}
                                                </div>

                                                {!isEditing && (
                                                    <p className="text-[10px] text-stone-400 dark:text-white/35 line-clamp-1">
                                                        {h.preview}
                                                    </p>
                                                )}

                                                {/* Restore hint */}
                                                {!isEditing && (
                                                    <div className="hidden group-hover:flex items-center gap-1 mt-0.5">
                                                        <span className="text-[10px] text-blue-500 dark:text-white/30">↩ Restaurer</span>
                                                    </div>
                                                )}

                                                {/* Quick delete */}
                                                {!isEditing && (
                                                    <div
                                                        role="button"
                                                        onClick={(e) => handleDeleteHistory(h.id, e)}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center justify-center rounded-lg p-1 text-stone-400 dark:text-white/30 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-white/10 transition-colors cursor-pointer"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </div>
                                                )}
                                            </button>
                                        </ContextMenuTrigger>
                                        <ContextMenuContent className="w-48">
                                            <ContextMenuItem onClick={() => startRename(h.id, h.title)}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Renommer
                                            </ContextMenuItem>
                                            <ContextMenuItem onClick={() => handlePinHistory(h.id, !h.pinned)}>
                                                {h.pinned ? (
                                                    <>
                                                        <PinOff className="mr-2 h-4 w-4" />
                                                        Désépingler
                                                    </>
                                                ) : (
                                                    <>
                                                        <Pin className="mr-2 h-4 w-4" />
                                                        Épingler
                                                    </>
                                                )}
                                            </ContextMenuItem>
                                            <ContextMenuSeparator />
                                            <ContextMenuItem
                                                variant="destructive"
                                                onClick={(e) => handleDeleteHistory(h.id, e as any)}
                                                className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Supprimer
                                            </ContextMenuItem>
                                        </ContextMenuContent>
                                    </ContextMenu>
                                );
                            })}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
