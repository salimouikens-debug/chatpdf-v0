"use client";

import { useState } from "react";
import { FileText } from "lucide-react";

interface PdfDoc {
  blobUrl: string;
  filename: string;
}

interface PdfViewerProps {
  documents: PdfDoc[];
}

export function PdfViewer({ documents }: PdfViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (documents.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-muted/30 text-muted-foreground">
        <FileText className="h-10 w-10" />
        <p className="text-sm">No document to display</p>
      </div>
    );
  }

  const safeIndex = Math.min(activeIndex, documents.length - 1);
  const current = documents[safeIndex];

  return (
    <div className="flex h-full flex-col">
      {documents.length > 1 && (
        <div className="flex border-b bg-muted/30 overflow-x-auto">
          {documents.map((doc, i) => (
            <button
              key={doc.filename + i}
              onClick={() => setActiveIndex(i)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${i === safeIndex
                ? "border-primary text-foreground bg-background"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              {doc.filename}
            </button>
          ))}
        </div>
      )}

      {documents.length === 1 && (
        <div className="border-b px-4 py-2 text-xs font-medium text-muted-foreground truncate">
          {current.filename}
        </div>
      )}

      {current.filename.toLowerCase().endsWith(".pdf") ? (
        <iframe
          key={safeIndex}
          src={`${current.blobUrl}#toolbar=0&navpanes=0`}
          className="flex-1 w-full"
          title={current.filename}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-muted/10 p-6 text-center">
          <div className="rounded-full bg-violet-100 p-4">
            <FileText className="h-10 w-10 text-violet-600" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Aperçu non disponible</h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            L'aperçu en direct n'est pris en charge que pour les fichiers PDF. Votre document <strong>{current.filename}</strong> a bien été pris en compte pour le traitement.
          </p>
        </div>
      )}
    </div>
  );
}
