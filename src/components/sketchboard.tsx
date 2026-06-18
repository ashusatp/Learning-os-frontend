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
  Square,
  Circle as CircleIcon,
  Minus,
  MoveRight,
  Type,
  ImagePlus,
  FileStack,
  Infinity,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Grid3X3,
  PenLine,
  GripHorizontal,
  ChevronDown,
} from "lucide-react";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

type DrawTool = "pen" | "pencil" | "highlighter" | "eraser";
type ShapeType = "rectangle" | "circle" | "line" | "arrow";
type ActiveTool = DrawTool | "hand" | "shape" | "text" | "image";
type CanvasTheme = "light" | "dark";
type Background = "blank" | "grid" | "dots" | "lines";
type CanvasMode = "infinite" | "pages";

interface Point {
  x: number;
  y: number;
  pressure: number;
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

// ── Element types ──

interface StrokeElement {
  id: string;
  type: "stroke";
  tool: DrawTool;
  color: string;
  size: number;
  points: Point[];
}

interface ShapeElement {
  id: string;
  type: "shape";
  shape: ShapeType;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  size: number;
}

interface TextElement {
  id: string;
  type: "text";
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
}

interface ImageElement {
  id: string;
  type: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
}

type CanvasElement = StrokeElement | ShapeElement | TextElement | ImageElement;

interface Page {
  id: string;
  elements: CanvasElement[];
}

interface SketchBoardProps {
  initialData?: string;
  onChange?: (data: string) => void;
}

// ═══════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════

const GRID_SIZE = 24;
const PAGE_W = 816;
const PAGE_H = 1056;

let _idCounter = 0;
function uid() {
  return `el_${Date.now()}_${++_idCounter}`;
}

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

const DRAW_TOOLS: { id: ActiveTool; label: string; icon: React.ReactNode }[] = [
  { id: "pen", label: "Pen", icon: <Pen className="h-4 w-4" /> },
  { id: "pencil", label: "Pencil", icon: <Pencil className="h-4 w-4" /> },
  { id: "highlighter", label: "Highlighter", icon: <Highlighter className="h-4 w-4" /> },
  { id: "eraser", label: "Eraser", icon: <Eraser className="h-4 w-4" /> },
];

const SHAPE_TYPES: { id: ShapeType; label: string; icon: React.ReactNode }[] = [
  { id: "rectangle", label: "Rectangle", icon: <Square className="h-3.5 w-3.5" /> },
  { id: "circle", label: "Circle", icon: <CircleIcon className="h-3.5 w-3.5" /> },
  { id: "line", label: "Line", icon: <Minus className="h-3.5 w-3.5" /> },
  { id: "arrow", label: "Arrow", icon: <MoveRight className="h-3.5 w-3.5" /> },
];

const BG_OPTIONS: { id: Background; label: string }[] = [
  { id: "blank", label: "Blank" },
  { id: "grid", label: "Grid" },
  { id: "dots", label: "Dots" },
  { id: "lines", label: "Lines" },
];

// ═══════════════════════════════════════════
// Drawing helpers
// ═══════════════════════════════════════════

function getStrokeStyle(tool: DrawTool, color: string, size: number) {
  switch (tool) {
    case "pen":
      return { color, width: size, opacity: 1, cap: "round" as CanvasLineCap };
    case "pencil":
      return { color, width: size * 0.8, opacity: 0.6, cap: "round" as CanvasLineCap };
    case "highlighter":
      return { color, width: size * 3, opacity: 0.25, cap: "square" as CanvasLineCap };
    case "eraser":
      return { color: "#000", width: size * 4, opacity: 1, cap: "round" as CanvasLineCap };
  }
}

function drawStrokeElement(ctx: CanvasRenderingContext2D, el: StrokeElement) {
  if (el.points.length < 2) return;
  const style = getStrokeStyle(el.tool, el.color, el.size);
  ctx.save();
  ctx.globalAlpha = style.opacity;
  ctx.strokeStyle = style.color;
  ctx.lineWidth = style.width;
  ctx.lineCap = style.cap;
  ctx.lineJoin = "round";

  if (el.tool === "pencil") ctx.globalCompositeOperation = "multiply";
  if (el.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = 1;
  }

  ctx.beginPath();
  ctx.moveTo(el.points[0].x, el.points[0].y);

  if (el.points.length === 2) {
    ctx.lineTo(el.points[1].x, el.points[1].y);
  } else {
    for (let i = 1; i < el.points.length - 1; i++) {
      const curr = el.points[i];
      const next = el.points[i + 1];
      const mx = (curr.x + next.x) / 2;
      const my = (curr.y + next.y) / 2;
      if (el.tool === "pen" && curr.pressure > 0) {
        ctx.lineWidth = style.width * (0.5 + curr.pressure * 0.8);
      }
      ctx.quadraticCurveTo(curr.x, curr.y, mx, my);
    }
    const last = el.points[el.points.length - 1];
    ctx.lineTo(last.x, last.y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawShapeElement(ctx: CanvasRenderingContext2D, el: ShapeElement) {
  ctx.save();
  ctx.strokeStyle = el.color;
  ctx.lineWidth = el.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const x = Math.min(el.x1, el.x2);
  const y = Math.min(el.y1, el.y2);
  const w = Math.abs(el.x2 - el.x1);
  const h = Math.abs(el.y2 - el.y1);

  switch (el.shape) {
    case "rectangle":
      ctx.strokeRect(x, y, w, h);
      break;
    case "circle":
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "line":
      ctx.beginPath();
      ctx.moveTo(el.x1, el.y1);
      ctx.lineTo(el.x2, el.y2);
      ctx.stroke();
      break;
    case "arrow": {
      ctx.beginPath();
      ctx.moveTo(el.x1, el.y1);
      ctx.lineTo(el.x2, el.y2);
      ctx.stroke();
      // Arrowhead
      const angle = Math.atan2(el.y2 - el.y1, el.x2 - el.x1);
      const headLen = Math.max(10, el.size * 4);
      ctx.beginPath();
      ctx.moveTo(el.x2, el.y2);
      ctx.lineTo(
        el.x2 - headLen * Math.cos(angle - Math.PI / 6),
        el.y2 - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(el.x2, el.y2);
      ctx.lineTo(
        el.x2 - headLen * Math.cos(angle + Math.PI / 6),
        el.y2 - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

function drawTextElement(ctx: CanvasRenderingContext2D, el: TextElement) {
  ctx.save();
  ctx.font = `${el.fontSize}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = el.color;
  ctx.textBaseline = "top";
  const lines = el.text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], el.x, el.y + i * el.fontSize * 1.3);
  }
  ctx.restore();
}

function drawImageElement(
  ctx: CanvasRenderingContext2D,
  el: ImageElement,
  imageCache: Map<string, HTMLImageElement>
) {
  const img = imageCache.get(el.src);
  if (img && img.complete) {
    ctx.drawImage(img, el.x, el.y, el.width, el.height);
  }
}

function drawElement(
  ctx: CanvasRenderingContext2D,
  el: CanvasElement,
  imageCache: Map<string, HTMLImageElement>
) {
  switch (el.type) {
    case "stroke":
      drawStrokeElement(ctx, el);
      break;
    case "shape":
      drawShapeElement(ctx, el);
      break;
    case "text":
      drawTextElement(ctx, el);
      break;
    case "image":
      drawImageElement(ctx, el, imageCache);
      break;
  }
}

// ── Background rendering ──

function drawBackground(
  ctx: CanvasRenderingContext2D,
  bg: Background,
  camera: Camera,
  viewW: number,
  viewH: number,
  theme: CanvasTheme
) {
  // Fill bg
  ctx.fillStyle = theme === "dark" ? "#1e1e2e" : "#ffffff";
  ctx.fillRect(0, 0, viewW, viewH);

  if (bg === "blank") return;

  const spacing = GRID_SIZE * camera.zoom;
  if (spacing < 4) return; // too dense

  const dotColor = theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const lineColor = theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";

  const offsetX = (camera.x * camera.zoom) % spacing;
  const offsetY = (camera.y * camera.zoom) % spacing;

  ctx.save();

  if (bg === "grid") {
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
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
  } else if (bg === "dots") {
    ctx.fillStyle = dotColor;
    const r = Math.max(1, camera.zoom * 1.2);
    for (let x = offsetX; x < viewW; x += spacing) {
      for (let y = offsetY; y < viewH; y += spacing) {
        ctx.beginPath();
        ctx.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (bg === "lines") {
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    for (let y = offsetY; y < viewH; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(viewW, Math.round(y) + 0.5);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// ── Page rendering ──

const PAGE_GAP = 32;

function drawPages(
  ctx: CanvasRenderingContext2D,
  scrollY: number,
  viewW: number,
  viewH: number,
  theme: CanvasTheme,
  bg: Background,
  pageCount: number,
  activePageIndex: number
) {
  // Pages are centered horizontally, stacked vertically — fit within viewport
  const pageScale = Math.min(1, (viewW - 48) / PAGE_W, (viewH - 48) / PAGE_H);
  const scaledW = PAGE_W * pageScale;
  const scaledH = PAGE_H * pageScale;
  const px = (viewW - scaledW) / 2;

  for (let i = 0; i < pageCount; i++) {
    const py = i * (scaledH + PAGE_GAP) + 24 - scrollY;

    // Skip if not visible
    if (py + scaledH < -50 || py > viewH + 50) continue;

    ctx.save();
    // Page shadow
    ctx.fillStyle = theme === "dark" ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.06)";
    ctx.beginPath();
    ctx.roundRect(px + 3, py + 3, scaledW, scaledH, 4);
    ctx.fill();

    // Page background
    ctx.fillStyle = theme === "dark" ? "#232336" : "#ffffff";
    ctx.beginPath();
    ctx.roundRect(px, py, scaledW, scaledH, 3);
    ctx.fill();

    // Draw background pattern inside page
    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, scaledW, scaledH);
    ctx.clip();
    drawPageBackground(ctx, bg, theme, px, py, scaledW, scaledH);
    ctx.restore();

    // Page border
    ctx.strokeStyle =
      i === activePageIndex
        ? theme === "dark" ? "rgba(99,102,241,0.5)" : "rgba(99,102,241,0.4)"
        : theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
    ctx.lineWidth = i === activePageIndex ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(px, py, scaledW, scaledH, 3);
    ctx.stroke();

    // Page number
    ctx.fillStyle = theme === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)";
    ctx.font = "11px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${i + 1}`, px + scaledW / 2, py + scaledH + 16);

    ctx.restore();
  }
}

function drawPageBackground(
  ctx: CanvasRenderingContext2D,
  bg: Background,
  theme: CanvasTheme,
  px: number,
  py: number,
  w: number,
  h: number
) {
  if (bg === "blank") return;
  const spacing = GRID_SIZE;
  const lineColor = theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  const dotColor = theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  ctx.save();
  if (bg === "grid") {
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 0.5;
    for (let x = spacing; x < w; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(px + x + 0.5, py);
      ctx.lineTo(px + x + 0.5, py + h);
      ctx.stroke();
    }
    for (let y = spacing; y < h; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(px, py + y + 0.5);
      ctx.lineTo(px + w, py + y + 0.5);
      ctx.stroke();
    }
  } else if (bg === "dots") {
    ctx.fillStyle = dotColor;
    for (let x = spacing; x < w; x += spacing) {
      for (let y = spacing; y < h; y += spacing) {
        ctx.beginPath();
        ctx.arc(px + x, py + y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (bg === "lines") {
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 0.5;
    for (let y = spacing; y < h; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(px, py + y + 0.5);
      ctx.lineTo(px + w, py + y + 0.5);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function getPageLayout(viewW: number, viewH?: number) {
  // Scale to fit both width and height (if viewH provided)
  let pageScale = Math.min(1, (viewW - 48) / PAGE_W);
  if (viewH) {
    pageScale = Math.min(pageScale, (viewH - 48) / PAGE_H);
  }
  const scaledW = PAGE_W * pageScale;
  const scaledH = PAGE_H * pageScale;
  const px = (viewW - scaledW) / 2;
  return { pageScale, scaledW, scaledH, px };
}

// ── Main render ──

function renderCanvas(
  mainCtx: CanvasRenderingContext2D,
  offscreen: OffscreenCanvas | HTMLCanvasElement,
  elements: CanvasElement[],
  currentElement: CanvasElement | null,
  camera: Camera,
  viewW: number,
  viewH: number,
  theme: CanvasTheme,
  bg: Background,
  imageCache: Map<string, HTMLImageElement>,
  mode: CanvasMode,
  pageCount: number,
  activePageIndex: number
) {
  const dpr = window.devicePixelRatio || 1;

  // 1) Draw background on main canvas
  mainCtx.save();
  mainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  mainCtx.clearRect(0, 0, viewW, viewH);

  if (mode === "pages") {
    // Pages mode: page fills the entire canvas
    drawBackground(mainCtx, bg, { x: 0, y: 0, zoom: 1 }, viewW, viewH, theme);
  } else {
    // Infinite mode: full-width bg with pattern
    drawBackground(mainCtx, bg, camera, viewW, viewH, theme);
  }

  mainCtx.restore();

  // 2) Draw elements on offscreen canvas (eraser only affects drawing layer)
  const offCtx = offscreen.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  if (!offCtx) return;

  offCtx.save();
  offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  offCtx.clearRect(0, 0, viewW, viewH);

  if (mode === "pages") {
    // Pages mode: elements draw directly, no offset (page = full canvas)
  } else {
    // Infinite mode: just vertical offset
    offCtx.translate(0, camera.y);
  }

  for (const el of elements) {
    drawElement(offCtx as CanvasRenderingContext2D, el, imageCache);
  }
  if (currentElement) {
    drawElement(offCtx as CanvasRenderingContext2D, currentElement, imageCache);
  }

  offCtx.restore();

  // 3) Composite offscreen onto main
  mainCtx.save();
  mainCtx.setTransform(1, 0, 0, 1, 0, 0);
  mainCtx.drawImage(offscreen as HTMLCanvasElement, 0, 0);
  mainCtx.restore();
}

// ═══════════════════════════════════════════
// Component
// ═══════════════════════════════════════════

export function SketchBoard({ initialData, onChange }: SketchBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  // ── State ──
  const [activeTool, setActiveTool] = useState<ActiveTool>("pen");
  const [shapeType, setShapeType] = useState<ShapeType>("rectangle");
  const [canvasTheme, setCanvasTheme] = useState<CanvasTheme>("light");
  const [background, setBackground] = useState<Background>("grid");
  const [color, setColor] = useState("#1a1a2e");
  const [size, setSize] = useState(3);
  const [canvasMode, setCanvasMode] = useState<CanvasMode>("infinite");

  // Pages
  const [pages, setPages] = useState<Page[]>(() => {
    if (initialData) {
      try {
        const parsed = JSON.parse(initialData);
        if (Array.isArray(parsed.pages)) return parsed.pages;
        // Legacy: plain elements array
        if (Array.isArray(parsed))
          return [{ id: uid(), elements: parsed }];
      } catch {}
    }
    return [{ id: uid(), elements: [] }];
  });
  const [activePageIndex, setActivePageIndex] = useState(0);

  const elements = pages[activePageIndex]?.elements ?? [];
  const setElements = useCallback(
    (newEls: CanvasElement[]) => {
      setPages((prev) => {
        const next = [...prev];
        next[activePageIndex] = { ...next[activePageIndex], elements: newEls };
        return next;
      });
    },
    [activePageIndex]
  );

  const [redoStack, setRedoStack] = useState<CanvasElement[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [showShapePicker, setShowShapePicker] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const [penPos, setPenPos] = useState<{ x: number; y: number } | null>(null);
  const toolbarDrag = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const penDrag = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const penRef = useRef<HTMLButtonElement>(null);

  // Text editing
  const [textEditing, setTextEditing] = useState<{
    x: number;
    y: number;
    screenX: number;
    screenY: number;
  } | null>(null);
  const [textValue, setTextValue] = useState("");

  // Camera
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const panStart = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const currentElement = useRef<CanvasElement | null>(null);
  const shapeStart = useRef<{ x: number; y: number } | null>(null);

  // Image cache
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const colors = canvasTheme === "dark" ? DARK_COLORS : LIGHT_COLORS;
  const isHandTool = activeTool === "hand" || spaceHeld;

  // ── Helpers ──

  const notifyChange = useCallback(
    (newPages: Page[]) => {
      onChange?.(JSON.stringify({ pages: newPages, mode: canvasMode }));
    },
    [onChange, canvasMode]
  );

  const screenToWorld = useCallback(
    (sx: number, sy: number) => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const localX = sx - rect.left;
      const localY = sy - rect.top;

      if (canvasMode === "pages") {
        // Page fills the canvas — direct coordinates
        return { x: localX, y: localY };
      }

      // Infinite mode: vertical scroll only
      return {
        x: localX,
        y: localY - camera.y,
      };
    },
    [camera, canvasMode, activePageIndex]
  );

  // ── Offscreen canvas ──

  const ensureOffscreen = useCallback(
    (w: number, h: number) => {
      if (
        !offscreenRef.current ||
        offscreenRef.current.width !== w ||
        offscreenRef.current.height !== h
      ) {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        offscreenRef.current = c;
      }
      return offscreenRef.current;
    },
    []
  );

  // ── Redraw ──

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const pw = rect.width * dpr;
    const ph = rect.height * dpr;

    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    }

    const offscreen = ensureOffscreen(pw, ph);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    renderCanvas(
      ctx,
      offscreen,
      elements,
      currentElement.current,
      camera,
      rect.width,
      rect.height,
      canvasTheme,
      background,
      imageCacheRef.current,
      canvasMode,
      pages.length,
      activePageIndex
    );
  }, [elements, camera, canvasTheme, background, ensureOffscreen, canvasMode, pages.length, activePageIndex]);

  useEffect(() => {
    redraw();
    const container = containerRef.current;
    if (!container) return;
    const obs = new ResizeObserver(redraw);
    obs.observe(container);
    return () => obs.disconnect();
  }, [redraw]);

  // ── Preload images ──

  useEffect(() => {
    for (const el of elements) {
      if (el.type === "image" && !imageCacheRef.current.has(el.src)) {
        const img = new Image();
        img.onload = () => redraw();
        img.src = el.src;
        imageCacheRef.current.set(el.src, img);
      }
    }
  }, [elements, redraw]);

  // ── iOS: prevent default touch behaviors on canvas only ──

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const prevent = (e: Event) => e.preventDefault();
    canvas.addEventListener("touchstart", prevent, { passive: false });
    canvas.addEventListener("contextmenu", prevent);
    return () => {
      canvas.removeEventListener("touchstart", prevent);
      canvas.removeEventListener("contextmenu", prevent);
    };
  }, []);

  // ── Theme toggle ──

  const handleThemeToggle = useCallback(() => {
    setCanvasTheme((t) => {
      const next = t === "light" ? "dark" : "light";
      setColor(next === "dark" ? "#e2e8f0" : "#1a1a2e");
      return next;
    });
  }, []);

  // ── Space key (temp hand) ──

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && !isDrawing) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceHeld(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [isDrawing]);

  // ── Pointer handlers ──

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.setPointerCapture(e.pointerId);

      // Close pickers & auto-collapse toolbar
      setShowSizePicker(false);
      setShowShapePicker(false);
      setShowBgPicker(false);
      if (showToolbar) {
        setShowToolbar(false);
        if (toolbarPos) {
          setPenPos({ x: toolbarPos.x, y: toolbarPos.y });
        }
      }

      // Palm rejection: finger touch → always pan/scroll, never draw
      if (e.pointerType === "touch") {
        if (canvasMode !== "pages") {
          setIsPanning(true);
          panStart.current = { x: e.clientX, y: e.clientY, cx: 0, cy: camera.y };
        }
        return;
      }

      // Pan (vertical only, not in pages mode)
      if ((isHandTool || e.button === 1) && canvasMode !== "pages") {
        setIsPanning(true);
        panStart.current = { x: e.clientX, y: e.clientY, cx: 0, cy: camera.y };
        return;
      }

      const world = screenToWorld(e.clientX, e.clientY);

      // Text tool
      if (activeTool === "text") {
        const rect = canvas.getBoundingClientRect();
        setTextEditing({
          x: world.x,
          y: world.y,
          screenX: e.clientX - rect.left,
          screenY: e.clientY - rect.top,
        });
        setTextValue("");
        setTimeout(() => textInputRef.current?.focus(), 0);
        return;
      }

      // Shape tool
      if (activeTool === "shape") {
        shapeStart.current = { x: world.x, y: world.y };
        currentElement.current = {
          id: uid(),
          type: "shape",
          shape: shapeType,
          x1: world.x,
          y1: world.y,
          x2: world.x,
          y2: world.y,
          color,
          size,
        };
        setIsDrawing(true);
        return;
      }

      // Drawing tools
      const drawTool = activeTool as DrawTool;
      const point: Point = { x: world.x, y: world.y, pressure: e.pressure || 0.5 };
      currentElement.current = {
        id: uid(),
        type: "stroke",
        tool: drawTool,
        color,
        size,
        points: [point],
      };
      setIsDrawing(true);
    },
    [activeTool, shapeType, color, size, screenToWorld, isHandTool, camera, showToolbar, toolbarPos]
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      // Pan
      if (isPanning && panStart.current) {
        const dy = e.clientY - panStart.current.y;
        setCamera((c) => ({ ...c, y: clampY(panStart.current!.cy + dy) }));
        return;
      }

      if (!isDrawing || !currentElement.current) return;

      const world = screenToWorld(e.clientX, e.clientY);

      if (currentElement.current.type === "shape") {
        (currentElement.current as ShapeElement).x2 = world.x;
        (currentElement.current as ShapeElement).y2 = world.y;
      } else if (currentElement.current.type === "stroke") {
        (currentElement.current as StrokeElement).points.push({
          x: world.x,
          y: world.y,
          pressure: e.pressure || 0.5,
        });
      }

      redraw();
    },
    [isPanning, isDrawing, screenToWorld, camera, redraw]
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

      if (!isDrawing || !currentElement.current) return;

      let commit = false;
      if (currentElement.current.type === "stroke") {
        commit = (currentElement.current as StrokeElement).points.length >= 2;
      } else if (currentElement.current.type === "shape") {
        const s = currentElement.current as ShapeElement;
        commit = Math.abs(s.x2 - s.x1) > 2 || Math.abs(s.y2 - s.y1) > 2;
      }

      if (commit) {
        const newEls = [...elements, currentElement.current];
        setElements(newEls);
        setRedoStack([]);
        const newPages = [...pages];
        newPages[activePageIndex] = { ...newPages[activePageIndex], elements: newEls };
        notifyChange(newPages);
      }

      currentElement.current = null;
      setIsDrawing(false);
    },
    [isPanning, isDrawing, elements, setElements, pages, activePageIndex, notifyChange]
  );

  // ── Scroll zoom / pan ──

  const clampY = useCallback(
    (y: number) => {
      // Always clamp top at 0
      if (y > 0) return 0;
      // In pages mode, clamp bottom to content height
      if (canvasMode === "pages") {
        const container = containerRef.current;
        if (container) {
          const viewH = container.getBoundingClientRect().height;
          const { scaledH } = getPageLayout(container.getBoundingClientRect().width, viewH);
          const totalH = pages.length * (scaledH + PAGE_GAP) + 24 + 40; // 40 for bottom padding
          const minY = Math.min(0, -(totalH - viewH));
          return Math.max(minY, y);
        }
      }
      return y;
    },
    [canvasMode, pages.length]
  );

  const handleWheel = useCallback(
    (e: ReactWheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      // No scroll in pages mode — each page fills the canvas
      if (canvasMode === "pages") return;
      setCamera((c) => ({
        ...c,
        y: clampY(c.y - e.deltaY),
      }));
    },
    [clampY, canvasMode]
  );

  // ── View controls ──
  const resetView = useCallback(() => setCamera({ x: 0, y: 0, zoom: 1 }), []);

  // ── Undo / Redo / Clear ──

  const handleUndo = useCallback(() => {
    if (elements.length === 0) return;
    const prev = elements.slice(0, -1);
    setRedoStack((r) => [...r, elements]);
    setElements(prev);
    const np = [...pages];
    np[activePageIndex] = { ...np[activePageIndex], elements: prev };
    notifyChange(np);
  }, [elements, setElements, pages, activePageIndex, notifyChange]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const last = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setElements(last);
    const np = [...pages];
    np[activePageIndex] = { ...np[activePageIndex], elements: last };
    notifyChange(np);
  }, [redoStack, setElements, pages, activePageIndex, notifyChange]);

  const handleClear = useCallback(() => {
    setElements([]);
    setRedoStack([]);
    const np = [...pages];
    np[activePageIndex] = { ...np[activePageIndex], elements: [] };
    notifyChange(np);
  }, [setElements, pages, activePageIndex, notifyChange]);

  // ── Text commit ──

  const commitText = useCallback(() => {
    if (!textEditing || !textValue.trim()) {
      setTextEditing(null);
      setTextValue("");
      return;
    }
    const el: TextElement = {
      id: uid(),
      type: "text",
      x: textEditing.x,
      y: textEditing.y,
      text: textValue,
      fontSize: Math.max(14, size * 5),
      color,
    };
    const newEls = [...elements, el];
    setElements(newEls);
    setRedoStack([]);
    const np = [...pages];
    np[activePageIndex] = { ...np[activePageIndex], elements: newEls };
    notifyChange(np);
    setTextEditing(null);
    setTextValue("");
  }, [textEditing, textValue, color, size, elements, setElements, pages, activePageIndex, notifyChange]);

  // ── Image insert ──

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        const img = new Image();
        img.onload = () => {
          imageCacheRef.current.set(src, img);
          // Place at center of current view
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const cx = rect.width / 2;
          const cy = rect.height / 2;
          const wx = cx / camera.zoom - camera.x;
          const wy = cy / camera.zoom - camera.y;
          // Scale down large images
          let w = img.naturalWidth;
          let h = img.naturalHeight;
          const maxDim = 400;
          if (w > maxDim || h > maxDim) {
            const scale = maxDim / Math.max(w, h);
            w *= scale;
            h *= scale;
          }
          const el: ImageElement = {
            id: uid(),
            type: "image",
            x: wx - w / 2,
            y: wy - h / 2,
            width: w,
            height: h,
            src,
          };
          const newEls = [...elements, el];
          setElements(newEls);
          setRedoStack([]);
          const np = [...pages];
          np[activePageIndex] = { ...np[activePageIndex], elements: newEls };
          notifyChange(np);
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [elements, setElements, camera, pages, activePageIndex, notifyChange]
  );

  // ── Pages ──

  const addPage = useCallback(() => {
    const np = [...pages, { id: uid(), elements: [] }];
    setPages(np);
    setActivePageIndex(np.length - 1);
    notifyChange(np);
  }, [pages, notifyChange]);

  const deletePage = useCallback(
    (idx: number) => {
      if (pages.length <= 1) return;
      const np = pages.filter((_, i) => i !== idx);
      setPages(np);
      if (activePageIndex >= np.length) setActivePageIndex(np.length - 1);
      else if (idx < activePageIndex) setActivePageIndex((p) => p - 1);
      notifyChange(np);
    },
    [pages, activePageIndex, notifyChange]
  );

  // ── Keyboard shortcuts ──

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (textEditing) return; // don't intercept while typing
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        e.shiftKey ? handleRedo() : handleUndo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "0") {
        e.preventDefault();
        resetView();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo, resetView, textEditing]);

  // ── Toolbar drag ──

  const handleToolbarDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    const tbRect = toolbar.getBoundingClientRect();
    // Current position relative to container
    const currentX = toolbarPos?.x ?? (containerRect.width / 2 - tbRect.width / 2);
    const currentY = toolbarPos?.y ?? 12;
    toolbarDrag.current = { startX: e.clientX, startY: e.clientY, origX: currentX, origY: currentY };

    const handleMove = (ev: PointerEvent) => {
      if (!toolbarDrag.current) return;
      const dx = ev.clientX - toolbarDrag.current.startX;
      const dy = ev.clientY - toolbarDrag.current.startY;
      const nx = toolbarDrag.current.origX + dx;
      const ny = toolbarDrag.current.origY + dy;
      // Clamp within container
      const maxX = containerRect.width - tbRect.width;
      const maxY = containerRect.height - tbRect.height;
      setToolbarPos({ x: Math.max(0, Math.min(maxX, nx)), y: Math.max(0, Math.min(maxY, ny)) });
    };
    const handleUp = () => {
      toolbarDrag.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }, [toolbarPos]);

  // Collapse toolbar: pen appears where toolbar was
  const collapseToolbar = useCallback(() => {
    setShowToolbar(false);
    setShowSizePicker(false);
    setShowShapePicker(false);
    setShowBgPicker(false);
    // Place pen at toolbar's center-left position
    if (toolbarPos) {
      setPenPos({ x: toolbarPos.x, y: toolbarPos.y });
    } else {
      // Toolbar was centered — place pen at center top
      const container = containerRef.current;
      const toolbar = toolbarRef.current;
      if (container && toolbar) {
        const cRect = container.getBoundingClientRect();
        const tRect = toolbar.getBoundingClientRect();
        setPenPos({ x: cRect.width / 2 - 24, y: tRect.top - cRect.top });
      }
    }
  }, [toolbarPos]);

  // Expand toolbar: open at pen's position
  const expandToolbar = useCallback(() => {
    if (penRef.current) penRef.current.style.transform = "";
    if (penPos) {
      setToolbarPos({ x: penPos.x, y: penPos.y });
    }
    setShowToolbar(true);
  }, [penPos]);

  // Pen drag
  const penLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePenDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const container = containerRef.current;
    const pen = penRef.current;
    if (!container || !pen) return;
    const containerRect = container.getBoundingClientRect();
    const penRect = pen.getBoundingClientRect();
    const currentX = penPos?.x ?? (penRect.left - containerRect.left);
    const currentY = penPos?.y ?? (penRect.top - containerRect.top);
    penDrag.current = { startX: e.clientX, startY: e.clientY, origX: currentX, origY: currentY, moved: false };

    let dragEnabled = false;

    const handleMove = (ev: PointerEvent) => {
      if (!penDrag.current) return;
      const dx = ev.clientX - penDrag.current.startX;
      const dy = ev.clientY - penDrag.current.startY;
      // Only start dragging after long press activates
      if (!dragEnabled) {
        // If finger moves too far before long press, cancel drag entirely
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          if (penLongPressTimer.current) clearTimeout(penLongPressTimer.current);
        }
        return;
      }
      penDrag.current.moved = true;
      const nx = penDrag.current.origX + dx;
      const ny = penDrag.current.origY + dy;
      const maxX = containerRect.width - 48;
      const maxY = containerRect.height - 48;
      setPenPos({ x: Math.max(0, Math.min(maxX, nx)), y: Math.max(0, Math.min(maxY, ny)) });
    };
    const handleUp = () => {
      if (penLongPressTimer.current) clearTimeout(penLongPressTimer.current);
      if (pen) pen.style.transform = "";
      const wasDrag = penDrag.current?.moved;
      penDrag.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      if (!wasDrag) expandToolbar();
    };

    // Long press: enable dragging after 200ms hold
    penLongPressTimer.current = setTimeout(() => {
      dragEnabled = true;
      // Haptic-like visual feedback: slightly scale
      if (pen) pen.style.transform = "scale(1.15)";
    }, 200);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }, [penPos, expandToolbar]);

  // ── Derived ──
  const isDark = canvasTheme === "dark";

  // Toolbar button helper
  const tbtn = (active: boolean) =>
    `relative px-3 py-1.5 rounded-[10px] transition-all duration-150 ${
      active
        ? isDark
          ? "bg-white/[0.12] text-white shadow-sm"
          : "bg-white text-gray-900 shadow-sm"
        : isDark
          ? "text-gray-400 hover:text-gray-200"
          : "text-gray-500 hover:text-gray-800"
    }`;

  const sep = `w-px h-5 mx-1 ${isDark ? "bg-white/[0.08]" : "bg-black/[0.08]"}`;

  const actionBtn = (disabled?: boolean) =>
    `p-1.5 rounded-[10px] transition-colors ${disabled ? "opacity-20 pointer-events-none" : ""} ${
      isDark
        ? "text-gray-400 hover:text-gray-200 hover:bg-white/[0.08]"
        : "text-gray-500 hover:text-gray-800 hover:bg-white"
    }`;

  const pillGroup = `flex items-center rounded-xl p-0.5 ${
    isDark ? "bg-white/[0.06]" : "bg-black/[0.04]"
  }`;

  const cursor = isHandTool || isPanning
    ? "cursor-grab active:cursor-grabbing"
    : activeTool === "text"
      ? "cursor-text"
      : "cursor-crosshair";

  const cornerBtn = `p-2 rounded-xl transition-colors ${
    isDark
      ? "text-gray-400 hover:text-gray-200 hover:bg-white/[0.10]"
      : "text-gray-500 hover:text-gray-800 hover:bg-black/[0.06]"
  }`;

  return (
    <div
      className={`relative h-full rounded-xl overflow-hidden border shadow-sm transition-colors duration-200 select-none touch-none ${
        isDark ? "border-white/[0.06] bg-[#1e1e2e]" : "border-black/[0.06] bg-white"
      }`}
      style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
    >
      {/* ── Canvas area (full size) ── */}
      <div ref={containerRef} className={`absolute inset-0 select-none ${cursor}`}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none select-none"
          style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" } as React.CSSProperties}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* Text input overlay */}
        {textEditing && (
          <div
            className="absolute z-20"
            style={{ left: textEditing.screenX, top: textEditing.screenY }}
          >
            <textarea
              ref={textInputRef}
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onBlur={commitText}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setTextEditing(null);
                  setTextValue("");
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  commitText();
                }
              }}
              className={`min-w-[120px] max-w-[400px] rounded-lg border px-3 py-2 text-sm outline-none resize-none shadow-lg ${
                isDark
                  ? "bg-[#232336] border-white/[0.1] text-gray-100 placeholder:text-gray-500"
                  : "bg-white border-black/[0.1] text-gray-900 placeholder:text-gray-400"
              }`}
              placeholder="Type here..."
              rows={2}
              style={{ fontSize: Math.max(14, size * 5) * camera.zoom }}
            />
          </div>
        )}

        {/* ── Floating toolbar (draggable, collapsible) ── */}
        {showToolbar ? (() => {
          // Determine if popovers should open upward (toolbar is in bottom half)
          const containerH = containerRef.current?.getBoundingClientRect().height ?? 600;
          const tbY = toolbarPos?.y ?? 12;
          const tbH = toolbarRef.current?.getBoundingClientRect().height ?? 100;
          const popoverUp = (tbY + tbH / 2) > containerH / 2;

          return (
          <div
            ref={toolbarRef}
            className={`absolute z-30 rounded-2xl shadow-2xl backdrop-blur-xl transition-colors duration-200 ${
              isDark
                ? "bg-[#16161e]/90 border border-white/[0.08]"
                : "bg-white/90 border border-black/[0.08]"
            }`}
            style={{
              left: toolbarPos?.x ?? "50%",
              top: toolbarPos?.y ?? 12,
              ...(!toolbarPos ? { transform: "translateX(-50%)" } : {}),
            }}
          >
            {/* Drag handle + collapse */}
            <div
              className={`flex items-center justify-center gap-2 px-2 py-1 cursor-grab active:cursor-grabbing select-none ${
                isDark ? "border-b border-white/[0.04]" : "border-b border-black/[0.04]"
              }`}
              onPointerDown={handleToolbarDragStart}
            >
              <GripHorizontal className={`h-3.5 w-3.5 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
              <button
                onClick={(e) => { e.stopPropagation(); collapseToolbar(); }}
                className={`p-0.5 rounded-md transition-colors ${isDark ? "text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]" : "text-gray-400 hover:text-gray-600 hover:bg-black/[0.04]"}`}
                title="Collapse toolbar"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>

            {/* Row 1: Tools */}
            <div className="flex items-center gap-1 px-2.5 py-1.5">
              {/* Draw tools */}
              <div className={pillGroup}>
                {DRAW_TOOLS.map((t) => (
                  <button key={t.id} onClick={() => setActiveTool(t.id)} title={t.label} className={tbtn(activeTool === t.id)}>
                    {t.icon}
                  </button>
                ))}
                <button onClick={() => setActiveTool("hand")} title="Pan (Space)" className={tbtn(activeTool === "hand" || spaceHeld)}>
                  <Hand className="h-4 w-4" />
                </button>
              </div>

              <div className={sep} />

              {/* Shape tool */}
              <div className="relative">
                <button
                  onClick={() => {
                    setActiveTool("shape");
                    setShowShapePicker((s) => !s);
                    setShowSizePicker(false);
                    setShowBgPicker(false);
                  }}
                  title="Shapes"
                  className={tbtn(activeTool === "shape")}
                >
                  {SHAPE_TYPES.find((s) => s.id === shapeType)?.icon ?? <Square className="h-4 w-4" />}
                </button>
                {showShapePicker && (
                  <div className={`absolute left-0 rounded-xl border p-1.5 z-30 shadow-xl backdrop-blur-xl ${popoverUp ? "bottom-full mb-2" : "top-full mt-2"} ${isDark ? "bg-[#1e1e2e]/95 border-white/[0.08]" : "bg-white/95 border-black/[0.08]"}`}>
                    {SHAPE_TYPES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => { setShapeType(s.id); setShowShapePicker(false); setActiveTool("shape"); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${shapeType === s.id ? (isDark ? "bg-white/[0.1] text-white" : "bg-black/[0.06] text-gray-900") : (isDark ? "text-gray-400 hover:bg-white/[0.06]" : "text-gray-500 hover:bg-black/[0.03]")}`}
                      >
                        {s.icon}
                        <span className="font-medium">{s.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Text tool */}
              <button onClick={() => setActiveTool("text")} title="Text" className={tbtn(activeTool === "text")}>
                <Type className="h-4 w-4" />
              </button>

              {/* Image */}
              <button onClick={() => imageInputRef.current?.click()} title="Insert image" className={tbtn(false)}>
                <ImagePlus className="h-4 w-4" />
              </button>
              <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />

              <div className={sep} />

              {/* Undo/Redo/Clear */}
              <div className={pillGroup}>
                <button onClick={handleUndo} disabled={elements.length === 0} title="Undo" className={actionBtn(elements.length === 0)}>
                  <Undo2 className="h-3.5 w-3.5" />
                </button>
                <button onClick={handleRedo} disabled={redoStack.length === 0} title="Redo" className={actionBtn(redoStack.length === 0)}>
                  <Redo2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <button onClick={handleClear} disabled={elements.length === 0} title="Clear" className={`p-1.5 rounded-xl transition-colors ${elements.length === 0 ? "opacity-20 pointer-events-none" : ""} ${isDark ? "text-gray-400 hover:text-red-400 hover:bg-red-500/10" : "text-gray-500 hover:text-red-600 hover:bg-red-50"}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Row 2: Size + Colors */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 ${isDark ? "border-t border-white/[0.04]" : "border-t border-black/[0.04]"}`}>
              {/* Size picker */}
              <div className="relative">
                <button
                  onClick={() => { setShowSizePicker((s) => !s); setShowShapePicker(false); setShowBgPicker(false); }}
                  title="Stroke size"
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${isDark ? "text-gray-400 hover:text-gray-200 hover:bg-white/[0.06]" : "text-gray-500 hover:text-gray-800 hover:bg-black/[0.04]"}`}
                >
                  <div className="rounded-full" style={{ width: Math.max(4, size * 1.5), height: Math.max(4, size * 1.5), backgroundColor: isDark ? "#e2e8f0" : "#1a1a2e" }} />
                  <span className="text-[11px] font-medium">{SIZES.find((s) => s.value === size)?.label ?? "Custom"}</span>
                </button>
                {showSizePicker && (
                  <div className={`absolute left-0 rounded-xl border p-1.5 z-30 min-w-[130px] shadow-xl backdrop-blur-xl ${popoverUp ? "bottom-full mb-2" : "top-full mt-2"} ${isDark ? "bg-[#1e1e2e]/95 border-white/[0.08]" : "bg-white/95 border-black/[0.08]"}`}>
                    {SIZES.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => { setSize(s.value); setShowSizePicker(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${size === s.value ? (isDark ? "bg-white/[0.1] text-white" : "bg-black/[0.06] text-gray-900") : (isDark ? "text-gray-400 hover:bg-white/[0.06]" : "text-gray-500 hover:bg-black/[0.03]")}`}
                      >
                        <div className="rounded-full shrink-0" style={{ width: Math.max(3, s.value * 1.2), height: Math.max(3, s.value * 1.2), backgroundColor: isDark ? "#e2e8f0" : "#1a1a2e" }} />
                        <span className="font-medium">{s.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className={sep} />

              {/* Colors */}
              <div className="flex items-center gap-[5px]">
                {colors.map((c) => {
                  const isActive = color === c.value;
                  return (
                    <button key={c.value} onClick={() => setColor(c.value)} title={c.label} className="relative flex items-center justify-center">
                      {isActive && (
                        <div className="absolute rounded-full animate-in zoom-in-75 duration-150" style={{ width: 20, height: 20, border: `2px solid ${c.value}`, opacity: 0.4 }} />
                      )}
                      <div
                        className={`rounded-full transition-all duration-150 h-[13px] w-[13px] ${!isActive ? "hover:scale-125" : ""}`}
                        style={{
                          backgroundColor: c.value,
                          boxShadow: !isDark && c.value === "#ffffff" ? "inset 0 0 0 1px rgba(0,0,0,0.12)" : isDark ? "0 0 0 0.5px rgba(255,255,255,0.1)" : undefined,
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          );
        })() : (() => {
          // Show the active tool icon, colored with chosen color for draw tools
          const isDrawTool = ["pen", "pencil", "highlighter", "eraser"].includes(activeTool);
          const iconColor = isDrawTool && activeTool !== "eraser" ? color : undefined;
          const toolIcon = (() => {
            switch (activeTool) {
              case "pen": return <Pen className="h-5 w-5" />;
              case "pencil": return <Pencil className="h-5 w-5" />;
              case "highlighter": return <Highlighter className="h-5 w-5" />;
              case "eraser": return <Eraser className="h-5 w-5" />;
              case "hand": return <Hand className="h-5 w-5" />;
              case "shape": return SHAPE_TYPES.find((s) => s.id === shapeType)?.icon ?? <Square className="h-5 w-5" />;
              case "text": return <Type className="h-5 w-5" />;
              case "image": return <ImagePlus className="h-5 w-5" />;
              default: return <PenLine className="h-5 w-5" />;
            }
          })();

          return (
            <button
              ref={penRef}
              onPointerDown={handlePenDragStart}
              title="Show toolbar (drag to move)"
              className={`absolute z-30 flex items-center justify-center h-12 w-12 rounded-full shadow-xl cursor-grab active:cursor-grabbing touch-none select-none ${
                isDark
                  ? "bg-[#232336] border border-white/[0.10] hover:bg-[#2a2a40]"
                  : "bg-white border border-black/[0.08] hover:bg-gray-50"
              }`}
              style={{
                left: penPos?.x ?? 16,
                top: penPos?.y ?? 12,
                color: iconColor ?? (isDark ? "#e2e8f0" : "#374151"),
                boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.5)" : "0 4px 20px rgba(0,0,0,0.12)",
              }}
            >
              {toolIcon}
            </button>
          );
        })()}

        {/* ── Corner controls (always visible, fixed) ── */}
        <div
          className={`absolute top-2 right-2 z-20 flex items-center gap-0.5 rounded-xl p-0.5 backdrop-blur-xl shadow-lg ${
            isDark ? "bg-[#16161e]/80 border border-white/[0.06]" : "bg-white/80 border border-black/[0.06]"
          }`}
        >
          {/* Background picker */}
          <div className="relative">
            <button
              onClick={() => { setShowBgPicker((b) => !b); setShowSizePicker(false); setShowShapePicker(false); }}
              title="Background"
              className={cornerBtn}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </button>
            {showBgPicker && (
              <div className={`absolute top-full right-0 mt-2 rounded-xl border p-1.5 z-30 min-w-[120px] shadow-xl backdrop-blur-xl ${isDark ? "bg-[#1e1e2e]/95 border-white/[0.08]" : "bg-white/95 border-black/[0.08]"}`}>
                {BG_OPTIONS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => { setBackground(b.id); setShowBgPicker(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${background === b.id ? (isDark ? "bg-white/[0.1] text-white" : "bg-black/[0.06] text-gray-900") : (isDark ? "text-gray-400 hover:bg-white/[0.06]" : "text-gray-500 hover:bg-black/[0.03]")}`}
                  >
                    <span className="font-medium">{b.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mode toggle */}
          <button
            onClick={() => {
              setCanvasMode((m) => (m === "infinite" ? "pages" : "infinite"));
              setCamera({ x: 0, y: 0, zoom: 1 });
            }}
            title={canvasMode === "infinite" ? "Switch to pages" : "Switch to infinite"}
            className={cornerBtn}
          >
            {canvasMode === "infinite" ? <FileStack className="h-3.5 w-3.5" /> : <Infinity className="h-3.5 w-3.5" />}
          </button>

          {/* Theme */}
          <button
            onClick={handleThemeToggle}
            title={isDark ? "Light canvas" : "Dark canvas"}
            className={cornerBtn}
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Scroll to top (infinite mode only) */}
        {camera.y !== 0 && canvasMode === "infinite" && (
          <button
            onClick={resetView}
            title="Scroll to top"
            className={`absolute bottom-3 right-3 flex items-center gap-1.5 rounded-xl px-3 py-1.5 backdrop-blur-xl shadow-lg z-10 text-[11px] font-medium transition-colors ${
              isDark ? "bg-[#16161e]/90 border border-white/[0.06] text-gray-300 hover:bg-white/[0.08]" : "bg-white/90 border border-black/[0.06] text-gray-600 hover:bg-black/[0.04]"
            }`}
          >
            ↑ Top
          </button>
        )}

        {/* ── Page strip (pages mode, floating at bottom) ── */}
        {canvasMode === "pages" && (
          <div
            className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-2 rounded-2xl backdrop-blur-xl shadow-lg overflow-x-auto max-w-[90%] ${
              isDark ? "bg-[#16161e]/85 border border-white/[0.06]" : "bg-white/85 border border-black/[0.06]"
            }`}
          >
            <button
              onClick={() => setActivePageIndex((i) => Math.max(0, i - 1))}
              disabled={activePageIndex === 0}
              className={actionBtn(activePageIndex === 0)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            {pages.map((page, i) => (
              <div
                key={page.id}
                role="button"
                tabIndex={0}
                onClick={() => setActivePageIndex(i)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setActivePageIndex(i); }}
                className={`relative group flex items-center justify-center rounded-lg border transition-all shrink-0 cursor-pointer ${
                  i === activePageIndex
                    ? isDark
                      ? "border-primary bg-white/[0.08] shadow-sm"
                      : "border-primary bg-primary/5 shadow-sm"
                    : isDark
                      ? "border-white/[0.06] hover:border-white/[0.12] bg-white/[0.03]"
                      : "border-black/[0.06] hover:border-black/[0.12] bg-white"
                }`}
                style={{ width: 36, height: 46 }}
              >
                <span className={`text-[10px] font-semibold ${i === activePageIndex ? "text-primary" : isDark ? "text-gray-500" : "text-gray-400"}`}>
                  {i + 1}
                </span>
                {pages.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deletePage(i); }}
                    className={`absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
                      isDark ? "bg-red-500/80 text-white" : "bg-red-500 text-white"
                    }`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={addPage}
              title="Add page"
              className={`flex items-center justify-center rounded-lg border border-dashed shrink-0 transition-colors ${
                isDark
                  ? "border-white/[0.08] text-gray-500 hover:border-white/[0.15] hover:text-gray-300"
                  : "border-black/[0.1] text-gray-400 hover:border-black/[0.2] hover:text-gray-600"
              }`}
              style={{ width: 36, height: 46 }}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => setActivePageIndex((i) => Math.min(pages.length - 1, i + 1))}
              disabled={activePageIndex === pages.length - 1}
              className={actionBtn(activePageIndex === pages.length - 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>

            <span className={`ml-1 text-[11px] font-medium tabular-nums whitespace-nowrap ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              {activePageIndex + 1}/{pages.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
