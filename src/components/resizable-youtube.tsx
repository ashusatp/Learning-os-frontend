"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Trash2 } from "lucide-react";

const SIZE_PRESETS = [
  { label: "S", pct: 40 },
  { label: "M", pct: 60 },
  { label: "L", pct: 80 },
  { label: "Full", pct: 100 },
];

const YT_REGEX = /^((?:https?:)?\/\/)?((?:www|m|music)\.)?((?:youtube\.com|youtu\.be|youtube-nocookie\.com))(\/(?:[\w-]+\?v=|embed\/|v\/)?)([\w-]+)(\S+)?$/;

function toEmbedUrl(url: string): string {
  if (!url) return "";
  if (url.includes("/embed/")) return url;
  const match = url.match(YT_REGEX);
  if (!match || !match[5]) return url;
  return `https://www.youtube-nocookie.com/embed/${match[5]}`;
}

export function ResizableYoutubeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
  getPos,
}: NodeViewProps) {
  const { src } = node.attrs;
  const containerRef = useRef<HTMLDivElement>(null);

  const activePct: number = node.attrs["data-pct"] || 60;

  const [toolbarBelow, setToolbarBelow] = useState(false);

  // Toolbar position
  useEffect(() => {
    if (!selected || !containerRef.current) return;
    const el = containerRef.current;
    const rect = el.getBoundingClientRect();
    const scrollParent =
      el.closest(".overflow-y-auto") || el.closest(".ProseMirror")?.parentElement;
    const parentTop = scrollParent?.getBoundingClientRect().top ?? 0;
    setToolbarBelow(rect.top - parentTop < 48);
  }, [selected]);

  const handleSelect = useCallback(() => {
    if (!editor || typeof getPos !== "function") return;
    const pos = getPos();
    if (pos == null) return;
    editor.commands.setNodeSelection(pos);
  }, [editor, getPos]);

  const iframeSrc = toEmbedUrl(src || "");

  return (
    <NodeViewWrapper className="my-3" data-drag-handle>
      <div
        ref={containerRef}
        className="relative group mx-auto"
        style={{ width: `${activePct}%` }}
      >
        {/* Click-to-select overlay (iframe swallows clicks) */}
        {!selected && (
          <div
            className="absolute inset-0 z-10 cursor-pointer"
            onClick={handleSelect}
          />
        )}

        <div
          className={`relative rounded-lg overflow-hidden bg-black ${
            selected
              ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
              : ""
          }`}
          style={{ aspectRatio: "16 / 9" }}
        >
          <iframe
            src={iframeSrc}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>

        {/* Toolbar */}
        {selected && (
          <div
            className={`absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-popover border rounded-lg shadow-lg px-1.5 py-1 z-20 whitespace-nowrap ${
              toolbarBelow ? "top-full mt-2" : "bottom-full mb-2"
            }`}
            contentEditable={false}
          >
            {SIZE_PRESETS.map((p) => (
              <button
                key={p.pct}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => updateAttributes({ "data-pct": p.pct })}
                className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                  activePct === p.pct
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {p.label}
              </button>
            ))}
            <div className="w-px h-4 bg-border mx-0.5" />
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={deleteNode}
              className="p-1 rounded text-destructive hover:bg-destructive/10 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
