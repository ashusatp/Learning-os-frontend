"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  Pen,
  Pencil,
  Highlighter,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Sun,
  Moon,
  Hand,
  ZoomIn,
  ZoomOut,
  LocateFixed,
} from "lucide-react";

// ── Types ──

type Tool = "pen" | "pencil" | "highlighter" | "eraser" | "hand";
type CanvasTheme = "light" | "dark";

interface Point {
  x: number;
  y: number;
  pressure: number;
}

interface Stroke {
  tool: Tool;
  color: string;
  size: number;
  points: Point[];
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

interface SketchBoardProps {
  initialData?: string;
  onChange?: (data: string) => void;
}

// ── Constants ──

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const GRID_SIZE = 24;

const LIGHT_COLORS = [
  { value: "#1a1a2e", label: "Ink" },
  { value: "#4a4a5a", label: "Graphite" },
  { value: "#94a3b8", label: "Silver" },
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Yellow" },
  { value: "#22c55e", label: "Green" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#ec4899", label: "Pink" },
];

const DARK_COLORS = [
  { value: "#e2e8f0", label: "White" },
  { value: "#94a3b8", label: "Silver" },
  { value: "#64748b", label: "Slate" },
  { value: "#f87171", label: "Red" },
  { value: "#fb923c", label: "Orange" },
  { value: "#facc15", label: "Yellow" },
  { value: "#4ade80", label: "Green" },
  { value: "#60a5fa", label: "Blue" },
  { value: "#a78bfa", label: "Violet" },
  { value: "#f472b6", label: "Pink" },
];

const SIZES = [
  { label: "Fine", value: 1.5 },
  { label: "Medium", value: 3 },
  { label: "Thick", value: 6 },
  { label: "Bold", value: 10 },
];

const DRAW_TOOLS: { id: Tool; label: string; icon: React.ReactNode }[] = [
  { id: "pen", label: "Pen", icon: <Pen className="h-4 w-4" /> },
  { id: "pencil", label: "Pencil", icon: <Pencil className="h-4 w-4" /> },
  { id: "highlighter", label: "Highlighter", icon: <Highlighter className="h-4 w-4" /> },
  { id: "eraser", label: "Eraser", icon: <Eraser className="h-4 w-4" /> },
  { id: "hand", label: "Pan (Space + drag)", icon: <Hand className="h-4 w-4" /> },
];

// ── Drawing helpers ──

function getStrokeStyle(tool: Tool, color: string, size: number) {
  switch (tool) {
    case "pen":
      return { color, width: size, opacity: 1, cap: "round" as CanvasLineCap };
    case "pencil":
      return { color, width: size * 0.8, opacity: 0.6, cap: "round" as CanvasLineCap };
    case "highlighter":
      return { color, width: size * 3, opacity: 0.25, cap: "square" as CanvasLineCap };
    case "eraser":
      return { color: "eraser", width: size * 4, opacity: 1, cap: "round" as CanvasLineCap };
    default:
      return { color, width: size, opacity: 1, cap: "round" as CanvasLineCap };
  }
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (stroke.points.length < 2) return;

  const style = getStrokeStyle(stroke.tool, stroke.color, stroke.size);
  ctx.save();
  ctx.globalAlpha = style.opacity;
  ctx.strokeStyle = style.color;
  ctx.lineWidth = style.width;
  ctx.lineCap = style.cap;
  ctx.lineJoin = "round";

  if (stroke.tool === "pencil") {
    ctx.globalCompositeOperation = "multiply";
  }

  if (stroke.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = 1;
  }

  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

  if (stroke.points.length === 2) {
    ctx.lineTo(stroke.points[1].x, stroke.points[1].y);
  } else {
    for (let i = 1; i < stroke.points.length - 1; i++) {
      const curr = stroke.points[i];
      const next = stroke.points[i + 1];
      const midX = (curr.x + next.x) / 2;
      const midY = (curr.y + next.y) / 2;

      if (stroke.tool === "pen" && curr.pressure > 0) {
        ctx.lineWidth = style.width * (0.5 + curr.pressure * 0.8);
      }

      ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
    }
    const last = stroke.points[stroke.points.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  ctx.stroke();
  ctx.restore();
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  viewW: number,
  viewH: number,
  theme: CanvasTheme
) {
  const spacing = GRID_SIZE * camera.zoom;
  // Don't draw grid if too zoomed out (would be too dense)
  if (spacing < 6) return;

  ctx.save();
  ctx.strokeStyle =
    theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
  ctx.lineWidth = 1;

  const offsetX = (camera.x * camera.zoom) % spacing;
  const offsetY = (camera.y * camera.zoom) % spacing;

  for (let x = offsetX; x < viewW; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, viewH);
    ctx.stroke();
  }
  for (let y = offsetY; y < viewH; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(viewW, Math.round(y) + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function renderCanvas(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  currentStroke: Stroke | null,
  camera: Camera,
  viewW: number,
  viewH: number,
  theme: CanvasTheme
) {
  ctx.save();
  // Clear & fill background
  ctx.clearRect(0, 0, viewW, viewH);
  ctx.fillStyle = theme === "dark" ? "#1e1e2e" : "#ffffff";
  ctx.fillRect(0, 0, viewW, viewH);

  // Draw infinite grid
  drawGrid(ctx, camera, viewW, viewH, theme);

  // Apply camera transform for strokes
  ctx.translate(camera.x * camera.zoom, camera.y * camera.zoom);
  ctx.scale(camera.zoom, camera.zoom);

  for (const stroke of strokes) {
    drawStroke(ctx, stroke);
  }
  if (currentStroke) {
    drawStroke(ctx, currentStroke);
  }

  ctx.restore();
}

// ── Component ──

export function SketchBoard({ initialData, onChange }: SketchBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const prevToolRef = useRef<Tool>("pen");
  const [canvasTheme, setCanvasTheme] = useState<CanvasTheme>("light");
  const [color, setColor] = useState("#1a1a2e");
  const [size, setSize] = useState(3);
  const [strokes, setStrokes] = useState<Stroke[]>(() => {
    if (initialData) {
      try {
        return JSON.parse(initialData);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const currentStroke = useRef<Stroke | null>(null);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);

  // Camera state (infinite canvas)
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const panStart = useRef<{ x: number; y: number; camX: number; camY: number } | null>(null);

  const colors = canvasTheme === "dark" ? DARK_COLORS : LIGHT_COLORS;

  const isHandTool = tool === "hand" || spaceHeld;

  // Switch default color when theme changes
  const handleThemeToggle = useCallback(() => {
    setCanvasTheme((t) => {
      const next = t === "light" ? "dark" : "light";
      setColor(next === "dark" ? "#e2e8f0" : "#1a1a2e");
      return next;
    });
  }, []);

  // ── Space key for temporary hand tool ──
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && !isDrawing) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpaceHeld(false);
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [isDrawing]);

  // ── Resize canvas ──
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      renderCanvas(ctx, strokes, currentStroke.current, camera, rect.width, rect.height, canvasTheme);
    }
  }, [strokes, camera, canvasTheme]);

  useEffect(() => {
    redraw();
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(redraw);
    observer.observe(container);
    return () => observer.disconnect();
  }, [redraw]);

  const notifyChange = useCallback(
    (newStrokes: Stroke[]) => {
      onChange?.(JSON.stringify(newStrokes));
    },
    [onChange]
  );

  // Convert screen coords → world coords
  const screenToWorld = useCallback(
    (screenX: number, screenY: number): { x: number; y: number } => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const sx = screenX - rect.left;
      const sy = screenY - rect.top;
      return {
        x: sx / camera.zoom - camera.x,
        y: sy / camera.zoom - camera.y,
      };
    },
    [camera]
  );

  // ── Pointer handlers ──

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.setPointerCapture(e.pointerId);

      // Pan mode
      if (isHandTool || e.button === 1) {
        setIsPanning(true);
        panStart.current = {
          x: e.clientX,
          y: e.clientY,
          camX: camera.x,
          camY: camera.y,
        };
        return;
      }

      const world = screenToWorld(e.clientX, e.clientY);
      const point: Point = { x: world.x, y: world.y, pressure: e.pressure || 0.5 };
      currentStroke.current = { tool, color, size, points: [point] };
      setIsDrawing(true);
    },
    [tool, color, size, screenToWorld, isHandTool, camera]
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      // Panning
      if (isPanning && panStart.current) {
        const dx = (e.clientX - panStart.current.x) / camera.zoom;
        const dy = (e.clientY - panStart.current.y) / camera.zoom;
        setCamera((c) => ({
          ...c,
          x: panStart.current!.camX + dx,
          y: panStart.current!.camY + dy,
        }));
        return;
      }

      if (!isDrawing || !currentStroke.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const world = screenToWorld(e.clientX, e.clientY);
      const point: Point = { x: world.x, y: world.y, pressure: e.pressure || 0.5 };
      currentStroke.current.points.push(point);

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      renderCanvas(ctx, strokes, currentStroke.current, camera, w, h, canvasTheme);
    },
    [isPanning, isDrawing, strokes, screenToWorld, camera, canvasTheme]
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (canvas) canvas.releasePointerCapture(e.pointerId);

      if (isPanning) {
        setIsPanning(false);
        panStart.current = null;
        return;
      }

      if (!isDrawing || !currentStroke.current) return;

      if (currentStroke.current.points.length >= 2) {
        const newStrokes = [...strokes, currentStroke.current];
        setStrokes(newStrokes);
        setRedoStack([]);
        notifyChange(newStrokes);
      }
      currentStroke.current = null;
      setIsDrawing(false);
    },
    [isPanning, isDrawing, strokes, notifyChange]
  );

  // ── Zoom with scroll wheel ──
  const handleWheel = useCallback(
    (e: ReactWheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();

      // Pinch zoom or ctrl+scroll
      if (e.ctrlKey || e.metaKey) {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const delta = -e.deltaY * 0.005;
        setCamera((c) => {
          const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, c.zoom * (1 + delta)));
          const ratio = newZoom / c.zoom;
          // Zoom towards mouse position
          const newX = mouseX / newZoom - (mouseX / c.zoom - c.x);
          const newY = mouseY / newZoom - (mouseY / c.zoom - c.y);
          return { x: newX, y: newY, zoom: newZoom };
        });
      } else {
        // Regular scroll = pan
        setCamera((c) => ({
          ...c,
          x: c.x - e.deltaX / c.zoom,
          y: c.y - e.deltaY / c.zoom,
        }));
      }
    },
    []
  );

  // ── Zoom buttons ──
  const zoomIn = useCallback(() => {
    setCamera((c) => {
      const newZoom = Math.min(MAX_ZOOM, c.zoom * 1.3);
      return { ...c, zoom: newZoom };
    });
  }, []);

  const zoomOut = useCallback(() => {
    setCamera((c) => {
      const newZoom = Math.max(MIN_ZOOM, c.zoom / 1.3);
      return { ...c, zoom: newZoom };
    });
  }, []);

  const resetView = useCallback(() => {
    setCamera({ x: 0, y: 0, zoom: 1 });
  }, []);

  // ── Undo / Redo / Clear ──

  const handleUndo = useCallback(() => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    const newStrokes = strokes.slice(0, -1);
    setStrokes(newStrokes);
    setRedoStack((r) => [...r, last]);
    notifyChange(newStrokes);
  }, [strokes, notifyChange]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const last = redoStack[redoStack.length - 1];
    const newStrokes = [...strokes, last];
    setStrokes(newStrokes);
    setRedoStack((r) => r.slice(0, -1));
    notifyChange(newStrokes);
  }, [strokes, redoStack, notifyChange]);

  const handleClear = useCallback(() => {
    setStrokes([]);
    setRedoStack([]);
    notifyChange([]);
  }, [notifyChange]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        zoomIn();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "-") {
        e.preventDefault();
        zoomOut();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "0") {
        e.preventDefault();
        resetView();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo, zoomIn, zoomOut, resetView]);

  const zoomPercent = Math.round(camera.zoom * 100);

  return (
    <div
      className={`flex flex-col h-full rounded-xl overflow-hidden border shadow-sm transition-colors duration-200 ${
        canvasTheme === "dark"
          ? "border-white/[0.06] bg-[#1e1e2e]"
          : "border-black/[0.06] bg-white"
      }`}
    >
      {/* Toolbar */}
      <div
        className={`flex items-center gap-1.5 px-4 py-2.5 shrink-0 transition-colors duration-200 ${
          canvasTheme === "dark"
            ? "bg-[#16161e] border-b border-white/[0.06]"
            : "bg-gradient-to-b from-gray-50 to-gray-100/80 border-b border-black/[0.06]"
        }`}
      >
        {/* Tools — pill group */}
        <div
          className={`flex items-center rounded-xl p-0.5 ${
            canvasTheme === "dark" ? "bg-white/[0.06]" : "bg-black/[0.04]"
          }`}
        >
          {DRAW_TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={t.label}
              className={`relative px-3 py-1.5 rounded-[10px] transition-all duration-150 ${
                tool === t.id || (t.id === "hand" && spaceHeld)
                  ? canvasTheme === "dark"
                    ? "bg-white/[0.12] text-white shadow-sm"
                    : "bg-white text-gray-900 shadow-sm"
                  : canvasTheme === "dark"
                    ? "text-gray-400 hover:text-gray-200"
                    : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {t.icon}
            </button>
          ))}
        </div>

        <div
          className={`w-px h-5 mx-1 ${
            canvasTheme === "dark" ? "bg-white/[0.08]" : "bg-black/[0.08]"
          }`}
        />

        {/* Size picker */}
        <div className="relative">
          <button
            onClick={() => setShowSizePicker((s) => !s)}
            title="Stroke size"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors ${
              canvasTheme === "dark"
                ? "text-gray-400 hover:text-gray-200 hover:bg-white/[0.06]"
                : "text-gray-500 hover:text-gray-800 hover:bg-black/[0.04]"
            }`}
          >
            <div
              className="rounded-full transition-all"
              style={{
                width: Math.max(4, size * 1.5),
                height: Math.max(4, size * 1.5),
                backgroundColor: canvasTheme === "dark" ? "#e2e8f0" : "#1a1a2e",
              }}
            />
            <span className="text-xs font-medium">
              {SIZES.find((s) => s.value === size)?.label ?? "Custom"}
            </span>
          </button>
          {showSizePicker && (
            <div
              className={`absolute top-full left-0 mt-2 rounded-xl border p-1.5 z-20 min-w-[130px] shadow-xl backdrop-blur-xl ${
                canvasTheme === "dark"
                  ? "bg-[#1e1e2e]/95 border-white/[0.08]"
                  : "bg-white/95 border-black/[0.08]"
              }`}
            >
              {SIZES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    setSize(s.value);
                    setShowSizePicker(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    size === s.value
                      ? canvasTheme === "dark"
                        ? "bg-white/[0.1] text-white"
                        : "bg-black/[0.06] text-gray-900"
                      : canvasTheme === "dark"
                        ? "text-gray-400 hover:bg-white/[0.06] hover:text-gray-200"
                        : "text-gray-500 hover:bg-black/[0.03] hover:text-gray-800"
                  }`}
                >
                  <div
                    className="rounded-full shrink-0"
                    style={{
                      width: Math.max(3, s.value * 1.2),
                      height: Math.max(3, s.value * 1.2),
                      backgroundColor:
                        canvasTheme === "dark" ? "#e2e8f0" : "#1a1a2e",
                    }}
                  />
                  <span className="font-medium">{s.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          className={`w-px h-5 mx-1 ${
            canvasTheme === "dark" ? "bg-white/[0.08]" : "bg-black/[0.08]"
          }`}
        />

        {/* Colors — inline */}
        <div className="flex items-center gap-[6px] px-1">
          {colors.map((c) => {
            const isActive = color === c.value;
            return (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                title={c.label}
                className="relative flex items-center justify-center"
              >
                {isActive && (
                  <div
                    className="absolute rounded-full animate-in zoom-in-75 duration-150"
                    style={{
                      width: 22,
                      height: 22,
                      border: `2px solid ${c.value}`,
                      opacity: 0.4,
                    }}
                  />
                )}
                <div
                  className={`rounded-full transition-all duration-150 ${
                    isActive ? "h-[14px] w-[14px]" : "h-[14px] w-[14px] hover:scale-125"
                  }`}
                  style={{
                    backgroundColor: c.value,
                    boxShadow:
                      canvasTheme === "light" && c.value === "#ffffff"
                        ? "inset 0 0 0 1px rgba(0,0,0,0.12)"
                        : canvasTheme === "dark"
                          ? `0 0 0 0.5px rgba(255,255,255,0.1)`
                          : undefined,
                  }}
                />
              </button>
            );
          })}
        </div>

        <div
          className={`w-px h-5 mx-1 ${
            canvasTheme === "dark" ? "bg-white/[0.08]" : "bg-black/[0.08]"
          }`}
        />

        {/* Actions */}
        <div
          className={`flex items-center rounded-xl p-0.5 ${
            canvasTheme === "dark" ? "bg-white/[0.06]" : "bg-black/[0.04]"
          }`}
        >
          <button
            onClick={handleUndo}
            disabled={strokes.length === 0}
            title="Undo"
            className={`p-1.5 rounded-[10px] transition-colors disabled:opacity-20 disabled:pointer-events-none ${
              canvasTheme === "dark"
                ? "text-gray-400 hover:text-gray-200 hover:bg-white/[0.08]"
                : "text-gray-500 hover:text-gray-800 hover:bg-white"
            }`}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            title="Redo"
            className={`p-1.5 rounded-[10px] transition-colors disabled:opacity-20 disabled:pointer-events-none ${
              canvasTheme === "dark"
                ? "text-gray-400 hover:text-gray-200 hover:bg-white/[0.08]"
                : "text-gray-500 hover:text-gray-800 hover:bg-white"
            }`}
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          onClick={handleClear}
          disabled={strokes.length === 0}
          title="Clear canvas"
          className={`p-1.5 rounded-xl transition-colors disabled:opacity-20 disabled:pointer-events-none ${
            canvasTheme === "dark"
              ? "text-gray-400 hover:text-red-400 hover:bg-red-500/10"
              : "text-gray-500 hover:text-red-600 hover:bg-red-50"
          }`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>

        {/* Spacer + theme toggle */}
        <div className="ml-auto" />
        <button
          onClick={handleThemeToggle}
          title={canvasTheme === "dark" ? "Light canvas" : "Dark canvas"}
          className={`p-2 rounded-xl transition-colors ${
            canvasTheme === "dark"
              ? "text-gray-400 hover:text-amber-300 hover:bg-amber-500/10"
              : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
          }`}
        >
          {canvasTheme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className={`flex-1 min-h-0 relative ${
          isHandTool || isPanning ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"
        }`}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onWheel={handleWheel}
        />

        {/* Bottom-right zoom controls */}
        <div
          className={`absolute bottom-3 right-3 flex items-center gap-1 rounded-xl p-1 backdrop-blur-xl shadow-lg ${
            canvasTheme === "dark"
              ? "bg-[#16161e]/90 border border-white/[0.06]"
              : "bg-white/90 border border-black/[0.06]"
          }`}
        >
          <button
            onClick={zoomOut}
            title="Zoom out"
            className={`p-1.5 rounded-lg transition-colors ${
              canvasTheme === "dark"
                ? "text-gray-400 hover:text-gray-200 hover:bg-white/[0.08]"
                : "text-gray-500 hover:text-gray-800 hover:bg-black/[0.04]"
            }`}
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={resetView}
            title="Reset view"
            className={`px-2 py-1 rounded-lg text-[11px] font-medium tabular-nums min-w-[42px] text-center transition-colors ${
              canvasTheme === "dark"
                ? "text-gray-300 hover:bg-white/[0.08]"
                : "text-gray-600 hover:bg-black/[0.04]"
            }`}
          >
            {zoomPercent}%
          </button>
          <button
            onClick={zoomIn}
            title="Zoom in"
            className={`p-1.5 rounded-lg transition-colors ${
              canvasTheme === "dark"
                ? "text-gray-400 hover:text-gray-200 hover:bg-white/[0.08]"
                : "text-gray-500 hover:text-gray-800 hover:bg-black/[0.04]"
            }`}
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <div
            className={`w-px h-4 ${
              canvasTheme === "dark" ? "bg-white/[0.08]" : "bg-black/[0.08]"
            }`}
          />
          <button
            onClick={resetView}
            title="Reset to center"
            className={`p-1.5 rounded-lg transition-colors ${
              canvasTheme === "dark"
                ? "text-gray-400 hover:text-gray-200 hover:bg-white/[0.08]"
                : "text-gray-500 hover:text-gray-800 hover:bg-black/[0.04]"
            }`}
          >
            <LocateFixed className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
