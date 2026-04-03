"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
    Upload,
    FileText,
    Sparkles,
    Loader2,
    Copy,
    Check,
    AlertCircle,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadPDF, getSummary } from "@/lib/api";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { addHistoryEntry, type HistoryEntry } from "@/lib/history";

type SummaryType = "global" | "key_points";

const SUMMARY_TYPES: { value: SummaryType; label: string; description: string }[] = [
    {
        value: "global",
        label: "Résumé complet",
        description: "Résumé détaillé avec sections structurées",
    },
    {
        value: "key_points",
        label: "Points clés",
        description: "Liste des points importants du document",
    },
];

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".doc", ".pptx", ".txt"];
const MAX_SIZE_MB = 50;

interface SummaryTabProps {
    onPdfReady?: (blobUrl: string, filename: string) => void;
    onPdfClear?: () => void;
    initialFile?: File | null;
    onFileSelected?: (file: File | null) => void;
    /** Restored from history — pre-fills summary content */
    initialSummaryData?: HistoryEntry["summaryData"];
    onInitialDataConsumed?: () => void;
}

export function SummaryTab({ onPdfReady, onPdfClear, initialFile, onFileSelected, initialSummaryData, onInitialDataConsumed }: SummaryTabProps) {
    const [file, setFile] = useState<File | null>(initialFile ?? null);
    const [summaryType, setSummaryType] = useState<SummaryType>("global");
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [generating, setGenerating] = useState(false);
    const [summary, setSummary] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Restore from history
    useEffect(() => {
        if (!initialSummaryData) return;
        setSummary(initialSummaryData.content);
        setSummaryType(initialSummaryData.summaryType as SummaryType);
        onInitialDataConsumed?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialSummaryData]);

    const validateFile = useCallback((f: File): string | null => {
        const ext = f.name.substring(f.name.lastIndexOf(".")).toLowerCase();
        if (!ACCEPTED_EXTENSIONS.includes(ext)) {
            return `Format non supporté. Formats acceptés : ${ACCEPTED_EXTENSIONS.join(", ")}`;
        }
        if (f.size > MAX_SIZE_MB * 1024 * 1024) {
            return `Fichier trop volumineux. Taille maximale : ${MAX_SIZE_MB} Mo`;
        }
        return null;
    }, []);

    const handleFileSelect = useCallback(
        (f: File) => {
            const validationError = validateFile(f);
            if (validationError) {
                setError(validationError);
                return;
            }
            setFile(f);
            setError(null);
            setSummary(null);
            onFileSelected?.(f);
            // Create blob URL for PDF preview
            const blobUrl = URL.createObjectURL(f);
            onPdfReady?.(blobUrl, f.name);
        },
        [validateFile, onPdfReady]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragOver(false);
            const dropped = e.dataTransfer.files[0];
            if (dropped) handleFileSelect(dropped);
        },
        [handleFileSelect]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    }, []);

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) handleFileSelect(f);
        },
        [handleFileSelect]
    );

    const handleRemoveFile = useCallback(() => {
        setFile(null);
        setError(null);
        setSummary(null);
        setUploadProgress(0);
        onFileSelected?.(null);
        onPdfClear?.();
    }, [onPdfClear, onFileSelected]);

    const handleGenerate = useCallback(async () => {
        if (!file) return;
        setError(null);
        setSummary(null);
        setUploading(true);
        setUploadProgress(0);

        try {
            // Step 1: Upload & process the file
            const { document: doc } = await uploadPDF(file, (pct) => {
                setUploadProgress(pct);
            });

            setUploading(false);
            setGenerating(true);

            // Step 2: Generate summary
            const result = await getSummary([doc.id], summaryType);
            setSummary(result.summary);
            // Save to global history
            const typeLabel = summaryType === "global" ? "Résumé complet" : "Points clés";
            addHistoryEntry({
                type: "summary",
                title: file?.name ?? "Document",
                preview: `${typeLabel} • ${result.summary.slice(0, 120).trim()}…`,
                summaryData: {
                    filename: file?.name ?? "",
                    summaryType,
                    content: result.summary,
                },
            });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Une erreur est survenue. Veuillez réessayer."
            );
        } finally {
            setUploading(false);
            setGenerating(false);
        }
    }, [file, summaryType]);

    const handleCopy = useCallback(async () => {
        if (!summary) return;
        try {
            await navigator.clipboard.writeText(summary);
            setCopied(true);
            toast.success("Résumé copié !");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Impossible de copier");
        }
    }, [summary]);

    const isProcessing = uploading || generating;

    return (
        <div className="flex flex-col w-full h-full overflow-hidden px-0 py-2">
            {/* Scrollable content */}
            <div className="flex-1 space-y-4 overflow-y-auto scrollbar-hide pr-2 pb-8">
                {/* Upload zone */}
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 ${dragOver
                        ? "border-teal bg-teal/5 scale-[1.01]"
                        : file
                            ? "border-teal/40 bg-teal/5"
                            : "border-border bg-background hover:border-teal/30 hover:bg-muted/30"
                        } ${isProcessing ? "pointer-events-none opacity-70" : ""}`}
                >
                    {file ? (
                        <div className="flex items-center gap-3 px-5 py-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal/10">
                                <FileText className="h-5 w-5 text-teal" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {(file.size / (1024 * 1024)).toFixed(2)} Mo
                                </p>
                            </div>
                            {!isProcessing && (
                                <button
                                    onClick={handleRemoveFile}
                                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    ) : (
                        <div
                            className="flex flex-row items-center justify-center gap-4 px-6 py-4 cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal/10 shrink-0">
                                <Upload className="h-5 w-5 text-teal" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-medium">
                                    Glissez-déposez un fichier ici
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    ou cliquez pour parcourir • PDF, Word, PPTX, TXT (max {MAX_SIZE_MB} Mo)
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Upload progress bar */}
                    {uploading && (
                        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-teal shrink-0" />
                                <span className="text-xs text-muted-foreground">
                                    Traitement du fichier...
                                </span>
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-teal transition-all duration-300 rounded-full"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPTED_EXTENSIONS.join(",")}
                        className="hidden"
                        onChange={handleInputChange}
                    />
                </div>

                {/* Summary type selector */}
                <div className="flex gap-2">
                    {SUMMARY_TYPES.map((type) => (
                        <button
                            key={type.value}
                            onClick={() => setSummaryType(type.value)}
                            disabled={isProcessing}
                            className={`flex-1 rounded-xl border p-2.5 text-left transition-all ${summaryType === type.value
                                ? "border-teal bg-teal/5 ring-1 ring-teal/20"
                                : "border-border bg-background hover:border-teal/30"
                                } ${isProcessing ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                            <p
                                className={`text-sm font-medium ${summaryType === type.value ? "text-teal" : "text-foreground"
                                    }`}
                            >
                                {type.label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {type.description}
                            </p>
                        </button>
                    ))}
                </div>

                {/* Generate button */}
                <Button
                    onClick={handleGenerate}
                    disabled={!file || isProcessing}
                    className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl transition-colors"
                >
                    {uploading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Traitement du fichier...
                        </>
                    ) : generating ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Génération du résumé...
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Résumer
                        </>
                    )}
                </Button>

                {/* Error */}
                {error && (
                    <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 animate-in fade-in duration-200">
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <p className="text-sm text-destructive">{error}</p>
                    </div>
                )}

                {/* Loading skeleton */}
                {generating && (
                    <div className="rounded-2xl border bg-card p-6 card-shadow animate-in fade-in duration-200">
                        <div className="flex items-center gap-2 mb-4">
                            <Loader2 className="h-5 w-5 animate-spin text-teal" />
                            <p className="text-sm font-medium text-muted-foreground">
                                L'IA analyse votre document...
                            </p>
                        </div>
                        <div className="space-y-3">
                            <div className="h-4 bg-muted rounded-full animate-pulse w-full" />
                            <div className="h-4 bg-muted rounded-full animate-pulse w-5/6" />
                            <div className="h-4 bg-muted rounded-full animate-pulse w-4/6" />
                            <div className="h-4 bg-muted rounded-full animate-pulse w-full" />
                            <div className="h-4 bg-muted rounded-full animate-pulse w-3/5" />
                        </div>
                    </div>
                )}

                {/* Result */}
                {summary && !generating && (
                    <div className="rounded-2xl border bg-card card-shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b px-5 py-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-teal" />
                                <span className="text-sm font-semibold">
                                    {summaryType === "global" ? "Résumé complet" : "Points clés"}
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCopy}
                                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                            >
                                {copied ? (
                                    <>
                                        <Check className="h-3.5 w-3.5 text-green-500" />
                                        Copié !
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3.5 w-3.5" />
                                        Copier
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Content */}
                        <div className="px-5 py-4">
                            <ReactMarkdown
                                components={{
                                    h1: ({ children }) => (
                                        <h1 className="text-lg font-bold text-foreground mt-3 mb-2 first:mt-0">
                                            {children}
                                        </h1>
                                    ),
                                    h2: ({ children }) => (
                                        <h2 className="text-base font-bold text-foreground mt-3 mb-1.5 first:mt-0">
                                            {children}
                                        </h2>
                                    ),
                                    h3: ({ children }) => (
                                        <h3 className="text-sm font-semibold text-foreground mt-2.5 mb-1 first:mt-0">
                                            {children}
                                        </h3>
                                    ),
                                    p: ({ children }) => (
                                        <p className="text-sm leading-relaxed text-foreground/90 mb-2 last:mb-0">
                                            {children}
                                        </p>
                                    ),
                                    ul: ({ children }) => (
                                        <ul className="text-sm leading-relaxed text-foreground/90 list-disc pl-5 mb-2 space-y-1">
                                            {children}
                                        </ul>
                                    ),
                                    ol: ({ children }) => (
                                        <ol className="text-sm leading-relaxed text-foreground/90 list-decimal pl-5 mb-2 space-y-1">
                                            {children}
                                        </ol>
                                    ),
                                    li: ({ children }) => (
                                        <li className="text-sm leading-relaxed">{children}</li>
                                    ),
                                    strong: ({ children }) => (
                                        <strong className="font-semibold text-foreground">
                                            {children}
                                        </strong>
                                    ),
                                }}
                            >
                                {summary}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
