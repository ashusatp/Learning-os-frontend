"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Crop,
  Check,
  X,
} from "lucide-react";

type ImageAlign = "left" | "center" | "right";

const SIZE_PRESETS = [
  { label: "S", pct: 25 },
  { label: "M", pct: 50 },
  { label: "L", pct: 75 },
  { label: "Full", pct: 100 },
];

const MIN_WIDTH_PX = 60;

/**
 * Reads the editor DOM element's width. Used to convert percentage-based
 * image sizes into absolute pixels (required because the image node is
 * inline and percentage widths can't resolve against an inline parent).
 */
function readEditorPx(editor: NodeViewProps["editor"]): number {
  return editor?.view?.dom?.clientWidth || 700;
}

export function ResizableImageView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
  getPos,
}: NodeViewProps) {
  const { src, alt, width, align } = node.attrs;
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [isResizing, setIsResizing] = useState(false);
  const [liveWidth, setLiveWidth] = useState<number | null>(null);
  const liveWidthRef = useRef<number | null>(null);

  // Crop state
  const [isCropping, setIsCropping] = useState(false);
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, w: 100, h: 100 });
  const cropDragRef = useRef<{
    startX: number;
    startY: number;
    startRect: typeof cropRect;
    handle: string;
  } | null>(null);
  const cropRectRef = useRef(cropRect);
  cropRectRef.current = cropRect;

  const currentAlign: ImageAlign = align || "center";
  const activePct: number = width || 25;

  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarBelow, setToolbarBelow] = useState(false);

  // Editor pixel width — initialised synchronously so the very first
  // render already has a real value (never 0).
  const [editorPx, setEditorPx] = useState(() => readEditorPx(editor));

  useEffect(() => {
    liveWidthRef.current = liveWidth;
  }, [liveWidth]);

  // Keep editorPx in sync when the editor resizes
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    setEditorPx(dom.clientWidth); // sync immediately
    const ro = new ResizeObserver(() => setEditorPx(dom.clientWidth));
    ro.observe(dom);
    return () => ro.disconnect();
  }, [editor]);

  const getParentWidth = useCallback(() => editorPx || 700, [editorPx]);

  // Compute the actual pixel width to render
  const computedWidthPx =
    liveWidth != null ? liveWidth : Math.round((activePct / 100) * (editorPx || 700));

  // Dynamically position toolbar above or below based on available space
  useEffect(() => {
    if (!selected || isCropping || isResizing || !containerRef.current) return;
    const el = containerRef.current;
    const rect = el.getBoundingClientRect();
    const scrollParent =
      el.closest(".overflow-y-auto") || el.closest(".ProseMirror")?.parentElement;
    const parentTop = scrollParent?.getBoundingClientRect().top ?? 0;
    const spaceAbove = rect.top - parentTop;
    setToolbarBelow(spaceAbove < 48);
  }, [selected, isCropping, isResizing]);

  // ── Click to select ──
  const handleSelect = useCallback(() => {
    if (!editor || typeof getPos !== "function") return;
    const pos = getPos();
    if (pos == null) return;
    editor.commands.setNodeSelection(pos);
  }, [editor, getPos]);

  // ── Corner / edge resize ──
  const handleResizeStart = useCallback(
    (e: React.PointerEvent, corner: string) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const parentW = getParentWidth();
      const startWidthPx = (activePct / 100) * parentW;
      const xSign = corner.includes("r") ? 1 : -1;

      setIsResizing(true);

      const onMove = (ev: PointerEvent) => {
        const dx = (ev.clientX - startX) * xSign;
        const newW = Math.max(MIN_WIDTH_PX, Math.min(parentW, startWidthPx + dx));
        setLiveWidth(newW);
      };

      const onUp = () => {
        setIsResizing(false);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);

        const finalPx = liveWidthRef.current ?? startWidthPx;
        const pct = Math.max(5, Math.min(100, Math.round((finalPx / parentW) * 100)));
        updateAttributes({ width: pct });
        setLiveWidth(null);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [activePct, getParentWidth, updateAttributes],
  );

  // ── Crop apply ──
  const applyCrop = useCallback(() => {
    const rect = cropRectRef.current;
    if (rect.x === 0 && rect.y === 0 && rect.w >= 99.9 && rect.h >= 99.9) {
      setIsCropping(false);
      return;
    }
    const sourceImg = new window.Image();
    sourceImg.crossOrigin = "anonymous";
    sourceImg.onload = () => {
      const canvas = document.createElement("canvas");
      const sx = (rect.x / 100) * sourceImg.naturalWidth;
      const sy = (rect.y / 100) * sourceImg.naturalHeight;
      const sw = (rect.w / 100) * sourceImg.naturalWidth;
      const sh = (rect.h / 100) * sourceImg.naturalHeight;
      canvas.width = Math.max(1, Math.round(sw));
      canvas.height = Math.max(1, Math.round(sh));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(sourceImg, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      try {
        updateAttributes({ src: canvas.toDataURL("image/png") });
      } catch {
        /* CORS */
      }
      setIsCropping(false);
    };
    sourceImg.onerror = () => setIsCropping(false);
    sourceImg.src = src;
  }, [src, updateAttributes]);

  // ── Crop drag ──
  const handleCropPointerDown = useCallback(
    (e: React.PointerEvent, handle: string) => {
      e.preventDefault();
      e.stopPropagation();

      const overlayEl = containerRef.current;
      if (!overlayEl) return;

      cropDragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startRect: { ...cropRectRef.current },
        handle,
      };

      const clamp = (v: number, mn: number, mx: number) =>
        Math.max(mn, Math.min(mx, v));

      const onMove = (ev: PointerEvent) => {
        const drag = cropDragRef.current;
        if (!drag || !overlayEl) return;

        const elRect = overlayEl.getBoundingClientRect();
        const dx = ((ev.clientX - drag.startX) / elRect.width) * 100;
        const dy = ((ev.clientY - drag.startY) / elRect.height) * 100;
        const s = drag.startRect;

        let { x, y, w, h } = s;

        if (handle === "move") {
          x = clamp(s.x + dx, 0, 100 - s.w);
          y = clamp(s.y + dy, 0, 100 - s.h);
        } else {
          if (handle.includes("l")) {
            const nx = clamp(s.x + dx, 0, s.x + s.w - 10);
            w = s.w - (nx - s.x);
            x = nx;
          }
          if (handle.includes("r")) {
            w = clamp(s.w + dx, 10, 100 - s.x);
          }
          if (handle.includes("t")) {
            const ny = clamp(s.y + dy, 0, s.y + s.h - 10);
            h = s.h - (ny - s.y);
            y = ny;
          }
          if (handle.includes("b")) {
            h = clamp(s.h + dy, 10, 100 - s.y);
          }
        }
        setCropRect({ x, y, w, h });
      };

      const onUp = () => {
        cropDragRef.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [],
  );

  return (
    <NodeViewWrapper
      as="span"
      className="inline-block align-top m-1"
      data-drag-handle
    >
      <div
        ref={containerRef}
        className="relative group inline-block"
        style={{ width: `${computedWidthPx}px` }}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt || ""}
          onClick={isCropping ? undefined : handleSelect}
          className={`block w-full h-auto rounded-lg select-none cursor-pointer transition-shadow ${
            selected && !isCropping
              ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
              : ""
          } ${isResizing ? "pointer-events-none" : ""}`}
          draggable={false}
        />

        {/* Corner resize handles */}
        {(selected || isResizing) &&
          !isCropping &&
          (["tl", "tr", "bl", "br"] as const).map((c) => (
            <div
              key={c}
              onPointerDown={(e) => handleResizeStart(e, c)}
              className={`absolute w-3 h-3 bg-primary border-2 border-background rounded-sm z-10 ${
                c === "tl"
                  ? "-top-1.5 -left-1.5 cursor-nwse-resize"
                  : c === "tr"
                    ? "-top-1.5 -right-1.5 cursor-nesw-resize"
                    : c === "bl"
                      ? "-bottom-1.5 -left-1.5 cursor-nesw-resize"
                      : "-bottom-1.5 -right-1.5 cursor-nwse-resize"
              }`}
            />
          ))}

        {/* Edge handles */}
        {(selected || isResizing) && !isCropping && (
          <>
            <div
              onPointerDown={(e) => handleResizeStart(e, "tr")}
              className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-full z-10 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
            />
            <div
              onPointerDown={(e) => handleResizeStart(e, "tl")}
              className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-full z-10 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </>
        )}

        {/* Image toolbar */}
        {selected && !isCropping && !isResizing && (
          <div
            ref={toolbarRef}
            className={`absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-popover border rounded-lg shadow-lg px-1.5 py-1 z-20 whitespace-nowrap ${
              toolbarBelow ? "top-full mt-2" : "bottom-full mb-2"
            }`}
            contentEditable={false}
          >
            {SIZE_PRESETS.map((p) => (
              <button
                key={p.pct}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => updateAttributes({ width: p.pct })}
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
            {(["left", "center", "right"] as const).map((a) => (
              <button
                key={a}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => updateAttributes({ align: a })}
                className={`p-1 rounded transition-colors ${
                  currentAlign === a
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
                title={`Align ${a}`}
              >
                {a === "left" && <AlignLeft className="h-3.5 w-3.5" />}
                {a === "center" && <AlignCenter className="h-3.5 w-3.5" />}
                {a === "right" && <AlignRight className="h-3.5 w-3.5" />}
              </button>
            ))}
            <div className="w-px h-4 bg-border mx-0.5" />
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setIsCropping(true);
                setCropRect({ x: 0, y: 0, w: 100, h: 100 });
              }}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Crop"
            >
              <Crop className="h-3.5 w-3.5" />
            </button>
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

        {/* Resize badge */}
        {isResizing && liveWidth != null && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/75 text-white text-xs font-mono px-2 py-0.5 rounded z-20 pointer-events-none">
            {Math.round(liveWidth)}px ·{" "}
            {Math.round((liveWidth / getParentWidth()) * 100)}%
          </div>
        )}

        {/* ── Crop overlay ── */}
        {isCropping && (
          <>
            {/* Dark mask with cutout via clip-path */}
            <div
              className="absolute inset-0 z-20 pointer-events-none"
              style={{
                background: "rgba(0,0,0,0.55)",
                clipPath: `polygon(
                  0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
                  ${cropRect.x}% ${cropRect.y}%,
                  ${cropRect.x}% ${cropRect.y + cropRect.h}%,
                  ${cropRect.x + cropRect.w}% ${cropRect.y + cropRect.h}%,
                  ${cropRect.x + cropRect.w}% ${cropRect.y}%,
                  ${cropRect.x}% ${cropRect.y}%
                )`,
              }}
            />

            {/* Crop selection area */}
            <div
              className="absolute z-30 border-2 border-white cursor-move"
              style={{
                left: `${cropRect.x}%`,
                top: `${cropRect.y}%`,
                width: `${cropRect.w}%`,
                height: `${cropRect.h}%`,
              }}
              onPointerDown={(e) => handleCropPointerDown(e, "move")}
            >
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/40" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/40" />
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/40" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-white/40" />
              </div>
            </div>

            {/* Corner crop handles */}
            {(["tl", "tr", "bl", "br"] as const).map((h) => {
              const isLeft = h.includes("l");
              const isTop = h.includes("t");
              const hx = isLeft ? cropRect.x : cropRect.x + cropRect.w;
              const hy = isTop ? cropRect.y : cropRect.y + cropRect.h;
              return (
                <div
                  key={`crop-${h}`}
                  onPointerDown={(e) => handleCropPointerDown(e, h)}
                  className={`absolute w-3.5 h-3.5 bg-white border-2 border-primary rounded-full z-40 ${
                    h === "tl" || h === "br"
                      ? "cursor-nwse-resize"
                      : "cursor-nesw-resize"
                  }`}
                  style={{
                    left: `${hx}%`,
                    top: `${hy}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                />
              );
            })}

            {/* Edge crop handles */}
            {(["t", "b", "l", "r"] as const).map((edge) => {
              const isHoriz = edge === "t" || edge === "b";
              const cx = isHoriz
                ? cropRect.x + cropRect.w / 2
                : edge === "l"
                  ? cropRect.x
                  : cropRect.x + cropRect.w;
              const cy = !isHoriz
                ? cropRect.y + cropRect.h / 2
                : edge === "t"
                  ? cropRect.y
                  : cropRect.y + cropRect.h;
              return (
                <div
                  key={`crop-edge-${edge}`}
                  onPointerDown={(e) => handleCropPointerDown(e, edge)}
                  className={`absolute z-40 bg-white rounded-full ${
                    isHoriz
                      ? "w-6 h-1.5 cursor-ns-resize"
                      : "w-1.5 h-6 cursor-ew-resize"
                  }`}
                  style={{
                    left: `${cx}%`,
                    top: `${cy}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                />
              );
            })}

            {/* Apply / Cancel */}
            <div
              className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-popover border rounded-lg shadow-lg px-1.5 py-1 z-40"
              style={{ top: `calc(${cropRect.y + cropRect.h}% + 12px)` }}
            >
              <button
                onClick={applyCrop}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Check className="h-3 w-3" /> Apply
              </button>
              <button
                onClick={() => setIsCropping(false)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <X className="h-3 w-3" /> Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}
