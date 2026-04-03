"use client";

import { FileText, Trash2, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DocumentMeta } from "@/lib/api";

interface DocumentListProps {
  documents: DocumentMeta[];
  activeDocId: string | null;
  onSelect: (doc: DocumentMeta) => void;
  onDelete: (docId: string) => void;
}

export function DocumentList({
  documents,
  activeDocId,
  onSelect,
  onDelete,
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
        <File className="h-8 w-8" />
        <p className="text-sm">No documents yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1 p-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className={`group flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors ${
              activeDocId === doc.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
            onClick={() => onSelect(doc)}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{doc.filename}</p>
              <p
                className={`text-xs ${
                  activeDocId === doc.id
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                }`}
              >
                {doc.total_pages} pages
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 ${
                activeDocId === doc.id
                  ? "hover:bg-primary-foreground/20 text-primary-foreground"
                  : "hover:bg-destructive/10 hover:text-destructive"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(doc.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
