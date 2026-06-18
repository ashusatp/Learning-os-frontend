"use client";

import { useState, useRef } from "react";
import {
  Upload,
  FileText,
  Video,
  Image as ImageIcon,
  File,
  Trash2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  file?: globalThis.File;
}

interface FileManagerProps {
  files?: FileItem[];
  onFilesChange?: (files: FileItem[]) => void;
}

function getFileIcon(type: string) {
  if (type.startsWith("video/")) return <Video className="h-5 w-5 text-purple-500" />;
  if (type.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-blue-500" />;
  if (type.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileManager({ files = [], onFilesChange }: FileManagerProps) {
  const [localFiles, setLocalFiles] = useState<FileItem[]>(files);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (newFiles: globalThis.File[]) => {
    const items: FileItem[] = newFiles.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: f.name,
      size: f.size,
      type: f.type,
      file: f,
    }));
    const updated = [...localFiles, ...items];
    setLocalFiles(updated);
    onFilesChange?.(updated);
  };

  const removeFile = (id: string) => {
    const updated = localFiles.filter((f) => f.id !== id);
    setLocalFiles(updated);
    onFilesChange?.(updated);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) addFiles(droppedFiles);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    if (selected.length > 0) addFiles(selected);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
        }`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">Drop files here or click to upload</p>
          <p className="text-xs text-muted-foreground mt-1">
            Documents, images, videos, and more
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleInputChange}
          className="hidden"
          accept="*/*"
        />
      </div>

      {/* File list */}
      {localFiles.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {localFiles.length} file{localFiles.length !== 1 && "s"}
          </p>
          <div className="space-y-1.5">
            {localFiles.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 rounded-lg border bg-card p-3 group hover:bg-accent/30 transition-colors"
              >
                {getFileIcon(f.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(f.size)}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {f.url && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => window.open(f.url, "_blank")}
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeFile(f.id)}
                    className="text-destructive hover:text-destructive"
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {localFiles.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No files uploaded yet</p>
        </div>
      )}
    </div>
  );
}
