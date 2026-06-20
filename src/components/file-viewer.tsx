"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Download,
  Loader2,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import api from "@/lib/api";

const PdfViewer = dynamic(() => import("@/components/pdf-viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center gap-2 text-muted-foreground p-8">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">Loading PDF viewer...</span>
    </div>
  ),
});

type MediaType = "image" | "video" | "audio" | "pdf" | "unknown";

function getMediaType(contentType: string): MediaType {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType.includes("pdf")) return "pdf";
  return "unknown";
}

interface FileViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  downloadPath: string;
  fileName: string;
  contentType: string;
}

export function FileViewer({
  open,
  onOpenChange,
  downloadPath,
  fileName,
  contentType,
}: FileViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaType = getMediaType(contentType);

  useEffect(() => {
    if (!open || !downloadPath) return;

    let revoked = false;
    setLoading(true);
    setError(null);

    api
      .get(downloadPath, { responseType: "blob" })
      .then((res) => {
        if (!revoked) {
          const url = URL.createObjectURL(res.data);
          setBlobUrl(url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!revoked) {
          setError("Failed to load file");
          setLoading(false);
        }
      });

    return () => {
      revoked = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, downloadPath]);

  const handleDownload = useCallback(async () => {
    try {
      const res = await api.get(downloadPath, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }, [downloadPath, fileName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="!max-w-[95vw] w-[95vw] h-[90vh] p-0 flex flex-col overflow-hidden gap-0 rounded-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-card shrink-0">
          <h3 className="text-sm font-medium truncate max-w-[60%]">
            {fileName}
          </h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="xs" onClick={handleDownload} className="gap-1 text-xs">
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-black/5 dark:bg-black/20">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-2 text-destructive">
              <FileText className="h-8 w-8" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {!loading && !error && blobUrl && (
            <>
              {mediaType === "image" && <ImageViewer src={blobUrl} alt={fileName} />}
              {mediaType === "video" && <VideoPlayer src={blobUrl} type={contentType} />}
              {mediaType === "audio" && <AudioPlayer src={blobUrl} type={contentType} fileName={fileName} />}
              {mediaType === "pdf" && <PdfViewer src={blobUrl} />}
              {mediaType === "unknown" && (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <FileText className="h-12 w-12" />
                  <p className="text-sm">Preview not available for this file type</p>
                  <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
                    <Download className="h-4 w-4" />
                    Download File
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Image Viewer ── */

function ImageViewer({ src, alt }: { src: string; alt: string }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-auto">
      {/* Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-background/80 backdrop-blur rounded-lg border px-1 py-0.5">
        <Button variant="ghost" size="icon-sm" onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}>
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="icon-sm" onClick={() => setZoom((z) => Math.min(5, z + 0.25))}>
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <Button variant="ghost" size="icon-sm" onClick={() => setRotation((r) => (r + 90) % 360)}>
          <RotateCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-w-none transition-transform duration-200"
        style={{
          transform: `scale(${zoom}) rotate(${rotation}deg)`,
        }}
        draggable={false}
      />
    </div>
  );
}

/* ── Video Player ── */

function VideoPlayer({ src, type }: { src: string; type: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <video
        src={src}
        controls
        className="max-w-full max-h-full rounded-lg shadow-lg"
        controlsList="nodownload"
      >
        <source src={src} type={type} />
        Your browser does not support video playback.
      </video>
    </div>
  );
}

/* ── Audio Player ── */

function AudioPlayer({
  src,
  type,
  fileName,
}: {
  src: string;
  type: string;
  fileName: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
        <svg
          className="h-12 w-12 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
      </div>
      <p className="text-sm font-medium text-center max-w-xs truncate">{fileName}</p>
      <audio src={src} controls className="w-full max-w-md">
        <source src={src} type={type} />
        Your browser does not support audio playback.
      </audio>
    </div>
  );
}

