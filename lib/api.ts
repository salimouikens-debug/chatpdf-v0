import { createClient } from "@/lib/supabase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getAnonSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem("anon_session_id");
  if (!id) {
    id = "anon-" + crypto.randomUUID();
    sessionStorage.setItem("anon_session_id", id);
  }
  return id;
}

async function getAccessToken(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

async function authHeaders(json = true): Promise<Record<string, string>> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    // Anonymous user: send a unique session ID
    headers["X-Anon-Session-Id"] = getAnonSessionId();
  }
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

function extractErrorDetail(body: unknown, fallback: string): string {
  const obj = body as Record<string, unknown> | null;
  if (!obj) return fallback;
  const detail = obj.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((e: { msg?: string }) => e.msg ?? JSON.stringify(e)).join("; ");
  }
  return fallback;
}

export interface DocumentMeta {
  id: string;
  filename: string;
  total_pages: number;
  total_chunks: number;
  has_pdf?: boolean;
  blobUrl?: string;
}

export function getPdfUrl(docId: string): string {
  return `${API_BASE}/api/documents/${docId}/pdf`;
}

export async function fetchPdfBlobUrl(docId: string): Promise<string> {
  const headers = await authHeaders(false);
  const res = await fetch(`${API_BASE}/api/documents/${docId}/pdf`, { headers });
  if (!res.ok) throw new Error("Failed to fetch PDF");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export interface Source {
  page: number;
  text: string;
  filename?: string;
}

export interface ChatResponse {
  answer: string;
  sources: Source[];
}

export interface SummaryResponse {
  summary: string;
  sources: Source[];
}

// --- Chat Session types ---

export interface ChatSessionMeta {
  id: string;
  title: string;
  document_id: string;
  pinned: boolean;
  document_filename?: string;
  document_pages?: number;
  extra_documents?: { id: string; filename: string; total_pages: number }[];
  created_at: string;
  updated_at: string;
}

export interface ChatMessageData {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources: Source[];
  created_at: string;
}

// --- Upload ---

export async function uploadPDF(
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ document: DocumentMeta; chat: ChatSessionMeta }> {
  const token = await getAccessToken();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve({ document: data.document, chat: data.chat });
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(extractErrorDetail(err, "Upload failed")));
        } catch {
          reject(new Error("Upload failed"));
        }
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.open("POST", `${API_BASE}/api/upload`);
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    } else {
      xhr.setRequestHeader("X-Anon-Session-Id", getAnonSessionId());
    }
    xhr.send(formData);
  });
}

export async function uploadPDFWithoutChat(
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ document: DocumentMeta }> {
  const token = await getAccessToken();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("create_chat", "false");

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve({ document: data.document });
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(extractErrorDetail(err, "Upload failed")));
        } catch {
          reject(new Error("Upload failed"));
        }
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.open("POST", `${API_BASE}/api/upload`);
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    } else {
      xhr.setRequestHeader("X-Anon-Session-Id", getAnonSessionId());
    }
    xhr.send(formData);
  });
}

export async function attachDocumentToChat(chatId: string, documentId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/chats/${chatId}/documents`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ document_id: documentId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(extractErrorDetail(err, "Failed to attach document"));
  }
}

// --- Chat (RAG) ---

export async function sendMessage(
  question: string,
  documentIds: string[],
  chatHistory: { role: string; content: string }[]
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      question,
      document_ids: documentIds,
      chat_history: chatHistory,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(extractErrorDetail(err, "Failed to get response"));
  }

  return res.json();
}

export async function sendMessageStream(
  question: string,
  documentIds: string[],
  chatHistory: { role: string; content: string }[],
  onToken: (token: string) => void,
  onSources: (sources: Source[]) => void,
  onSuggestions?: (suggestions: string[]) => void,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/chat/stream`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      question,
      document_ids: documentIds,
      chat_history: chatHistory,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(extractErrorDetail(err, "Failed to get response"));
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    let eventType = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        const data = JSON.parse(line.slice(6));
        if (eventType === "token" && data.token) {
          onToken(data.token);
        } else if (eventType === "sources" && data.sources) {
          onSources(data.sources);
        } else if (eventType === "suggestions" && data.suggestions) {
          onSuggestions?.(data.suggestions);
        }
        eventType = "";
      }
    }
  }
}

export async function getSummary(
  documentIds: string[],
  summaryType: string = "global"
): Promise<SummaryResponse> {
  const res = await fetch(`${API_BASE}/api/summary`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      document_ids: documentIds,
      summary_type: summaryType,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(extractErrorDetail(err, "Failed to generate summary"));
  }

  return res.json();
}

// --- Documents ---

export async function getDocuments(): Promise<DocumentMeta[]> {
  const res = await fetch(`${API_BASE}/api/documents`, {
    headers: await authHeaders(false),
  });
  if (!res.ok) throw new Error("Failed to fetch documents");
  const data = await res.json();
  return data.documents;
}

export async function deleteDocument(docId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/documents/${docId}`, {
    method: "DELETE",
    headers: await authHeaders(false),
  });
  if (!res.ok) throw new Error("Failed to delete document");
}

export async function attachPdf(docId: string, file: File): Promise<void> {
  const token = await getAccessToken();
  const formData = new FormData();
  formData.append("file", file);
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api/documents/${docId}/pdf`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(extractErrorDetail(err, "Failed to attach PDF"));
  }
}

// --- Chat Sessions ---

export async function listChats(): Promise<ChatSessionMeta[]> {
  const res = await fetch(`${API_BASE}/api/chats`, {
    headers: await authHeaders(false),
  });
  if (!res.ok) throw new Error("Failed to fetch chats");
  const data = await res.json();
  return data.chats;
}

export async function createChat(documentId: string, title?: string): Promise<ChatSessionMeta> {
  const res = await fetch(`${API_BASE}/api/chats`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ document_id: documentId, title }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(extractErrorDetail(err, "Failed to create chat"));
  }
  return res.json();
}

export async function updateChat(chatId: string, updates: { title?: string; pinned?: boolean }): Promise<ChatSessionMeta> {
  const res = await fetch(`${API_BASE}/api/chats/${chatId}`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(extractErrorDetail(err, "Failed to update chat"));
  }
  return res.json();
}

export async function deleteChat(chatId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/chats/${chatId}`, {
    method: "DELETE",
    headers: await authHeaders(false),
  });
  if (!res.ok) throw new Error("Failed to delete chat");
}

export async function resetChat(chatId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/chats/${chatId}/reset`, {
    method: "POST",
    headers: await authHeaders(false),
  });
  if (!res.ok) throw new Error("Failed to reset chat");
}

export async function exportChat(chatId: string): Promise<{ chat: ChatSessionMeta; document: DocumentMeta; messages: ChatMessageData[] }> {
  const res = await fetch(`${API_BASE}/api/chats/${chatId}/export`, {
    headers: await authHeaders(false),
  });
  if (!res.ok) throw new Error("Failed to export chat");
  return res.json();
}

export async function getChatMessages(chatId: string): Promise<ChatMessageData[]> {
  const res = await fetch(`${API_BASE}/api/chats/${chatId}/messages`, {
    headers: await authHeaders(false),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.messages;
}

export async function saveChatMessage(
  chatId: string,
  role: string,
  content: string,
  sources: Source[] = [],
): Promise<void> {
  await fetch(`${API_BASE}/api/chats/${chatId}/messages`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ role, content, sources }),
  });
}

// --- AI Detector ---

export interface AiDetectResult {
  verdict: "ai" | "human" | "uncertain";
  ai_probability: number;
  human_probability: number;
  explanation: string;
  clues: string[];
}

export async function detectAiContent(text: string): Promise<AiDetectResult> {
  const res = await fetch(`${API_BASE}/api/ai-detect`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(extractErrorDetail(err, "Failed to analyze text"));
  }
  return res.json();
}

// --- Quiz ---

export interface QuizOption {
  A: string;
  B: string;
  C: string;
  D: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: QuizOption;
  correct: "A" | "B" | "C" | "D";
  explanation: string;
}

export interface QuizResult {
  questions: QuizQuestion[];
}

export async function generateQuiz(
  documentIds: string[],
  difficulty: "easy" | "medium" | "hard" = "medium",
  language: string = "fr"
): Promise<QuizResult> {
  const res = await fetch(`${API_BASE}/api/quiz`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ document_ids: documentIds, difficulty, language }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(extractErrorDetail(err, "Failed to generate quiz"));
  }
  return res.json();
}
