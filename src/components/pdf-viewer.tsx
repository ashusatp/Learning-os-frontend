"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  ZoomIn,
  ZoomOut,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PdfViewer({ src }: { src: string }) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfError, setPdfError] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width - 48); // 24px padding each side
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  };

  const goToPrev = useCallback(() => setCurrentPage((p) => Math.max(1, p - 1)), []);
  const goToNext = useCallback(() => setCurrentPage((p) => Math.min(numPages, p + 1)), [numPages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "ArrowRight") goToNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrev, goToNext]);

  if (pdfError) {
    return (
      <div className="flex flex-col items-center gap-3 text-muted-foreground p-8">
        <FileText className="h-12 w-12" />
        <p className="text-sm">Could not render PDF</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* PDF Controls */}
      <div className="sticky top-0 z-10 flex items-center justify-center gap-3 py-2 bg-background/90 backdrop-blur border-b">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={goToPrev}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm min-w-[100px] text-center font-medium">
          {currentPage} / {numPages || "…"}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={goToNext}
          disabled={currentPage >= numPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button variant="ghost" size="icon-sm" onClick={() => setScale((s) => Math.max(0.5, s - 0.15))}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm w-14 text-center">{Math.round(scale * 100)}%</span>
        <Button variant="ghost" size="icon-sm" onClick={() => setScale((s) => Math.min(3, s + 0.15))}>
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      {/* PDF Page */}
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
            scale={scale}
            width={containerWidth && scale === 1.0 ? containerWidth : undefined}
            className="shadow-xl rounded-sm"
            loading={
              <div className="flex items-center justify-center h-[80vh]">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            }
          />
        </Document>
      </div>
    </div>
  );
}
