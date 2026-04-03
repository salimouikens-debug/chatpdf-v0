"use client";

import { useCallback, useState } from "react";
import { Upload, FileText, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadPDF, type DocumentMeta } from "@/lib/api";

interface PdfUploadProps {
  onUploadComplete: (doc: DocumentMeta, file: File) => void;
}

const MAX_SIZE_MB = 50;

export function PdfUpload({ onUploadComplete }: PdfUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState("");

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      const allowed = [".pdf", ".docx", ".doc", ".pptx", ".txt"];
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if (!allowed.includes(ext)) {
        setError("Only Document files (PDF, DOCX, PPTX, TXT) are accepted.");
        return;
      }

      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`File too large. Maximum size is ${MAX_SIZE_MB}MB.`);
        return;
      }

      setUploading(true);
      setProgress(0);
      setProcessingStage("Uploading...");

      try {
        const { document: doc } = await uploadPDF(file, (pct) => {
          setProgress(pct);
          if (pct >= 100) {
            setProcessingStage("Processing and indexing document...");
          }
        });
        onUploadComplete(doc, file);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
        setProgress(0);
        setProcessingStage("");
      }
    },
    [onUploadComplete]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  return (
    <div
      className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
    >
      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium">{processingStage}</p>
          <div className="h-2 w-48 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{progress}%</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-full bg-primary/10 p-4">
            {isDragging ? (
              <FileText className="h-8 w-8 text-primary" />
            ) : (
              <Upload className="h-8 w-8 text-primary" />
            )}
          </div>
          <div>
            <p className="font-medium">
              {isDragging ? "Drop your document here" : "Drag & drop a document"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              or click to browse (max {MAX_SIZE_MB}MB)
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <label className="cursor-pointer">
              Choose File
              <input
                type="file"
                accept=".pdf,.docx,.doc,.pptx,.txt"
                className="hidden"
                onChange={onFileSelect}
              />
            </label>
          </Button>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
}
