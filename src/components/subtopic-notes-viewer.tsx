"use client";

import { FileText, Pencil, PenTool, FolderOpen, Download, File, Video, Image as ImageIcon } from "lucide-react";

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
}

interface SubtopicNotesViewerProps {
  notesHtml?: string;
  sketchDataUrl?: string;
  whiteboardDataUrl?: string;
  files?: FileItem[];
  onEdit?: () => void;
}

function getFileIcon(type: string) {
  if (type.startsWith("video/")) return <Video className="h-4 w-4 text-purple-500" />;
  if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4 text-blue-500" />;
  if (type.includes("pdf")) return <FileText className="h-4 w-4 text-red-500" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex items-center justify-center h-6 w-6 rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
        {title}
      </h3>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-8 rounded-lg border border-dashed border-muted-foreground/20 bg-muted/20">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/**
 * Process editor HTML to add inline styles for images based on data-width / data-align
 * attributes. The editor stores these as data attributes but the viewer needs actual
 * CSS to render them at the correct size and position.
 */
function styleEditorHtml(html: string): string {
  // Style images based on data-width
  let result = html.replace(/<img\b([^>]*?)>/gi, (match, attrs: string) => {
    const widthMatch = attrs.match(/data-width="(\d+)"/);
    const width = widthMatch ? widthMatch[1] : "100";
    const style = `display:inline-block;width:${width}%;vertical-align:top;margin:4px;border-radius:0.5rem;`;
    if (attrs.includes('style="')) return match;
    return `<img${attrs} style="${style}">`;
  });

  // Style YouTube embeds based on data-pct (attribute lives on the iframe)
  result = result.replace(/<div[^>]*data-youtube-video[^>]*>([\s\S]*?)<\/div>/gi, (match, inner: string) => {
    const pctMatch = inner.match(/data-pct="(\d+)"/);
    const pct = pctMatch ? pctMatch[1] : "60";
    // Extract iframe tag and re-wrap with responsive container
    const iframeMatch = inner.match(/<iframe\b[^>]*>/i);
    if (!iframeMatch) return match;
    return `<div style="width:${pct}%;margin:0.75rem auto;"><div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:0.5rem;">${iframeMatch[0].replace(/>$/, ` style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;border-radius:0.5rem;"></iframe>`)}</div></div>`;
  });

  return result;
}

export function SubtopicNotesViewer({
  notesHtml,
  sketchDataUrl,
  whiteboardDataUrl,
  files = [],
}: SubtopicNotesViewerProps) {
  const hasNotes = notesHtml && notesHtml !== "<p></p>" && notesHtml.trim().length > 0;
  const hasSketch = !!sketchDataUrl;
  const hasWhiteboard = !!whiteboardDataUrl;
  const hasFiles = files.length > 0;
  const hasAnyContent = hasNotes || hasSketch || hasWhiteboard || hasFiles;

  if (!hasAnyContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <FileText className="h-7 w-7 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-foreground">No notes yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Switch to edit mode to start adding notes, sketches, or files.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto space-y-6 pr-1">
      {/* Text Notes - Primary, shown first */}
      {hasNotes && (
        <section>
          <SectionHeader icon={<FileText className="h-3.5 w-3.5" />} title="Notes" />
          <div
            className="tiptap max-w-none px-4 py-3 rounded-lg border bg-card text-sm"
            dangerouslySetInnerHTML={{ __html: styleEditorHtml(notesHtml!) }}
          />
        </section>
      )}

      {/* Sketch Board */}
      {hasSketch && (
        <section>
          <SectionHeader icon={<Pencil className="h-3.5 w-3.5" />} title="Sketch" />
          <div className="rounded-lg border bg-card overflow-hidden">
            <img
              src={sketchDataUrl}
              alt="Sketch notes"
              className="w-full h-auto object-contain max-h-[500px] bg-white dark:bg-zinc-900"
            />
          </div>
        </section>
      )}

      {/* Whiteboard */}
      {hasWhiteboard && (
        <section>
          <SectionHeader icon={<PenTool className="h-3.5 w-3.5" />} title="Whiteboard" />
          <div className="rounded-lg border bg-card overflow-hidden">
            <img
              src={whiteboardDataUrl}
              alt="Whiteboard"
              className="w-full h-auto object-contain max-h-[500px] bg-white dark:bg-zinc-900"
            />
          </div>
        </section>
      )}

      {/* Files */}
      {hasFiles && (
        <section>
          <SectionHeader icon={<FolderOpen className="h-3.5 w-3.5" />} title={`Files (${files.length})`} />
          <div className="space-y-1.5">
            {files.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 group hover:bg-accent/30 transition-colors"
              >
                {getFileIcon(f.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(f.size)}</p>
                </div>
                {f.url && (
                  <button
                    onClick={() => window.open(f.url, "_blank")}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors opacity-0 group-hover:opacity-100"
                    title="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
