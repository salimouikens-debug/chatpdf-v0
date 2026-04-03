"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, MessageSquare, Paperclip, FileText, Trash2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageBubble } from "@/components/message-bubble";
import {
  sendMessageStream,
  uploadPDF,
  getChatMessages,
  saveChatMessage,
  resetChat,
  type Source,
  type DocumentMeta,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

interface ChatInterfaceProps {
  chatId: string | null;
  documentIds: string[];
  documentNames: string[];
  onUploadComplete?: (doc: DocumentMeta, file: File) => void;
  onExtraDocAdded?: (docId: string, filename: string, blobUrl: string) => void;
}

const MAX_SIZE_MB = 50;

export function ChatInterface({ chatId, documentIds, documentNames, onUploadComplete, onExtraDocAdded }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadStage, setUploadStage] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevChatId = useRef<string | null>(null);
  const t = useTranslation();

  useEffect(() => {
    if (!chatId || chatId === prevChatId.current) return;
    prevChatId.current = chatId;
    setHistoryLoaded(false);

    getChatMessages(chatId)
      .then((saved) => {
        const restored: Message[] = saved.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          sources: m.sources?.length ? m.sources : undefined,
        }));
        setMessages(restored);
        setHistoryLoaded(true);
      })
      .catch(() => {
        setMessages([]);
        setHistoryLoaded(true);
      });
  }, [chatId]);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setHistoryLoaded(false);
      prevChatId.current = null;
    }
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const handleClearHistory = useCallback(async () => {
    if (!chatId) return;
    await resetChat(chatId);
    setMessages([]);
    setSuggestions([]);
  }, [chatId]);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      e.target.value = "";
      if (selectedFiles.length === 0 || !onUploadComplete) return;

      const { uploadPDF, uploadPDFWithoutChat, attachDocumentToChat } = await import("@/lib/api");

      for (const file of selectedFiles) {
        if (!file.name.toLowerCase().match(/\.(pdf|docx|pptx|txt)$/)) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Format non supporté pour ${file.name}.` },
          ]);
          continue;
        }

        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Fichier trop volumineux (${file.name}). Max ${MAX_SIZE_MB}MB.`,
            },
          ]);
          continue;
        }

        setUploading(true);
        setUploadProgress(0);
        setUploadFileName(file.name);
        setUploadStage(t("uploading") || "Uploading...");

        try {
          if (chatId) {
            // Already in a chat, so upload and attach
            const { document: doc } = await uploadPDFWithoutChat(file, (pct) => {
              setUploadProgress(pct);
              if (pct >= 100) setUploadStage(t("processing") || "Processing...");
            });
            await attachDocumentToChat(chatId, doc.id);
            const blobUrl = URL.createObjectURL(file);
            // Notify parent to add to extraDocs + viewer
            if (onExtraDocAdded) {
              onExtraDocAdded(doc.id, doc.filename, blobUrl);
            } else if (onUploadComplete) {
              onUploadComplete(doc, file);
            }
            const msg = `"${doc.filename}" a été ajouté à cette discussion — vous pouvez maintenant lui poser des questions.`;
            setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
          } else {
            // No chat yet (shouldn't happen here as ChatInterface usually has chatId, but for safety)
            const { document: doc } = await uploadPDF(file, (pct) => {
              setUploadProgress(pct);
              if (pct >= 100) setUploadStage(t("processing") || "Processing...");
            });
            onUploadComplete(doc, file);
            const msg = `"${doc.filename}" prêt.`;
            setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
          }
        } catch (err) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Échec pour ${file.name}: ${err instanceof Error ? err.message : "Erreur inconnue"}`,
            },
          ]);
        }
      }
      setUploading(false);
      setUploadProgress(0);
      setUploadFileName("");
      setUploadStage("");
      inputRef.current?.focus();
    },
    [onUploadComplete, onExtraDocAdded, chatId, t],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || documentIds.length === 0 || !chatId || loading || streaming) return;

      const question = input.trim();
      setInput("");

      const userMessage: Message = { role: "user", content: question };
      setMessages((prev) => [...prev, userMessage]);
      setSuggestions([]);
      setLoading(true);

      saveChatMessage(chatId, "user", question).catch(() => { });

      const chatHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const assistantMessage: Message = { role: "assistant", content: "" };
      let sourcesReceived: Source[] = [];

      try {
        setLoading(false);
        setStreaming(true);
        setMessages((prev) => [...prev, { ...assistantMessage }]);

        await sendMessageStream(
          question,
          documentIds,
          chatHistory,
          (token) => {
            assistantMessage.content += token;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...assistantMessage,
                sources: sourcesReceived,
              };
              return updated;
            });
          },
          (sources) => {
            sourcesReceived = sources;
          },
          (newSuggestions) => {
            setSuggestions(newSuggestions);
          },
        );

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...assistantMessage,
            sources: sourcesReceived,
          };
          return updated;
        });

        saveChatMessage(chatId, "assistant", assistantMessage.content, sourcesReceived).catch(
          () => { },
        );
      } catch (err) {
        const errorContent =
          err instanceof Error
            ? `Error: ${err.message}`
            : "An error occurred. Please try again.";
        setMessages((prev) => {
          const updated = [...prev];
          if (
            updated[updated.length - 1]?.role === "assistant" &&
            !updated[updated.length - 1].content
          ) {
            updated[updated.length - 1] = {
              role: "assistant",
              content: errorContent,
            };
          } else {
            updated.push({ role: "assistant", content: errorContent });
          }
          return updated;
        });
      } finally {
        setLoading(false);
        setStreaming(false);
        inputRef.current?.focus();
      }
    },
    [input, documentIds, chatId, loading, streaming, messages],
  );

  if (!chatId && !uploading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
        <div className="rounded-full bg-muted p-6">
          <MessageSquare className="h-12 w-12" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">
            {t("welcomeChatPdf")}
          </h3>
          <p className="mt-1 text-sm">
            {t("uploadPdfStart")}
          </p>
        </div>
        {onUploadComplete && (
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="mr-2 h-4 w-4" />
            {t("attachPdfBtn")}
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.pptx,.txt"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    );
  }

  const placeholderText = t("askDocPlaceholder");

  const starterPrompts = [
    "Summarize this document in 5 points",
    "What are the key topics?",
    "What are the main conclusions?",
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-3xl space-y-6">
          {historyLoaded && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
              <MessageSquare className="h-8 w-8" />
              <p className="text-sm text-center flex flex-col items-center">
                <span>{t("askAnythingAbout")}</span>
                <span className="font-medium text-foreground mt-1 px-4 py-1.5 bg-muted/50 rounded-lg max-w-sm truncate text-center">
                  {documentNames[0] ?? "the document"}
                </span>
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInput(prompt)}
                    className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {suggestions.length > 0 && !loading && !streaming && (
            <div className="flex flex-col items-start gap-2">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lightbulb className="h-3.5 w-3.5" />
                {t("suggestedQuestions")}
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setInput(s);
                      setSuggestions([]);
                      inputRef.current?.focus();
                    }}
                    className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t bg-background px-4 pb-4 pt-2">
        {uploading && (
          <div className="mx-auto max-w-3xl mb-2">
            <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{uploadFileName}</p>
                <p className="text-xs text-muted-foreground">{uploadStage}</p>
              </div>
              <div className="w-20 shrink-0">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-3xl items-center gap-2"
        >
          {onUploadComplete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={uploading || streaming}
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              title={t("attachPdfBtn")}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.pptx,.txt"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholderText}
            disabled={loading || streaming}
            className="flex-1"
          />
          {messages.length > 0 && !loading && !streaming && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClearHistory}
              className="shrink-0 text-muted-foreground hover:text-destructive"
              title={t("clearConversation")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="submit"
            disabled={!input.trim() || loading || streaming || !chatId}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
