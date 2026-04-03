"use client";

import { useState } from "react";
import { User, Bot, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import type { Source } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [showSources, setShowSources] = useState(false);
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isUser ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={`max-w-[80%] space-y-2 ${isUser ? "text-right" : ""}`}>
        {isUser ? (
          <div className="inline-block rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm leading-relaxed">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        ) : (
          <div className="prose-chatgpt">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-xl font-bold text-foreground mt-4 mb-2 first:mt-0">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-lg font-bold text-foreground mt-4 mb-2 first:mt-0">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base font-semibold text-foreground mt-3 mb-1.5 first:mt-0">{children}</h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-sm font-semibold text-foreground mt-3 mb-1 first:mt-0">{children}</h4>
                ),
                p: ({ children }) => (
                  <p className="text-sm leading-relaxed text-foreground/90 mb-2 last:mb-0">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="text-sm leading-relaxed text-foreground/90 list-disc pl-5 mb-2 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="text-sm leading-relaxed text-foreground/90 list-decimal pl-5 mb-2 space-y-1">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="text-sm leading-relaxed">{children}</li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="italic">{children}</em>
                ),
                code: ({ children, className }) => {
                  const isBlock = className?.includes("language-");
                  if (isBlock) {
                    return (
                      <code className="block bg-zinc-900 text-zinc-100 rounded-lg p-3 text-xs font-mono overflow-x-auto my-2 whitespace-pre">
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className="bg-muted rounded px-1.5 py-0.5 text-xs font-mono text-foreground">
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="my-2">{children}</pre>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-3 border-teal pl-3 my-2 text-sm text-foreground/80 italic">
                    {children}
                  </blockquote>
                ),
                hr: () => <hr className="my-3 border-border" />,
                a: ({ href, children }) => (
                  <a href={href} className="text-teal hover:underline" target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2">
                    <table className="text-sm border-collapse w-full">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-border bg-muted px-3 py-1.5 text-left text-xs font-semibold text-foreground">{children}</th>
                ),
                td: ({ children }) => (
                  <td className="border border-border px-3 py-1.5 text-xs text-foreground/90">{children}</td>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {message.sources && message.sources.length > 0 && (
          <div className="text-left">
            <button
              onClick={() => setShowSources(!showSources)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <BookOpen className="h-3 w-3" />
              {message.sources.length} source
              {message.sources.length > 1 ? "s" : ""}
              {showSources ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>

            {showSources && (
              <div className="mt-2 space-y-2">
                {message.sources.map((source, i) => (
                  <div
                    key={i}
                    className="rounded-lg border bg-card p-3 text-left text-xs"
                  >
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {source.filename && (
                        <Badge variant="outline" className="text-xs">
                          {source.filename}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        Page {source.page}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {source.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
