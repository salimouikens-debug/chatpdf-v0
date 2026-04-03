"use client";

import { useState, useRef, useCallback } from "react";
import {
    Loader2, CheckCircle2, XCircle, RotateCcw, Trophy,
    BookOpen, Brain, Upload, FileText, X,
} from "lucide-react";
import { generateQuiz, uploadPDF, type QuizQuestion } from "@/lib/api";
import { addHistoryEntry, type HistoryEntry } from "@/lib/history";
import { useEffect } from "react";

interface QuizTabProps {
    documentIds: string[];
    language?: string;
    initialFile?: File | null;
    onFileSelected?: (file: File | null) => void;
    onPdfReady?: (blobUrl: string, filename: string) => void;
    onPdfClear?: () => void;
    onDocIdsReady?: (ids: string[]) => void;
    /** Restored from history — pre-fills questions, answers, score */
    initialQuizData?: HistoryEntry["quizData"];
    onInitialDataConsumed?: () => void;
}

type Difficulty = "easy" | "medium" | "hard";
type UserAnswers = Record<number, string>;

const ACCEPTED = ".pdf,.docx,.doc,.pptx,.txt";
const MAX_MB = 50;

export function QuizTab({
    documentIds: propDocumentIds,
    language = "fr",
    initialFile,
    onFileSelected,
    onPdfReady,
    onPdfClear,
    onDocIdsReady,
    initialQuizData,
    onInitialDataConsumed,
}: QuizTabProps) {
    const [difficulty, setDifficulty] = useState<Difficulty>("medium");
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(0);

    const [uploadedDocIds, setUploadedDocIds] = useState<string[]>(propDocumentIds.length > 0 ? propDocumentIds : []);
    const [uploadedFile, setUploadedFile] = useState<File | null>(initialFile ?? null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync when parent passes new doc IDs (e.g. after split-view transition)
    useEffect(() => {
        if (propDocumentIds.length > 0) {
            setUploadedDocIds(propDocumentIds);
        }
    }, [propDocumentIds]);

    const documentIds = uploadedDocIds;
    const hasDoc = documentIds.length > 0;

    // Restore from history
    useEffect(() => {
        if (!initialQuizData) return;
        const qs = initialQuizData.questions as QuizQuestion[];
        setQuestions(qs);
        setUserAnswers(initialQuizData.userAnswers);
        setSubmitted(initialQuizData.submitted);
        setScore(initialQuizData.score);
        setDifficulty(initialQuizData.difficulty as Difficulty);
        if (initialQuizData.filename) {
            setUploadedDocIds(["restored"]);
        }
        onInitialDataConsumed?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialQuizData]);

    /* ---- i18n helpers ---- */
    const i = (fr: string, ar: string, en: string) =>
        language === "ar" ? ar : language === "en" ? en : fr;

    const difficultyLabels: Record<Difficulty, { label: string; color: string; bg: string; ring: string }> = {
        easy: { label: i("Facile", "سهل", "Easy"), color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20", ring: "ring-emerald-400" },
        medium: { label: i("Moyen", "متوسط", "Medium"), color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20", ring: "ring-amber-400" },
        hard: { label: i("Difficile", "صعب", "Hard"), color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20", ring: "ring-rose-400" },
    };

    /* ---- File upload logic ---- */
    const handleFileSelect = useCallback(async (file: File) => {
        const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
        const validExts = [".pdf", ".docx", ".doc", ".pptx", ".txt"];
        if (!validExts.includes(ext)) {
            setError(i("Format non supporté.", "صيغة غير مدعومة.", "Unsupported format."));
            return;
        }
        if (file.size > MAX_MB * 1024 * 1024) {
            setError(i(`Taille max ${MAX_MB} Mo.`, `الحجم الأقصى ${MAX_MB} ميغابايت.`, `Max size ${MAX_MB} MB.`));
            return;
        }
        setUploadedFile(file);
        setError(null);
        setQuestions([]);
        setUserAnswers({});
        setSubmitted(false);
        setUploadProgress(0);
        setUploading(true);

        onFileSelected?.(file);

        try {
            const { document: doc } = await uploadPDF(file, (pct) => setUploadProgress(pct));
            setUploadedDocIds([doc.id]);
            onDocIdsReady?.([doc.id]);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : i("Erreur lors de l'importation.", "خطأ في الاستيراد.", "Upload error."));
            setUploadedFile(null);
        } finally {
            setUploading(false);
        }
    }, [language, onFileSelected, onDocIdsReady]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFileSelect(f);
    }, [handleFileSelect]);

    const handleRemoveFile = () => {
        setUploadedFile(null);
        setUploadedDocIds([]);
        setQuestions([]);
        setUserAnswers({});
        setSubmitted(false);
        setError(null);
        onFileSelected?.(null);
        onPdfClear?.();
        onDocIdsReady?.([]);
    };

    /* ---- Quiz logic ---- */
    const handleGenerate = async () => {
        if (!hasDoc) {
            setError(i("Aucun document sélectionné.", "لم يتم تحديد مستند.", "No document selected."));
            return;
        }
        setLoading(true);
        setError(null);
        setQuestions([]);
        setUserAnswers({});
        setSubmitted(false);
        setScore(0);
        try {
            const result = await generateQuiz(documentIds, difficulty, language);
            if (!result.questions || result.questions.length === 0) {
                setError(i("Aucune question générée. Réessayez.", "لم يتم توليد أسئلة. حاول مرة أخرى.", "No questions generated. Try again."));
            } else {
                setQuestions(result.questions);
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : i("Erreur lors de la génération.", "خطأ في التوليد.", "Generation error."));
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (qId: number, option: string) => {
        if (submitted) return;
        setUserAnswers(prev => ({ ...prev, [qId]: option }));
    };

    const handleSubmit = () => {
        let correct = 0;
        questions.forEach(q => { if (userAnswers[q.id] === q.correct) correct++; });
        setScore(correct);
        setSubmitted(true);
        // Save to global history
        addHistoryEntry({
            type: "quiz",
            title: uploadedFile ? uploadedFile.name : "Quiz sans document",
            preview: `${correct}/${questions.length} réponses correctes • Niveau : ${difficulty}`,
            quizData: {
                filename: uploadedFile?.name ?? "",
                difficulty,
                questions: questions as unknown[],
                userAnswers,
                submitted: true,
                score: correct,
            },
        });
    };

    const handleReset = () => {
        setQuestions([]);
        setUserAnswers({});
        setSubmitted(false);
        setScore(0);
        setError(null);
    };

    const answeredCount = Object.keys(userAnswers).length;
    const allAnswered = answeredCount === questions.length && questions.length > 0;
    const scorePercent = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    const scoreColor = scorePercent >= 70 ? "text-emerald-600 dark:text-emerald-400" : scorePercent >= 40 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400";
    const scoreLabel =
        scorePercent >= 80 ? i("Excellent !", "ممتاز!", "Excellent!") :
            scorePercent >= 60 ? i("Bien joué !", "عمل جيد!", "Good job!") :
                scorePercent >= 40 ? i("Peut mieux faire.", "يمكنك الأداء بشكل أفضل.", "Could do better.") :
                    i("Continuez à apprendre !", "استمر في التعلم!", "Keep learning!");

    return (
        <div className="flex flex-col w-full h-full overflow-hidden px-0 py-2">
            <div className="flex-1 overflow-y-auto scrollbar-hide pr-2 pb-10 flex flex-col gap-5">

                {/* ─── Control card ─── */}
                <div className="rounded-2xl border bg-card p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                            <Brain className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-base text-foreground">
                                {i("Générateur de QCM", "مولّد اختبارات", "Quiz Generator")}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {i("10 questions générées par IA depuis votre document", "١٠ أسئلة مولّدة بالذكاء الاصطناعي", "10 AI-generated questions from your document")}
                            </p>
                        </div>
                    </div>

                    {/* ─── Upload zone / file indicator ─── */}
                    {(propDocumentIds.length === 0 || uploadedFile) && (
                        <div
                            onDrop={handleDrop}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                            className={`relative mb-4 rounded-xl border-2 border-dashed transition-all duration-200 ${dragOver ? "border-primary bg-primary/5 scale-[1.01]" :
                                uploadedFile ? "border-primary/40 bg-primary/5" :
                                    "border-border bg-muted/30 hover:border-primary/40 hover:bg-primary/5"
                                } ${uploading ? "pointer-events-none opacity-70" : ""}`}
                        >
                            {uploadedFile ? (
                                <div className="flex items-center gap-3 px-4 py-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                        <FileText className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {uploading
                                                ? i(`Importation... ${uploadProgress}%`, `جارٍ الاستيراد... ${uploadProgress}%`, `Uploading... ${uploadProgress}%`)
                                                : i("Prêt pour le quiz", "جاهز للاختبار", "Ready for quiz")}
                                        </p>
                                    </div>
                                    {!uploading && (
                                        <button
                                            onClick={handleRemoveFile}
                                            className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                    {/* Progress bar */}
                                    {uploading && (
                                        <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl overflow-hidden bg-muted">
                                            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div
                                    className="flex flex-row items-center gap-4 px-5 py-4 cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                                        <Upload className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-medium text-foreground">
                                            {i("Importer un document", "استيراد مستند", "Import a document")}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {i("Glisser-déposer ou cliquer • PDF, Word, PPTX, TXT", "اسحب وأفلت أو انقر • PDF, Word, PPTX, TXT", "Drag & drop or click • PDF, Word, PPTX, TXT")}
                                        </p>
                                    </div>
                                </div>
                            )}
                            <input ref={fileInputRef} type="file" accept={ACCEPTED} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handleFileSelect(f); }} />
                        </div>
                    )}

                    {/* ─── Difficulty ─── */}
                    <div className="mb-4">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                            {i("Niveau de difficulté", "مستوى الصعوبة", "Difficulty level")}
                        </p>
                        <div className="flex gap-2">
                            {(["easy", "medium", "hard"] as Difficulty[]).map(d => (
                                <button
                                    key={d}
                                    onClick={() => setDifficulty(d)}
                                    className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-all ${difficultyLabels[d].bg} ${difficultyLabels[d].color} ${difficulty === d ? `ring-2 ring-offset-1 ${difficultyLabels[d].ring}` : ""}`}
                                >
                                    {difficultyLabels[d].label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ─── Generate button ─── */}
                    <button
                        onClick={handleGenerate}
                        disabled={loading || !hasDoc || uploading}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-[0.98]"
                    >
                        {loading ? (
                            <><Loader2 className="h-4 w-4 animate-spin" />{i("Génération en cours...", "جارٍ التوليد...", "Generating...")}</>
                        ) : (
                            <><BookOpen className="h-4 w-4" />{i("Générer le QCM", "توليد الاختبار", "Generate Quiz")}</>
                        )}
                    </button>

                    {error && <p className="mt-3 text-sm text-destructive text-center">{error}</p>}
                </div>

                {/* ─── Score banner ─── */}
                {submitted && questions.length > 0 && (
                    <div className="rounded-2xl border bg-card p-5 shadow-sm text-center">
                        <Trophy className={`mx-auto h-10 w-10 mb-2 ${scoreColor}`} />
                        <p className={`text-3xl font-bold ${scoreColor}`}>{score} / {questions.length}</p>
                        <p className={`text-sm font-medium mt-1 ${scoreColor}`}>{scoreLabel}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {i(`Score : ${scorePercent}%`, `النتيجة: ${scorePercent}%`, `Score: ${scorePercent}%`)}
                        </p>
                        <button
                            onClick={handleReset}
                            className="mt-4 flex items-center gap-2 mx-auto rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                        >
                            <RotateCcw className="h-4 w-4" />
                            {i("Recommencer", "إعادة المحاولة", "Try again")}
                        </button>
                    </div>
                )}

                {/* ─── Questions ─── */}
                {questions.map((q, idx) => {
                    const userAnswer = userAnswers[q.id];
                    const isCorrect = userAnswer === q.correct;
                    return (
                        <div
                            key={q.id}
                            className={`rounded-2xl border bg-card shadow-sm overflow-hidden transition-all ${submitted ? (isCorrect ? "border-emerald-200" : "border-rose-200") : ""}`}
                        >
                            <div className="p-5">
                                <div className="flex gap-3">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                        {idx + 1}
                                    </span>
                                    <p className="text-sm font-semibold text-foreground leading-snug">{q.question}</p>
                                </div>
                                <div className="mt-4 flex flex-col gap-2">
                                    {(["A", "B", "C", "D"] as const).map(opt => {
                                        const isSelected = userAnswer === opt;
                                        const isRight = q.correct === opt;
                                        let style = "border-border bg-muted/30 hover:bg-muted/50 text-foreground";
                                        if (submitted) {
                                            if (isRight) style = "border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold";
                                            else if (isSelected) style = "border-rose-500/40 bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300";
                                            else style = "border-border bg-muted/20 text-muted-foreground";
                                        } else if (isSelected) {
                                            style = "border-primary bg-primary/10 text-primary font-semibold";
                                        }
                                        return (
                                            <button
                                                key={opt}
                                                onClick={() => handleSelect(q.id, opt)}
                                                disabled={submitted}
                                                className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm text-left transition-all ${style} ${!submitted ? "cursor-pointer" : "cursor-default"}`}
                                            >
                                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold">{opt}</span>
                                                <span className="flex-1">{q.options[opt]}</span>
                                                {submitted && isRight && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                                                {submitted && isSelected && !isRight && <XCircle className="h-4 w-4 text-rose-500 shrink-0" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            {submitted && (
                                <div className={`px-5 py-3 text-xs border-t ${isCorrect ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"}`}>
                                    <span className="font-semibold">{i("Explication : ", "التفسير: ", "Explanation: ")}</span>
                                    {q.explanation}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* ─── Submit ─── */}
                {questions.length > 0 && !submitted && (
                    <button
                        onClick={handleSubmit}
                        disabled={!allAnswered}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-40 transition-all active:scale-[0.98]"
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        {i(
                            `Valider les réponses (${answeredCount}/${questions.length})`,
                            `تأكيد الإجابات (${answeredCount}/${questions.length})`,
                            `Submit answers (${answeredCount}/${questions.length})`
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
