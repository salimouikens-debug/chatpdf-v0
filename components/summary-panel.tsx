"use client";

import { useState } from "react";
import { Sparkles, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getSummary, type Source } from "@/lib/api";

interface SummaryPanelProps {
  documentIds: string[];
}

const SUMMARY_TYPES = [
  { value: "global", label: "Full Summary" },
  { value: "key_points", label: "Key Points" },
  { value: "brief", label: "Brief Overview" },
];

export function SummaryPanel({ documentIds }: SummaryPanelProps) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [activeType, setActiveType] = useState("global");
  const [open, setOpen] = useState(false);

  const multiDoc = documentIds.length > 1;

  const handleGenerate = async (type: string) => {
    if (documentIds.length === 0 || loading) return;
    setActiveType(type);
    setLoading(true);
    setSummary(null);

    try {
      const result = await getSummary(documentIds, type);
      setSummary(result.summary);
      setSources(result.sources);
    } catch (err) {
      setSummary(
        err instanceof Error ? `Error: ${err.message}` : "Failed to generate summary"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={documentIds.length === 0}>
          <Sparkles className="mr-2 h-4 w-4" />
          Summarize
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {multiDoc ? "Cross-Document Summary" : "Document Summary"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          {SUMMARY_TYPES.map((type) => (
            <Button
              key={type.value}
              variant={activeType === type.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleGenerate(type.value)}
              disabled={loading}
            >
              {type.label}
            </Button>
          ))}
        </div>

        <ScrollArea className="max-h-[50vh] mt-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {multiDoc ? "Generating cross-document summary..." : "Generating summary..."}
              </p>
            </div>
          ) : summary ? (
            <div className="space-y-4">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {summary}
                </p>
              </div>

              {sources.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    Sources
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {sources.map((s, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {s.filename ? `${s.filename} — ` : ""}Page {s.page}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
              <Sparkles className="h-8 w-8" />
              <p className="text-sm">
                Choose a summary type above to generate
              </p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
