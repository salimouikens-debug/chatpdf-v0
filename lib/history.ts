// Unified history system for all interactions (Chat, Quiz, Summary, Detector)
// Stored in localStorage for persistence across sessions

export type HistoryEntryType = "chat" | "quiz" | "summary" | "detector";

export interface HistoryEntry {
    id: string;
    type: HistoryEntryType;
    title: string;
    preview: string;          // Short preview of the content
    timestamp: string;        // ISO date string
    pinned?: boolean;         // Whether this entry is pinned
    // Restorable state
    chatId?: string;          // For chat: chat session ID
    quizData?: {
        filename: string;
        blobUrl?: string;
        difficulty: string;
        questions: unknown[];
        userAnswers: Record<number, string>;
        submitted: boolean;
        score: number;
    };
    summaryData?: {
        filename: string;
        blobUrl?: string;
        summaryType: string;
        content: string;
    };
    detectorData?: {
        text: string;
        verdict: string;
        aiProbability: number;
        explanation: string;
    };
}

const HISTORY_KEY = "chatpdf_history";
const MAX_ENTRIES = 50;

export function loadHistory(): HistoryEntry[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function saveHistory(entries: HistoryEntry[]): void {
    if (typeof window === "undefined") return;
    // Keep only the most recent MAX_ENTRIES
    const trimmed = entries.slice(0, MAX_ENTRIES);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

export function addHistoryEntry(entry: Omit<HistoryEntry, "id" | "timestamp">): HistoryEntry {
    const newEntry: HistoryEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
    };
    const existing = loadHistory();
    const updated = [newEntry, ...existing];
    saveHistory(updated);
    return newEntry;
}

export function removeHistoryEntry(id: string): void {
    const existing = loadHistory();
    saveHistory(existing.filter((e) => e.id !== id));
}

export function updateHistoryEntry(id: string, updates: Partial<HistoryEntry>): void {
    const existing = loadHistory();
    const updated = existing.map((e) => (e.id === id ? { ...e, ...updates } : e));
    saveHistory(updated);
}

export function clearHistory(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(HISTORY_KEY);
}

export function formatHistoryDate(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export const HISTORY_ICONS: Record<HistoryEntryType, string> = {
    chat: "💬",
    quiz: "🎯",
    summary: "✨",
    detector: "🔍",
};

export const HISTORY_LABELS: Record<HistoryEntryType, string> = {
    chat: "Chat PDF",
    quiz: "QCM",
    summary: "Résumé",
    detector: "Détecteur IA",
};
