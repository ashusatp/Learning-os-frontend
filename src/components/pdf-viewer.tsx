"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  ZoomIn,
  ZoomOut,
  FileText,
  PanelRight,
  Maximize,
  Minimize,
  Download,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  src: string;
  fileName?: string;
  onDownload?: () => void;
  onClose?: () => void;
}

export default function PdfViewer({ src, fileName, onDownload, onClose }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfError, setPdfError] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const thumbnailRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const pageInputRef = useRef<HTMLInputElement>(null);

  // Measure main content area width for auto-fit
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width - 48);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [showSidebar]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  };

  const goToPage = useCallback(
    (page: number) => setCurrentPage(Math.max(1, Math.min(numPages, page))),
    [numPages]
  );
  const goToPrev = useCallback(() => setCurrentPage((p) => Math.max(1, p - 1)), []);
  const goToNext = useCallback(
    () => setCurrentPage((p) => Math.min(numPages, p + 1)),
    [numPages]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "Escape" && isFullscreen) toggleFullscreen();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrev, goToNext, isFullscreen]);

  // Scroll active thumbnail into view
  useEffect(() => {
    const el = thumbnailRefs.current.get(currentPage);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [currentPage]);

  // Fullscreen API
  const toggleFullscreen = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Page input handler
  const handlePageInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const val = parseInt(e.currentTarget.value);
      if (!isNaN(val)) goToPage(val);
      e.currentTarget.blur();
    }
  };

  if (pdfError) {
    return (
      <div className="flex flex-col items-center gap-3 text-muted-foreground p-8">
        <FileText className="h-12 w-12" />
        <p className="text-sm">Could not render PDF</p>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative w-full h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="shrink-0 z-10 flex items-center gap-1 px-2 py-1.5 bg-background border-b overflow-x-auto">
        {/* Page nav */}
        <Button variant="ghost" size="icon-sm" onClick={goToPrev} disabled={currentPage <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1 text-sm">
          <input
            ref={pageInputRef}
            type="text"
            defaultValue={currentPage}
            key={currentPage}
            onKeyDown={handlePageInput}
            className="w-10 text-center bg-muted/50 rounded px-1 py-0.5 text-sm border border-transparent focus:border-primary focus:outline-none"
          />
          <span className="text-muted-foreground whitespace-nowrap">/ {numPages || "…"}</span>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={goToNext} disabled={currentPage >= numPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>

        <div className="w-px h-5 bg-border mx-1 shrink-0" />

        {/* Zoom */}
        <Button variant="ghost" size="icon-sm" onClick={() => setScale((s) => Math.max(0.25, s - 0.05))}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs w-10 text-center tabular-nums shrink-0">{Math.round(scale * 100)}%</span>
        <Button variant="ghost" size="icon-sm" onClick={() => setScale((s) => Math.min(4, s + 0.05))}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="text-xs px-2 h-7 shrink-0" onClick={() => setScale(1.0)}>
          Fit
        </Button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        {onDownload && (
          <Button variant="ghost" size="icon-sm" onClick={onDownload} title="Download" className="shrink-0">
            <Download className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setShowSidebar((s) => !s)}
          title="Toggle page thumbnails"
          data-active={showSidebar}
          className="data-[active=true]:bg-muted shrink-0"
        >
          <PanelRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={toggleFullscreen} title="Fullscreen" className="shrink-0">
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
        {onClose && (
          <>
            <div className="w-px h-5 bg-border mx-1 shrink-0" />
            <Button variant="ghost" size="icon-sm" onClick={onClose} title="Close" className="shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Body: main page + sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main page area */}
        <div ref={containerRef} className="flex-1 overflow-auto flex justify-center p-6 bg-muted/30">
          <Document
            file={src}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={() => setPdfError(true)}
            loading={
              <div className="flex items-center gap-2 text-muted-foreground pt-20">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-sm">Loading PDF…</span>
              </div>
            }
          >
            <Page
              pageNumber={currentPage}
              width={containerWidth ? containerWidth * scale : undefined}
              className="shadow-xl rounded-sm"
              loading={
                <div className="flex items-center justify-center h-[70vh]">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              }
            />
          </Document>
        </div>

        {/* Thumbnails sidebar */}
        {showSidebar && numPages > 0 && (
          <div className="w-[180px] shrink-0 border-l bg-background overflow-y-auto p-3 flex flex-col gap-2">
            <Document file={src}>
              {Array.from({ length: numPages }, (_, i) => {
                const pageNum = i + 1;
                const isActive = pageNum === currentPage;
                return (
                  <button
                    key={pageNum}
                    ref={(el) => {
                      if (el) thumbnailRefs.current.set(pageNum, el);
                    }}
                    onClick={() => goToPage(pageNum)}
                    className={`relative w-full rounded-md overflow-hidden border-2 transition-colors cursor-pointer mb-2 ${
                      isActive
                        ? "border-primary ring-1 ring-primary/30"
                        : "border-transparent hover:border-muted-foreground/30"
                    }`}
                  >
                    <Page
                      pageNumber={pageNum}
                      width={148}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      loading={
                        <div className="flex items-center justify-center h-[180px] bg-muted/20">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      }
                    />
                    <span
                      className={`absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-black/50 text-white"
                      }`}
                    >
                      {pageNum}
                    </span>
                  </button>
                );
              })}
            </Document>
          </div>
        )}
      </div>
    </div>
  );
}
