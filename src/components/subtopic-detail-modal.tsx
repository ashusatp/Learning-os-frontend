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
  Eye,
  PencilLine,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
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
  { id: "sketchboard", label: "SketchBoard", icon: <Pencil className="h-4 w-4" /> },
  { id: "whiteboard", label: "Whiteboard", icon: <PenTool className="h-4 w-4" /> },
  { id: "files", label: "Files", icon: <FolderOpen className="h-4 w-4" /> },
];

const masteryConfig: Record<MasteryLevel, { label: string; className: string }> = {
  NOT_STARTED: { label: "Not Started", className: "bg-muted text-muted-foreground" },
  BEGINNER: { label: "Beginner", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" },
  INTERMEDIATE: { label: "Intermediate", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400" },
  ADVANCED: { label: "Advanced", className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" },
  MASTERED: { label: "Mastered", className: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" },
};

interface SubtopicDetailModalProps {
  subtopic: SubTopic;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubtopicDetailModal({
  subtopic,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-150 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Panel — NO css transforms, just flex centering */}
      <div
        className={`relative z-10 flex flex-col bg-popover text-popover-foreground ring-1 ring-foreground/10 outline-none transition-all duration-150 select-none ${
          visible ? "opacity-100 scale-100" : "opacity-0 scale-100"
        } ${
          isFullscreen
            ? "w-screen h-screen max-w-none max-h-none rounded-none"
            : "w-[95vw] max-w-5xl h-[90vh] max-h-[90vh] rounded-xl"
        }`}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute top-3 right-3 z-20"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>

        {/* Header - hidden in fullscreen */}
        {!isFullscreen && (
          <div className="px-6 pt-5 pb-4 border-b shrink-0">
            <div className="flex items-start justify-between gap-4 pr-8">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold">{subtopic.name}</h2>
                {subtopic.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {subtopic.description}
                  </p>
                )}
              </div>
              <Badge variant="outline" className={mastery.className}>
                {mastery.label}
              </Badge>
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-6 mt-3 text-sm flex-wrap">
              <div className="flex items-center gap-1.5">
                <RotateCcw className="h-3.5 w-3.5 text-primary" />
                <span className="text-muted-foreground">Revisions:</span>
                <span className="font-medium">{subtopic.revision_count}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                <span className="text-muted-foreground">Accuracy:</span>
                <span className="font-medium">
                  {subtopic.questions_solved > 0 ? `${accuracy}%` : "--"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5 text-red-500" />
                <span className="text-muted-foreground">Mistakes:</span>
                <span className="font-medium">{subtopic.mistake_count}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Solved:</span>
                <span className="font-medium">
                  {subtopic.questions_correct}/{subtopic.questions_solved}
                </span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-muted-foreground">Confidence</span>
                <Progress value={confidencePercent} className="h-2 w-24" />
                <span className="text-xs font-medium">{confidencePercent}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Mode toggle + Tabs */}
        <div className="flex items-center gap-1 px-6 pt-2 pb-0 shrink-0">
          {/* View / Edit toggle */}
          <div className="flex items-center bg-muted rounded-lg p-0.5 mr-3">
            <button
              onClick={() => setMode("view")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                mode === "view"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </button>
            <button
              onClick={() => setMode("edit")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                mode === "edit"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <PencilLine className="h-3.5 w-3.5" />
              Edit
            </button>
          </div>

          {/* Editor tabs — only in edit mode */}
          {mode === "edit" && (
            <>
              {tabsDef.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </>
          )}

          {/* Fullscreen toggle */}
          {(mode === "view" || activeTab === "notes" || activeTab === "sketchboard" || activeTab === "whiteboard") && (
            <button
              onClick={() => setIsFullscreen((f) => !f)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
              {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 px-6 py-4 overflow-hidden">
          {mode === "view" ? (
            <div className="h-full">
              <SubtopicNotesViewer
                notesHtml={notesHtml}
                sketchDataUrl={sketchDataUrl}
                whiteboardDataUrl={whiteboardDataUrl}
              />
            </div>
          ) : (
            <>
              {activeTab === "notes" && (
                <div className="h-full">
                  <RichTextEditor
                    content={notesHtml}
                    onChange={setNotesHtml}
                    placeholder="Write your study notes here..."
                  />
                </div>
              )}
              {activeTab === "sketchboard" && (
                <div className="h-full">
                  <SketchBoard />
                </div>
              )}
              {activeTab === "whiteboard" && (
                <div className="h-full">
                  <Whiteboard />
                </div>
              )}
              {activeTab === "files" && (
                <div className="h-full">
                  <FileManager />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
