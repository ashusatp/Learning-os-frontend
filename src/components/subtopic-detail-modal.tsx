"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  PenTool,
  Pencil,
  FolderOpen,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  Maximize2,
  Minimize2,
  X,
  PencilLine,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Whiteboard } from "@/components/whiteboard";
import { SketchBoard } from "@/components/sketchboard";
import { FileManager } from "@/components/file-manager";
import { SubtopicNotesViewer } from "@/components/subtopic-notes-viewer";
import { SubTopic, MasteryLevel } from "@/types";

type Mode = "view" | "edit";
type Tab = "notes" | "sketchboard" | "whiteboard" | "files";

const tabsDef: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "notes", label: "Notes", icon: <FileText className="h-4 w-4" /> },
  { id: "sketchboard", label: "Sketch", icon: <Pencil className="h-4 w-4" /> },
  { id: "whiteboard", label: "Whiteboard", icon: <PenTool className="h-4 w-4" /> },
  { id: "files", label: "Files", icon: <FolderOpen className="h-4 w-4" /> },
];

const masteryConfig: Record<MasteryLevel, { label: string; className: string }> = {
  NOT_STARTED: { label: "Not Started", className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300" },
  BEGINNER: { label: "Beginner", className: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300" },
  INTERMEDIATE: { label: "Intermediate", className: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" },
  ADVANCED: { label: "Advanced", className: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300" },
  MASTERED: { label: "Mastered", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" },
};

interface SubtopicDetailModalProps {
  subtopic: SubTopic;
  topicName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubtopicDetailModal({
  subtopic,
  topicName,
  open,
  onOpenChange,
}: SubtopicDetailModalProps) {
  const [mode, setMode] = useState<Mode>("view");
  const [activeTab, setActiveTab] = useState<Tab>("notes");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [visible, setVisible] = useState(false);

  // Local state for notes content (will connect to API later)
  const [notesHtml, setNotesHtml] = useState("");
  const [sketchDataUrl, setSketchDataUrl] = useState<string | undefined>();
  const [whiteboardDataUrl, setWhiteboardDataUrl] = useState<string | undefined>();

  const mastery = masteryConfig[subtopic.mastery_level];
  const accuracy =
    subtopic.questions_solved > 0
      ? Math.round((subtopic.questions_correct / subtopic.questions_solved) * 100)
      : 0;
  const confidencePercent = Math.round(subtopic.confidence_level * 100);

  // Animate in
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => onOpenChange(false), 150);
  }, [onOpenChange]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, handleClose]);

  if (!open) return null;

  /** Which single section to show in view mode */
  const viewContent = () => {
    switch (activeTab) {
      case "notes":
        return (
          <SubtopicNotesViewer
            notesHtml={notesHtml}
            sketchDataUrl={undefined}
            whiteboardDataUrl={undefined}
          />
        );
      case "sketchboard":
        return sketchDataUrl ? (
          <div className="flex items-center justify-center h-full">
            <img
              src={sketchDataUrl}
              alt="Sketch"
              className="max-w-full max-h-full object-contain rounded-lg border bg-white dark:bg-zinc-900"
            />
          </div>
        ) : (
          <EmptyState message="No sketch yet. Switch to edit mode to start drawing." />
        );
      case "whiteboard":
        return whiteboardDataUrl ? (
          <div className="flex items-center justify-center h-full">
            <img
              src={whiteboardDataUrl}
              alt="Whiteboard"
              className="max-w-full max-h-full object-contain rounded-lg border bg-white dark:bg-zinc-900"
            />
          </div>
        ) : (
          <EmptyState message="No whiteboard yet. Switch to edit mode to start drawing." />
        );
      case "files":
        return <EmptyState message="No files yet. Switch to edit mode to upload files." />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-150 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={`relative z-10 flex flex-col bg-popover text-popover-foreground ring-1 ring-foreground/10 outline-none transition-all duration-150 select-none ${
          visible ? "opacity-100 scale-100" : "opacity-0 scale-100"
        } ${
          isFullscreen
            ? "w-screen h-screen max-w-none max-h-none rounded-none"
            : "w-[95vw] max-w-5xl h-[90vh] max-h-[90vh] rounded-xl"
        }`}
      >
        {/* ─── Top Bar ─── */}
        <div className="flex items-center gap-3 px-5 py-3 border-b shrink-0">
          {/* Left: breadcrumb path */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {topicName && (
              <>
                <span className="text-sm text-muted-foreground truncate max-w-[150px]">
                  {topicName}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
              </>
            )}
            <h2 className="text-sm font-semibold truncate">{subtopic.name}</h2>
            <Badge variant="outline" className={`ml-2 shrink-0 text-[10px] px-1.5 py-0 ${mastery.className}`}>
              {mastery.label}
            </Badge>
          </div>

          {/* Right: dropdown + edit + fullscreen + close */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Content type dropdown */}
            <Select value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tabsDef.map((tab) => (
                  <SelectItem key={tab.id} value={tab.id}>
                    <div className="flex items-center gap-2">
                      {tab.icon}
                      {tab.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Edit / View toggle */}
            <Button
              variant={mode === "edit" ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setMode(mode === "view" ? "edit" : "view")}
            >
              <PencilLine className="h-3.5 w-3.5" />
              {mode === "edit" ? "Viewing" : "Edit"}
            </Button>

            {/* Fullscreen */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsFullscreen((f) => !f)}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </Button>

            {/* Close */}
            <Button variant="ghost" size="icon-sm" onClick={handleClose}>
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>

        {/* ─── Stats Bar (collapsed, not in fullscreen) ─── */}
        {!isFullscreen && (
          <div className="flex items-center gap-5 px-5 py-2 border-b text-xs flex-wrap shrink-0 bg-muted/30">
            <div className="flex items-center gap-1.5">
              <RotateCcw className="h-3 w-3 text-primary" />
              <span className="text-muted-foreground">Revisions:</span>
              <span className="font-medium">{subtopic.revision_count}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
              <span className="text-muted-foreground">Accuracy:</span>
              <span className="font-medium">
                {subtopic.questions_solved > 0 ? `${accuracy}%` : "--"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle className="h-3 w-3 text-red-500" />
              <span className="text-muted-foreground">Mistakes:</span>
              <span className="font-medium">{subtopic.mistake_count}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Solved:</span>
              <span className="font-medium">
                {subtopic.questions_correct}/{subtopic.questions_solved}
              </span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-muted-foreground">Confidence</span>
              <Progress value={confidencePercent} className="h-1.5 w-20" />
              <span className="font-medium">{confidencePercent}%</span>
            </div>
          </div>
        )}

        {/* ─── Content ─── */}
        <div className="flex-1 min-h-0 px-5 py-4 overflow-hidden">
          {mode === "view" && (
            <div className="h-full">{viewContent()}</div>
          )}

          {/* Keep editor mounted (hidden when not active) to prevent content loss */}
          <div className={mode === "edit" && activeTab === "notes" ? "h-full" : "hidden"}>
            <RichTextEditor
              content={notesHtml}
              onChange={setNotesHtml}
              placeholder="Write your study notes here..."
            />
          </div>

          {mode === "edit" && activeTab === "sketchboard" && (
            <div className="h-full">
              <SketchBoard />
            </div>
          )}
          {mode === "edit" && activeTab === "whiteboard" && (
            <div className="h-full">
              <Whiteboard />
            </div>
          )}
          {mode === "edit" && activeTab === "files" && (
            <div className="h-full">
              <FileManager />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-16">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <FileText className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
    </div>
  );
}
