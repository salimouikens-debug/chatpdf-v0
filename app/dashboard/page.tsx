"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Eye,
  EyeOff,
  Paperclip,
  MessageSquarePlus,
  LogOut,
  LogIn,

  Search,
  FolderOpen,
  ScanText,
  MessageCircle,
  Upload,
  HelpCircle,
  Send,
  Sparkles,
  Loader2,
  User,
  Settings,
  Clock,
  Brain,
  Info,
  X,
  Crown,
} from "lucide-react";


import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ConversationList } from "@/components/conversation-list";
import { ChatInterface } from "@/components/chat-interface";
import { PdfViewer } from "@/components/pdf-viewer";
import { AiDetector } from "@/components/ai-detector";
import { SummaryTab } from "@/components/summary-tab";
import { QuizTab } from "@/components/quiz-tab";
import { AuthModal } from "@/components/auth-modal";
import { ChatPdfLogo } from "@/components/chatpdf-logo";
import { HistoryPanel } from "@/components/history-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { DiscussionsPanel } from "@/components/discussions-panel";
import {
  getDocuments,
  attachPdf,
  fetchPdfBlobUrl,
  listChats,
  createChat,
  updateChat,
  deleteChat,
  resetChat,
  exportChat,
  uploadPDFWithoutChat,
  attachDocumentToChat,
  type DocumentMeta,
  type ChatSessionMeta,
} from "@/lib/api";
import { useTranslation, type Language } from "@/lib/i18n";
import { addHistoryEntry, type HistoryEntry } from "@/lib/history";

type HomeTab = "chat" | "detector" | "summary" | "quiz";

const GUEST_PDF_LIMIT = 2;

/* ---------- Sidebar nav item ---------- */
function SidebarNavItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${active
        ? "sidebar-nav-active text-blue-700 dark:text-white font-semibold"
        : "text-stone-700 dark:text-white/55 hover:bg-stone-300/40 dark:hover:bg-white/8 hover:text-stone-900 dark:hover:text-white border border-transparent"
        }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-blue-600 dark:text-teal-200" : "text-stone-500 dark:text-white/40"}`} strokeWidth={active ? 2 : 1.5} />
      {label}
    </button>
  );
}


export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [userName, setUserName] = useState("Guest");
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [chats, setChats] = useState<ChatSessionMeta[]>([]);
  const [activeChat, setActiveChat] = useState<ChatSessionMeta | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<HomeTab>("chat");
  const [sidebarSection, setSidebarSection] = useState<"explorer" | "detector" | "discussions" | "summary" | "quiz">("discussions");
  const [searchQuery, setSearchQuery] = useState("");
  const attachInputRef = useRef<HTMLInputElement>(null);
  const homeFileInputRef = useRef<HTMLInputElement>(null);
  const blobUrls = useRef<Record<string, string>>({});
  const [pdfLoading, setPdfLoading] = useState(false);
  const [extraDocs, setExtraDocs] = useState<{ id: string; filename: string; blobUrl: string }[]>([]);
  const addExtraDocInputRef = useRef<HTMLInputElement>(null);
  const [summaryPdf, setSummaryPdf] = useState<{ blobUrl: string; filename: string } | null>(null);
  const [summaryFile, setSummaryFile] = useState<File | null>(null);
  const [quizPdf, setQuizPdf] = useState<{ blobUrl: string; filename: string } | null>(null);
  const [quizFile, setQuizFile] = useState<File | null>(null);
  const [quizDocIds, setQuizDocIds] = useState<string[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [language, setLanguage] = useState("fr");
  const t = useTranslation(language);
  const [guestBannerDismissed, setGuestBannerDismissed] = useState(false);

  const isGuest = authChecked && !userEmail;

  // ---- Restorable state for history entries ----
  const [restoredQuizData, setRestoredQuizData] = useState<HistoryEntry["quizData"] | null>(null);
  const [restoredSummaryData, setRestoredSummaryData] = useState<HistoryEntry["summaryData"] | null>(null);
  const [restoredDetectorText, setRestoredDetectorText] = useState<string | null>(null);

  useEffect(() => {
    const savedLang = localStorage.getItem("app-lang") || "fr";
    setLanguage(savedLang);
    document.documentElement.dir = savedLang === "ar" ? "rtl" : "ltr";

    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? null;
      setUserEmail(email);
      setAuthChecked(true);
      if (email) {
        setUserName(email.split("@")[0]);
        Promise.all([getDocuments(), listChats()])
          .then(([docs, chatList]) => {
            setDocuments(docs);
            setChats(chatList);
          })
          .catch(() => { });
      }
    });
  }, []);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push("/");
  }, [supabase, router]);

  const activeDoc = activeChat
    ? documents.find((d) => d.id === activeChat.document_id) ?? null
    : null;

  const handleUploadComplete = useCallback(
    (doc: DocumentMeta, file: File) => {
      const blobUrl = URL.createObjectURL(file);
      const docWithBlob = { ...doc, blobUrl };
      blobUrls.current[doc.id] = blobUrl;
      setDocuments((prev) => [docWithBlob, ...prev]);

      setShowPdfPreview(true);
      toast.success("Document importé avec succès", {
        description: `${doc.filename} (${doc.total_pages} pages) est prêt.`,
      });
    },
    [],
  );

  const handleUploadWithChat = useCallback(
    async (doc: DocumentMeta, file: File) => {
      handleUploadComplete(doc, file);
      const chatList = await listChats();
      setChats(chatList);
      const newChat = chatList.find((c) => c.document_id === doc.id);
      if (newChat) setActiveChat(newChat);
    },
    [handleUploadComplete],
  );

  const handleInlineUpload = useCallback(
    (doc: DocumentMeta, file: File) => {
      const blobUrl = URL.createObjectURL(file);
      blobUrls.current[doc.id] = blobUrl;
      setDocuments((prev) => [{ ...doc, blobUrl }, ...prev]);
    },
    [],
  );

  const handleSelectChat = useCallback((chat: ChatSessionMeta) => {
    setActiveChat(chat);
    setExtraDocs([]);
    setSummaryPdf(null);
    setSummaryFile(null);
    setQuizPdf(null);
    setQuizFile(null);
    setQuizDocIds([]);
  }, []);

  const handleGoHome = useCallback(() => {
    setActiveChat(null);
    setActiveTab("chat");
    setSummaryPdf(null);
    setSummaryFile(null);
    setQuizPdf(null);
    setQuizFile(null);
    setQuizDocIds([]);
  }, []);

  const handleRename = useCallback(async (chatId: string, newTitle: string) => {
    try {
      const updated = await updateChat(chatId, { title: newTitle });
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, ...updated } : c)));
      setActiveChat((prev) => (prev?.id === chatId ? { ...prev, ...updated } : prev));
    } catch {
      toast.error("Échec du renommage");
    }
  }, []);

  const handlePin = useCallback(async (chatId: string, pinned: boolean) => {
    try {
      const updated = await updateChat(chatId, { pinned });
      setChats((prev) => {
        const list = prev.map((c) => (c.id === chatId ? { ...c, ...updated } : c));
        return list.sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
      });
      setActiveChat((prev) => (prev?.id === chatId ? { ...prev, ...updated } : prev));
      toast.success(pinned ? "Chat épinglé" : "Chat désépinglé");
    } catch {
      toast.error("Échec de l'opération");
    }
  }, []);

  const handleDeleteChat = useCallback(async (chatId: string) => {
    try {
      await deleteChat(chatId);
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      setActiveChat((prev) => (prev?.id === chatId ? null : prev));
      toast.success("Chat supprimé");
    } catch {
      toast.error("Échec de la suppression");
    }
  }, []);

  const handleResetChat = useCallback(async (chatId: string) => {
    try {
      await resetChat(chatId);
      toast.success("Chat réinitialisé");
    } catch {
      toast.error("Échec de la réinitialisation");
    }
  }, []);

  const handleExport = useCallback(async (chatId: string) => {
    try {
      const data = await exportChat(chatId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.chat.title.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Chat exporté");
    } catch {
      toast.error("Échec de l'export");
    }
  }, []);

  const handleNewChat = useCallback(async () => {
    if (!activeDoc) return;
    try {
      const chat = await createChat(activeDoc.id);
      setChats((prev) => [chat, ...prev]);
      setActiveChat(chat);
    } catch {
      toast.error("Échec de la création");
    }
  }, [activeDoc]);

  const handleAttachPdf = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !activeDoc) return;
      try {
        await attachPdf(activeDoc.id, file);
        const blobUrl = URL.createObjectURL(file);
        blobUrls.current[activeDoc.id] = blobUrl;
        const updated = { ...activeDoc, has_pdf: true, blobUrl };
        setDocuments((prev) =>
          prev.map((d) => (d.id === activeDoc.id ? updated : d)),
        );
        setShowPdfPreview(true);
        toast.success("Document joint avec succès");
      } catch {
        toast.error("Échec de l'envoi du document");
      }
    },
    [activeDoc],
  );

  // Add an extra PDF to the current chat (multi-document)
  const handleAddExtraDoc = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      e.target.value = "";
      if (files.length === 0 || !activeChat) return;

      const allowed = [".pdf", ".docx", ".doc", ".pptx", ".txt"];

      const doUploads = async () => {
        for (const file of files) {
          const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
          if (!allowed.includes(ext)) continue;
          if (file.size > 50 * 1024 * 1024) continue;

          const { document: doc } = await uploadPDFWithoutChat(file, () => { });
          await attachDocumentToChat(activeChat.id, doc.id);
          const blobUrl = URL.createObjectURL(file);
          blobUrls.current[doc.id] = blobUrl;
          setExtraDocs((prev) => [...prev, { id: doc.id, filename: doc.filename, blobUrl }]);
          setShowPdfPreview(true);
        }
      };

      toast.promise(doUploads(), {
        loading: files.length > 1 ? `Ajout de ${files.length} documents...` : `Ajout de ${files[0].name}...`,
        success: "Documents ajoutés à la discussion !",
        error: "Échec de l'ajout",
      });
    },
    [activeChat],
  );

  const handleHomeFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;

      if (isGuest && documents.length >= GUEST_PDF_LIMIT) {
        toast.error("Guest mode limit reached", {
          description: `You can upload up to ${GUEST_PDF_LIMIT} documents. Create an account for unlimited uploads.`,
        });
        return;
      }

      const allowed = [".pdf", ".docx", ".doc", ".pptx", ".txt"];
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if (!allowed.includes(ext)) {
        toast.error("Format non supporté", { description: "Formats acceptés : PDF, DOCX, PPTX, TXT" });
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error("Fichier trop volumineux", { description: "Taille maximale : 50 MB" });
        return;
      }

      const uploadPromise = (async () => {
        const { uploadPDF } = await import("@/lib/api");
        const { document: doc } = await uploadPDF(file, () => { });
        handleUploadWithChat(doc, file);
      })();

      toast.promise(uploadPromise, {
        loading: `Importation de ${file.name}...`,
        success: `${file.name} importé avec succès !`,
        error: "Échec de l'importation",
      });
    },
    [handleUploadWithChat, isGuest, documents.length],
  );

  // All document IDs for RAG queries (main + extras)
  const documentIds = activeDoc
    ? [activeDoc.id, ...extraDocs.map((d) => d.id)]
    : [];

  const pdfAvailable =
    activeDoc && (blobUrls.current[activeDoc.id] || activeDoc.blobUrl || activeDoc.has_pdf);

  useEffect(() => {
    if (!activeDoc || !activeDoc.has_pdf) return;
    if (blobUrls.current[activeDoc.id] || activeDoc.blobUrl) return;
    setPdfLoading(true);
    fetchPdfBlobUrl(activeDoc.id)
      .then((url) => {
        blobUrls.current[activeDoc.id] = url;
        setDocuments((prev) =>
          prev.map((d) => (d.id === activeDoc.id ? { ...d, blobUrl: url } : d))
        );
      })
      .catch(() => { })
      .finally(() => setPdfLoading(false));
  }, [activeDoc]);

  const resolvedBlobUrl = activeDoc
    ? blobUrls.current[activeDoc.id] || activeDoc.blobUrl || ""
    : "";

  // Build preview docs array: main doc + all extras
  const previewDocs = (() => {
    if (!activeDoc || !pdfAvailable || !resolvedBlobUrl) return [];
    const docs: { blobUrl: string; filename: string }[] = [
      { blobUrl: resolvedBlobUrl, filename: activeDoc.filename },
    ];
    for (const ed of extraDocs) {
      if (ed.blobUrl) docs.push({ blobUrl: ed.blobUrl, filename: ed.filename });
    }
    return docs;
  })();

  // Filter chats by search query
  const filteredChats = searchQuery.trim()
    ? chats.filter(
      (c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.document_filename ?? "").toLowerCase().includes(searchQuery.toLowerCase())
    )
    : chats;

  // Transition to quiz split-view only after doc IDs are ready
  useEffect(() => {
    if (quizDocIds.length > 0 && quizFile && !quizPdf) {
      const blobUrl = URL.createObjectURL(quizFile);
      setQuizPdf({ blobUrl, filename: quizFile.name });
      setShowPdfPreview(true);
    }
  }, [quizDocIds, quizFile, quizPdf]);

  const isHomeScreen = !activeChat && !(activeTab === "summary" && summaryPdf) && !(activeTab === "quiz" && quizPdf);

  return (
    <>
      <div className="flex h-screen bg-[#F5F1EC] dark:bg-[#0F1219]">
        {/* ============ SIDEBAR ============ */}
        <div
          className={`glass-sidebar flex flex-col transition-all duration-300 overflow-hidden ${sidebarOpen ? "w-72" : "w-0"}`}
        >
          {/* Logo */}
          <div
            className="flex items-center px-5 pt-6 pb-5 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleGoHome}
          >
            <ChatPdfLogo variant="light" size={38} className="dark:hidden" />
            <ChatPdfLogo variant="sidebar" size={38} className="hidden dark:flex" />
          </div>

          {/* Search */}
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2.5 rounded-xl border border-stone-300/60 dark:border-white/10 bg-white/50 dark:bg-white/5 px-3.5 py-2.5 transition-all focus-within:bg-white/80 focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.08)] dark:focus-within:bg-white/10 focus-within:border-blue-400/40 dark:focus-within:border-white/20">
              <Search className="h-3.5 w-3.5 text-stone-500 dark:text-white/35 shrink-0" strokeWidth={1.5} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full bg-transparent text-[13px] text-stone-800 dark:text-white placeholder:text-stone-500 dark:placeholder:text-white/35 outline-none"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="mx-4 mb-3 border-t border-stone-300/50 dark:border-white/6" />

          {/* Nav */}
          <div className="px-3 space-y-1">
            <SidebarNavItem
              icon={FolderOpen}
              label={t("explorer")}
              active={sidebarSection === "explorer"}
              onClick={() => {
                setSidebarSection("explorer");
                setActiveChat(null);
                setActiveTab("chat");
                setSummaryPdf(null);
                setSummaryFile(null);
              }}
            />
            <SidebarNavItem
              icon={ScanText}
              label={t("aiDetector")}
              active={sidebarSection === "detector"}
              onClick={() => {
                setSidebarSection("detector");
                setActiveChat(null);
                setActiveTab("detector");
              }}
            />
            <SidebarNavItem
              icon={Sparkles}
              label="Résumé"
              active={sidebarSection === "summary"}
              onClick={() => {
                setSidebarSection("summary");
                setActiveChat(null);
                setActiveTab("summary");
              }}
            />
            <SidebarNavItem
              icon={Brain}
              label="QCM"
              active={sidebarSection === "quiz"}
              onClick={() => {
                setSidebarSection("quiz");
                setActiveChat(null);
                setActiveTab("quiz");
              }}
            />
            <SidebarNavItem
              icon={MessageCircle}
              label="Discussions"
              active={sidebarSection === "discussions"}
              onClick={() => setSidebarSection("discussions")}
            />
          </div>

          {/* Divider */}
          <div className="mx-4 mt-3 border-t border-stone-300/50 dark:border-white/6" />

          {/* Discussions panel */}
          <div className="flex-1 min-h-0 mt-2">
            {isGuest ? (
              <div className="flex flex-col items-center justify-center h-full px-5 text-center gap-3">
                <Clock className="h-8 w-8 text-stone-400 dark:text-white/15" />
                <p className="text-xs text-stone-600 dark:text-white/25 leading-relaxed">
                  History is disabled in guest mode. Create an account to save your conversations.
                </p>
              </div>
            ) : (
              <DiscussionsPanel
                chats={filteredChats}
                activeChatId={activeChat?.id ?? null}
                onSelectChat={handleSelectChat}
                onDeleteChat={handleDeleteChat}
                onRenameChat={handleRename}
                onPinChat={handlePin}
                onResetChat={handleResetChat}
                onRestoreHistory={(entry) => {
                  if (entry.type === "quiz") {
                    setActiveChat(null);
                    setActiveTab("quiz");
                    if (entry.quizData?.blobUrl && entry.quizData.filename) {
                      setQuizPdf({ blobUrl: entry.quizData.blobUrl, filename: entry.quizData.filename });
                      setShowPdfPreview(true);
                    }
                    setRestoredQuizData(entry.quizData ?? null);
                  } else if (entry.type === "summary") {
                    setActiveChat(null);
                    setActiveTab("summary");
                    if (entry.summaryData?.blobUrl && entry.summaryData.filename) {
                      setSummaryPdf({ blobUrl: entry.summaryData.blobUrl, filename: entry.summaryData.filename });
                      setShowPdfPreview(true);
                    }
                    setRestoredSummaryData(entry.summaryData ?? null);
                  } else if (entry.type === "detector") {
                    setActiveChat(null);
                    setActiveTab("detector");
                    setRestoredDetectorText(entry.detectorData?.text ?? null);
                  }
                }}
              />
            )}
          </div>

          {/* Bottom auth area */}
          <div className="border-t border-stone-300/50 dark:border-white/8 p-3 mx-1">
            {userEmail ? (
              <div className="flex items-center gap-2.5 rounded-xl bg-white/40 dark:bg-white/5 border border-stone-300/40 dark:border-transparent p-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal text-sm font-bold text-white shrink-0">
                  {userEmail[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-stone-800 dark:text-white/85">{userEmail}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="shrink-0 rounded-lg p-1.5 text-stone-500 dark:text-white/40 hover:bg-stone-300/30 dark:hover:bg-white/10 hover:text-stone-700 dark:hover:text-white transition-colors"
                  title="Se déconnecter"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5 rounded-xl border border-stone-300/40 dark:border-white/8 bg-white/30 dark:bg-white/4 px-3 py-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 shrink-0">
                    <User className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-stone-800 dark:text-white/60">Guest mode</p>
                    <p className="text-[10px] text-stone-600 dark:text-white/30 leading-tight">Data not saved</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/signup")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal/25 hover:bg-teal-light hover:shadow-teal/35 hover:-translate-y-0.5 transition-all"
                >
                  <Crown className="h-4 w-4" />
                  Create account
                </button>
                <button
                  onClick={() => router.push("/login")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300/60 dark:border-white/8 py-2 text-xs font-medium text-stone-700 dark:text-white/45 hover:bg-white/40 dark:hover:bg-white/5 hover:text-stone-900 dark:hover:text-white/70 transition-all"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Already have an account? Log in
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ============ MAIN AREA ============ */}
        <div className="flex flex-1 flex-col min-w-0 relative">
          {/* Video background — covers the ENTIRE main area (header + content) */}
          {!activeChat && !(activeTab === "summary" && summaryPdf) && !(activeTab === "quiz" && quizPdf) && (
            <>
              <video
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                poster="/chatpdf-hero.png"
                className="absolute inset-0 h-full w-full object-cover z-0"
              >
                <source src="/3202364-hd_1920_1080_25fps.mp4" type="video/mp4" />
              </video>
              <div className="absolute inset-0 video-overlay z-[1]" />
            </>
          )}

          {/* Top Bar — transparent on home (video), solid on chat */}
          <div className={`flex items-center gap-3 px-4 py-3 relative z-20 ${isHomeScreen ? "" : "bg-white/80 dark:bg-[#1a1a2e]/90 backdrop-blur-xl border-b border-stone-200/60 dark:border-white/5"}`}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={isHomeScreen
                ? "text-white/80 dark:text-white/70 hover:text-white dark:hover:text-white hover:bg-white/15 dark:hover:bg-white/10"
                : "text-stone-600 dark:text-white/70 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10"
              }
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-5 w-5" />
              ) : (
                <PanelLeft className="h-5 w-5" />
              )}
            </Button>

            {activeChat && activeDoc ? (
              <>
                <div className="flex-1 min-w-0">
                  <h2 className="truncate font-semibold text-stone-900 dark:text-white">{activeChat.title}</h2>
                  <p className="text-xs text-stone-500 dark:text-white/60">
                    {extraDocs.length > 0
                      ? <span className="font-medium text-blue-600 dark:text-teal-200">{1 + extraDocs.length} documents</span>
                      : <>{activeDoc.filename} &middot; {activeDoc.total_pages} p.</>}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleNewChat} className="border-stone-200 dark:border-white/25 text-stone-700 dark:text-white/90 hover:bg-stone-100 dark:hover:bg-white/15 bg-white/60 dark:bg-white/10 backdrop-blur-sm">
                  <MessageSquarePlus className="mr-2 h-4 w-4" />
                  {t("newChat")}
                </Button>
                {pdfAvailable ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPdfPreview(!showPdfPreview)}
                    className={showPdfPreview ? "border-blue-200 dark:border-white/30 bg-blue-50/60 dark:bg-white/20 text-blue-700 dark:text-white hover:bg-blue-50 dark:hover:bg-white/25 backdrop-blur-sm" : "border-stone-200 dark:border-white/25 text-stone-700 dark:text-white/90 hover:bg-stone-100 dark:hover:bg-white/15 bg-white/60 dark:bg-white/10 backdrop-blur-sm"}
                  >
                    {showPdfPreview ? (
                      <EyeOff className="mr-2 h-4 w-4" />
                    ) : (
                      <Eye className="mr-2 h-4 w-4" />
                    )}
                    {showPdfPreview ? t("hidePdf") : t("viewPdf")}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => attachInputRef.current?.click()}
                    className="border-stone-200 dark:border-white/25 text-stone-700 dark:text-white/90 hover:bg-stone-100 dark:hover:bg-white/15 bg-white/60 dark:bg-white/10 backdrop-blur-sm"
                  >
                    <Paperclip className="mr-2 h-4 w-4" />
                    {t("attachPdf")}
                  </Button>
                )}
                {pdfAvailable && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addExtraDocInputRef.current?.click()}
                    title={language === "en" ? "Add another document" : "Ajouter un document"}
                    className="gap-1.5 border-stone-200 dark:border-white/25 text-stone-700 dark:text-white/90 hover:bg-stone-100 dark:hover:bg-white/15 bg-white/60 dark:bg-white/10 backdrop-blur-sm"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {language === "en" ? "Add doc" : "Ajouter"}
                    </span>
                  </Button>
                )}
                <input
                  ref={attachInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.pptx,.txt"
                  className="hidden"
                  onChange={handleAttachPdf}
                />
                <input
                  ref={addExtraDocInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.pptx,.txt"
                  className="hidden"
                  onChange={handleAddExtraDoc}
                />
              </>
            ) : (activeTab === "quiz" && quizPdf) || (activeTab === "summary" && summaryPdf) ? (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-stone-600 dark:text-white/70 truncate font-medium">
                    {activeTab === "quiz" ? (quizPdf?.filename ?? "") : (summaryPdf?.filename ?? "")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPdfPreview(!showPdfPreview)}
                  className={showPdfPreview ? "border-blue-200 dark:border-white/30 bg-blue-50/60 dark:bg-white/20 text-blue-700 dark:text-white hover:bg-blue-50 dark:hover:bg-white/25 backdrop-blur-sm" : "border-stone-200 dark:border-white/25 text-stone-700 dark:text-white/90 hover:bg-stone-100 dark:hover:bg-white/15 bg-white/60 dark:bg-white/10 backdrop-blur-sm"}
                >
                  {showPdfPreview ? (
                    <EyeOff className="mr-2 h-4 w-4" />
                  ) : (
                    <Eye className="mr-2 h-4 w-4" />
                  )}
                  {showPdfPreview ? t("hidePdf") : t("viewPdf")}
                </Button>
              </>
            ) : (
              <div className="flex-1" />
            )}

            <ThemeToggle className={isHomeScreen
              ? "relative flex h-8 w-8 items-center justify-center rounded-full text-white/70 dark:text-white/60 transition-all hover:bg-white/15 dark:hover:bg-white/10 hover:text-white dark:hover:text-white"
              : "relative flex h-8 w-8 items-center justify-center rounded-full text-stone-600 dark:text-white/60 transition-all hover:bg-stone-200/50 dark:hover:bg-white/10 hover:text-stone-900 dark:hover:text-white"
            } />

            {/* User avatar */}
            {userEmail && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex h-[36px] w-[36px] select-none items-center justify-center rounded-full bg-teal text-[15px] font-semibold text-white outline-none transition-all hover:bg-teal-light focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95">
                    {userName ? userName[0].toUpperCase() : userEmail[0].toUpperCase()}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[240px] rounded-xl p-1 shadow-lg" sideOffset={10}>
                  <div className="flex flex-col space-y-1 p-2.5">
                    <p className="text-sm font-semibold leading-none">{userName}</p>
                    <p className="text-[13px] leading-none text-muted-foreground mt-1.5">{userEmail}</p>
                  </div>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem className="cursor-pointer rounded-lg py-2.5 focus:bg-muted" onClick={() => router.push("/settings")}>
                    <User className="mr-2.5 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{t("profile")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer rounded-lg py-2.5 focus:bg-muted" onClick={() => router.push("/settings")}>
                    <Settings className="mr-2.5 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{t("settingsTitle")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    className="cursor-pointer rounded-lg py-2.5 focus:bg-muted"
                    onClick={() => {
                      setSidebarOpen(true);
                      setSidebarSection("explorer");
                      setActiveChat(null);
                      setActiveTab("chat");
                      setSummaryPdf(null);
                      setSummaryFile(null);
                    }}
                  >
                    <FileText className="mr-2.5 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{t("myDocuments")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer rounded-lg py-2.5 focus:bg-muted"
                    onClick={() => {
                      setSidebarOpen(true);
                      setSidebarSection("discussions");
                    }}
                  >
                    <Clock className="mr-2.5 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{t("history")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer rounded-lg py-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive"
                  >
                    <LogOut className="mr-2.5 h-4 w-4" />
                    <span className="font-medium">{t("logout")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Guest mode banner */}
          {isGuest && !guestBannerDismissed && (
            <div className="flex items-center gap-3 border-b border-amber-500/15 bg-amber-500/8 dark:bg-amber-500/10 backdrop-blur-sm px-4 py-2.5 relative z-20">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="flex-1 text-sm text-amber-700 dark:text-amber-300">
                <span className="font-medium">Guest mode</span> — Your data will not be saved after you leave.{" "}
                <button
                  onClick={() => router.push("/signup")}
                  className="font-semibold underline underline-offset-2 hover:text-amber-600 dark:hover:text-amber-200 transition-colors"
                >
                  Create an account
                </button>{" "}
                to save your work.
              </p>
              <span className="text-xs text-amber-600/60 dark:text-amber-400/60 shrink-0">
                {documents.length}/{GUEST_PDF_LIMIT} PDFs
              </span>
              <button
                onClick={() => setGuestBannerDismissed(true)}
                className="shrink-0 rounded-md p-1 text-amber-500/50 dark:text-amber-400/50 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Content */}
          <div className="flex flex-1 overflow-hidden relative z-10">
            {/* PDF viewer for chat mode */}
            {activeTab === "chat" && showPdfPreview && activeDoc && activeChat && (
              <div className="w-1/2 border-r">
                {pdfLoading || (pdfAvailable && !resolvedBlobUrl) ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin text-teal" />
                    <p className="text-sm">{t("loadingDocument")}</p>
                  </div>
                ) : previewDocs.length > 0 ? (
                  <PdfViewer documents={previewDocs} />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                    <FileText className="h-8 w-8" />
                    <p className="text-sm">{t("noDocumentAvailable")}</p>
                  </div>
                )}
              </div>
            )}

            {/* PDF viewer for summary tab */}
            {!activeChat && activeTab === "summary" && summaryPdf && showPdfPreview && (
              <div className="w-1/2 border-r bg-background/80 backdrop-blur-sm">
                <PdfViewer documents={[summaryPdf]} />
              </div>
            )}

            {/* PDF viewer for quiz tab */}
            {activeTab === "quiz" && quizPdf && showPdfPreview && (
              <div className="w-1/2 border-r bg-background/80 backdrop-blur-sm">
                <PdfViewer documents={[quizPdf]} />
              </div>
            )}

            <div
              className={
                (activeTab === "chat" && showPdfPreview && activeDoc && activeChat)
                  || (!activeChat && activeTab === "summary" && summaryPdf && showPdfPreview)
                  || (activeTab === "quiz" && quizPdf && showPdfPreview)
                  ? "w-1/2" : "flex-1"
              }
            >
              {activeTab === "chat" && activeChat ? (
                <ChatInterface
                  chatId={activeChat?.id ?? null}
                  documentIds={documentIds}
                  documentNames={activeDoc ? [activeDoc.filename] : []}
                  onUploadComplete={handleInlineUpload}
                  onExtraDocAdded={(docId, filename, blobUrl) => {
                    blobUrls.current[docId] = blobUrl;
                    setExtraDocs((prev) => [...prev, { id: docId, filename, blobUrl }]);
                    setShowPdfPreview(true);
                  }}
                />
              ) : activeTab === "summary" && summaryPdf ? (
                /* ====== SUMMARY SPLIT VIEW (PDF on left) ====== */
                <SummaryTab
                  initialFile={summaryFile}
                  onFileSelected={setSummaryFile}
                  onPdfReady={(blobUrl, filename) => {
                    setSummaryPdf({ blobUrl, filename });
                    setShowPdfPreview(true);
                  }}
                  onPdfClear={() => setSummaryPdf(null)}
                />
              ) : activeTab === "quiz" && quizPdf ? (
                /* ====== QUIZ SPLIT VIEW — single QuizTab instance ====== */
                <div className="flex h-full flex-col overflow-hidden">
                  <div className="flex-1 flex flex-col px-4 py-4 w-full overflow-y-auto scrollbar-hide">
                    {activeTab === "quiz" && (
                      <div className="w-full">
                        <QuizTab
                          documentIds={quizDocIds}
                          language={language}
                          initialFile={quizFile}
                          onFileSelected={setQuizFile}
                          onPdfClear={() => { setQuizPdf(null); setQuizDocIds([]); }}
                          onDocIdsReady={setQuizDocIds}
                          initialQuizData={restoredQuizData ?? undefined}
                          onInitialDataConsumed={() => setRestoredQuizData(null)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ====== WELCOME / HOME ====== */
                <div className="relative flex h-full flex-col overflow-hidden">
                  <div className={`relative z-10 flex-1 flex flex-col items-center px-4 sm:px-6 pb-4 max-w-2xl mx-auto w-full overflow-y-auto scrollbar-hide ${activeTab !== "chat" ? "pt-6 justify-start" : "pt-0 justify-center"}`}>

                    {/* Hidden file input */}
                    <input
                      ref={homeFileInputRef}
                      type="file"
                      accept=".pdf,.docx,.doc,.pptx,.txt"
                      className="hidden"
                      onChange={handleHomeFileSelect}
                    />

                    {/* Greeting */}
                    <div className="animate-fade-slide-up text-center">
                      <h2 className="text-center mt-2">
                        <span className="text-white/70 font-medium text-3xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">{t("greeting")}</span>
                        <span className="text-white font-extrabold text-3xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">{isGuest ? "Guest" : userName}</span>
                      </h2>
                      <h3 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 text-center tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.4)]">
                        {t("howCanIHelp")}
                      </h3>
                    </div>

                    {/* Tabs */}
                    <div className="animate-fade-slide-up delay-100 mt-6 grid grid-cols-2 sm:inline-flex sm:items-center gap-1 rounded-2xl sm:rounded-full bg-white/10 backdrop-blur-xl border border-white/20 p-1.5">
                      <button
                        onClick={() => { setActiveTab("chat"); setSummaryPdf(null); setSummaryFile(null); setQuizPdf(null); setQuizFile(null); setQuizDocIds([]); }}
                        className={`flex items-center justify-center gap-2 rounded-xl sm:rounded-full px-4 sm:px-5 py-2.5 text-sm font-semibold transition-all ${activeTab === "chat"
                          ? "bg-teal text-white shadow-lg shadow-teal/30"
                          : "text-white/80 hover:text-white hover:bg-white/15"
                          }`}
                      >
                        <MessageCircle className="h-4 w-4" />
                        {t("chatPdf")}
                      </button>
                      <button
                        onClick={() => { setActiveTab("detector"); setSummaryPdf(null); setSummaryFile(null); setQuizPdf(null); setQuizFile(null); setQuizDocIds([]); }}
                        className={`flex items-center justify-center gap-2 rounded-xl sm:rounded-full px-4 sm:px-5 py-2.5 text-sm font-semibold transition-all ${activeTab === "detector"
                          ? "bg-teal text-white shadow-lg shadow-teal/30"
                          : "text-white/80 hover:text-white hover:bg-white/15"
                          }`}
                      >
                        <ScanText className="h-4 w-4" />
                        Détecteur IA
                      </button>
                      <button
                        onClick={() => { setActiveTab("summary"); setQuizPdf(null); setQuizFile(null); setQuizDocIds([]); }}
                        className={`flex items-center justify-center gap-2 rounded-xl sm:rounded-full px-4 sm:px-5 py-2.5 text-sm font-semibold transition-all ${activeTab === "summary"
                          ? "bg-teal text-white shadow-lg shadow-teal/30"
                          : "text-white/80 hover:text-white hover:bg-white/15"
                          }`}
                      >
                        <Sparkles className="h-4 w-4" />
                        {t("summaryNav")}
                      </button>
                      <button
                        onClick={() => { setActiveTab("quiz"); setSummaryPdf(null); setSummaryFile(null); }}
                        className={`flex items-center justify-center gap-2 rounded-xl sm:rounded-full px-4 sm:px-5 py-2.5 text-sm font-semibold transition-all ${activeTab === "quiz"
                          ? "bg-teal text-white shadow-lg shadow-teal/30"
                          : "text-white/80 hover:text-white hover:bg-white/15"
                          }`}
                      >
                        <Brain className="h-4 w-4" />
                        {language === "fr" ? "QCM" : language === "ar" ? "اختبار" : "Quiz"}
                      </button>
                    </div>

                    {/* Tab Content */}
                    <div className="w-full mt-5">
                      {activeTab === "chat" && (
                        <div className="space-y-4">
                          {/* Glass search bar */}
                          <div className="animate-fade-slide-up delay-200 flex items-center gap-3 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 px-5 py-4">
                            <p className="flex-1 text-sm text-stone-500">
                              {t("askQuestionPlaceholder")}
                            </p>
                            <button
                              onClick={() => homeFileInputRef.current?.click()}
                              className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-700 transition-colors"
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                              {t("attachFile")}
                            </button>
                            <button
                              onClick={() => homeFileInputRef.current?.click()}
                              className="flex h-10 w-10 items-center justify-center rounded-full bg-teal text-white shadow-lg shadow-teal/25 hover:bg-teal-light hover:scale-105 hover:shadow-teal/40 transition-all"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Action cards */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                              onClick={() => homeFileInputRef.current?.click()}
                              className="animate-fade-slide-up delay-300 flex items-start gap-4 p-5 text-left group rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 hover:bg-white/80 hover:shadow-xl hover:shadow-black/8 hover:-translate-y-0.5 transition-all"
                            >
                              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0 group-hover:bg-blue-100 transition-all">
                                <Upload className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm text-stone-900">{t("importPdf")}</p>
                                <p className="text-xs text-stone-500 mt-1">
                                  {t("dragDropBrowse")}
                                </p>
                              </div>
                            </button>
                            <button
                              onClick={() => {
                                if (chats.length > 0) {
                                  setActiveChat(chats[0]);
                                } else {
                                  toast.info(t("importDocFirst"));
                                }
                              }}
                              className="animate-fade-slide-up delay-400 flex items-start gap-4 p-5 text-left group rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 hover:bg-white/80 hover:shadow-xl hover:shadow-black/8 hover:-translate-y-0.5 transition-all"
                            >
                              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0 group-hover:bg-blue-100 transition-all">
                                <HelpCircle className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm text-stone-900">{t("askQuestion")}</p>
                                <p className="text-xs text-stone-500 mt-1">
                                  {t("queryDocContent")}
                                </p>
                              </div>
                            </button>
                          </div>
                        </div>
                      )}

                      {activeTab === "detector" && (
                        <div className="animate-fade-slide-up delay-200 w-full mb-6 rounded-2xl glass-card p-5">
                          <AiDetector
                            initialText={restoredDetectorText ?? undefined}
                            onInitialTextConsumed={() => setRestoredDetectorText(null)}
                          />
                        </div>
                      )}

                      {activeTab === "summary" && (
                        <div className="animate-fade-slide-up delay-200 w-full mb-6 rounded-2xl glass-card p-5">
                          <SummaryTab
                            initialFile={summaryFile}
                            onFileSelected={setSummaryFile}
                            onPdfReady={(blobUrl, filename) => {
                              setSummaryPdf({ blobUrl, filename });
                              setShowPdfPreview(true);
                            }}
                            onPdfClear={() => setSummaryPdf(null)}
                            initialSummaryData={restoredSummaryData ?? undefined}
                            onInitialDataConsumed={() => setRestoredSummaryData(null)}
                          />
                        </div>
                      )}

                      {activeTab === "quiz" && !quizPdf && (
                        <div className="animate-fade-slide-up delay-200 w-full mb-6 rounded-2xl glass-card p-5">
                          <QuizTab
                            documentIds={quizDocIds}
                            language={language}
                            initialFile={quizFile}
                            onFileSelected={setQuizFile}
                            onPdfClear={() => { setQuizPdf(null); setQuizDocIds([]); }}
                            onDocIdsReady={setQuizDocIds}
                            initialQuizData={restoredQuizData ?? undefined}
                            onInitialDataConsumed={() => setRestoredQuizData(null)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </>
  );
}
