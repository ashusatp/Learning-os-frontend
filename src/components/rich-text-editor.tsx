"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";

// ── Core ──
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Focus from "@tiptap/extension-focus";
import Typography from "@tiptap/extension-typography";
import FileHandler from "@tiptap/extension-file-handler";

// ── Marks ──
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import FontFamily from "@tiptap/extension-font-family";
import { FontSize } from "@tiptap/extension-text-style/font-size";

// ── Nodes ──
import { ResizableImage } from "@/components/resizable-image-ext";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { ResizableYoutube } from "@/components/resizable-youtube-ext";
import Details from "@tiptap/extension-details";
import DetailsSummary from "@tiptap/extension-details-summary";
import DetailsContent from "@tiptap/extension-details-content";
import { common, createLowlight } from "lowlight";

// ── Icons ──
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { DOMSerializer } from "@tiptap/pm/model";
import { AIHelpInline } from "@/components/ai-help-inline";
import { AISlashDropdown, type SlashCommand } from "@/components/ai-slash-dropdown";

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  List,
  ListOrdered,
  ListChecks,
  Code,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Minus,
  Link as LinkIcon,
  Unlink,
  ImageIcon,
  TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  Palette,
  CodeSquare,
  Columns3,
  RowsIcon,
  Trash2,
  Check,
  X,
  ChevronDown,
  Video as YoutubeIcon,
  Upload,
  Type,
  AArrowUp,
  AArrowDown,
  Sparkles,
} from "lucide-react";

const lowlight = createLowlight(common);

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

interface AIHierarchy {
  goal?: string | null;
  subject?: string | null;
  topic?: string | null;
  subtopic?: string | null;
}

interface RichTextEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  aiEnabled?: boolean;
  aiHierarchy?: AIHierarchy;
}

export interface RichTextEditorRef {
  getHTML: () => string;
  getJSON: () => Record<string, unknown>;
}

// ═══════════════════════════════════════════
// Shared UI atoms
// ═══════════════════════════════════════════

function TBtn({
  onClick,
  isActive,
  disabled,
  children,
  title,
  className = "",
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        isActive
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function TSep() {
  return <div className="w-px h-5 bg-border mx-0.5 shrink-0" />;
}

const I = "h-4 w-4"; // icon size class
const IB = "h-3.5 w-3.5"; // bubble icon size

// ═══════════════════════════════════════════
// Popover components
// ═══════════════════════════════════════════

// ── Color Picker ──

const TEXT_COLORS = [
  { label: "Default", value: "" },
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Green", value: "#22c55e" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Purple", value: "#a855f7" },
  { label: "Pink", value: "#ec4899" },
  { label: "Gray", value: "#6b7280" },
  { label: "White", value: "#ffffff" },
];

const HIGHLIGHT_COLORS = [
  { label: "None", value: "" },
  { label: "Yellow", value: "#fef08a" },
  { label: "Green", value: "#bbf7d0" },
  { label: "Blue", value: "#bfdbfe" },
  { label: "Purple", value: "#e9d5ff" },
  { label: "Pink", value: "#fce7f3" },
  { label: "Orange", value: "#fed7aa" },
  { label: "Red", value: "#fecaca" },
];

function ColorPicker({
  editor,
  onClose,
}: {
  editor: ReturnType<typeof useEditor>;
  onClose: () => void;
}) {
  if (!editor) return null;
  return (
    <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-lg shadow-lg p-2.5 min-w-[180px] space-y-2">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Text color
      </p>
      <div className="grid grid-cols-6 gap-1">
        {TEXT_COLORS.map((c) => (
          <button
            key={c.value || "default"}
            title={c.label}
            onClick={() => {
              c.value
                ? editor.chain().focus().setColor(c.value).run()
                : editor.chain().focus().unsetColor().run();
              onClose();
            }}
            className="h-6 w-6 rounded-md border border-border hover:scale-110 transition-transform flex items-center justify-center"
            style={{ backgroundColor: c.value || undefined }}
          >
            {!c.value && (
              <span className="text-[10px] font-bold text-muted-foreground">
                A
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pt-1">
        Highlight
      </p>
      <div className="grid grid-cols-4 gap-1">
        {HIGHLIGHT_COLORS.map((c) => (
          <button
            key={c.value || "none"}
            title={c.label}
            onClick={() => {
              c.value
                ? editor.chain().focus().toggleHighlight({ color: c.value }).run()
                : editor.chain().focus().unsetHighlight().run();
              onClose();
            }}
            className="h-6 w-full rounded-md border border-border hover:scale-105 transition-transform text-[9px] font-medium"
            style={{ backgroundColor: c.value || undefined }}
          >
            {!c.value ? "╳" : ""}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Font Size Picker ──

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];

function FontSizePicker({
  editor,
  onClose,
}: {
  editor: ReturnType<typeof useEditor>;
  onClose: () => void;
}) {
  if (!editor) return null;

  const currentSize = editor.getAttributes("textStyle")?.fontSize;
  const currentNum = currentSize ? parseInt(currentSize, 10) : null;

  return (
    <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-lg shadow-lg p-2 min-w-[120px] space-y-1">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
        Font size
      </p>
      <button
        onClick={() => {
          editor.chain().focus().unsetFontSize().run();
          onClose();
        }}
        className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-accent transition-colors ${
          !currentNum ? "bg-primary/10 text-primary font-medium" : "text-foreground"
        }`}
      >
        Default
      </button>
      <div className="grid grid-cols-3 gap-0.5">
        {FONT_SIZES.map((size) => (
          <button
            key={size}
            onClick={() => {
              editor.chain().focus().setFontSize(`${size}px`).run();
              onClose();
            }}
            className={`px-2 py-1 text-xs rounded text-center hover:bg-accent transition-colors ${
              currentNum === size
                ? "bg-primary/10 text-primary font-medium"
                : "text-foreground"
            }`}
          >
            {size}px
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Link Input ──

function LinkInput({
  editor,
  onClose,
}: {
  editor: ReturnType<typeof useEditor>;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(editor?.getAttributes("link").href || "");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);

  const submit = () => {
    if (!editor) return;
    if (url.trim()) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url.trim() })
        .run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    onClose();
  };

  return (
    <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-lg shadow-lg p-2 flex items-center gap-1.5 min-w-[300px]">
      <input
        ref={ref}
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onClose();
        }}
        placeholder="https://example.com"
        className="flex-1 text-sm bg-transparent border rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
      />
      <button
        onClick={submit}
        className="p-1 rounded-md hover:bg-accent text-green-600"
      >
        <Check className={I} />
      </button>
      <button
        onClick={onClose}
        className="p-1 rounded-md hover:bg-accent text-muted-foreground"
      >
        <X className={I} />
      </button>
    </div>
  );
}

// ── Image Input (URL + file) ──

function ImageInput({
  editor,
  onClose,
}: {
  editor: ReturnType<typeof useEditor>;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const urlRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => urlRef.current?.focus(), []);

  const submitUrl = () => {
    if (!editor || !url.trim()) return;
    editor.chain().focus().setImage({ src: url.trim(), width: 25 } as any).run();
    onClose();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editor) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      editor
        .chain()
        .focus()
        .setImage({ src: reader.result as string, width: 25 } as any)
        .run();
      onClose();
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-lg shadow-lg p-2.5 min-w-[300px] space-y-2">
      <div className="flex items-center gap-1.5">
        <input
          ref={urlRef}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitUrl();
            if (e.key === "Escape") onClose();
          }}
          placeholder="Paste image URL..."
          className="flex-1 text-sm bg-transparent border rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={submitUrl}
          className="p-1 rounded-md hover:bg-accent text-green-600"
        >
          <Check className={I} />
        </button>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-accent text-muted-foreground"
        >
          <X className={I} />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] text-muted-foreground uppercase">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      <button
        onClick={() => fileRef.current?.click()}
        className="w-full text-sm text-center px-3 py-2 rounded-md border border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30 transition-colors text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
      >
        <Upload className="h-3.5 w-3.5" /> Choose from device
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
}

// ── YouTube Input ──

function YoutubeInput({
  editor,
  onClose,
}: {
  editor: ReturnType<typeof useEditor>;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);

  const submit = () => {
    if (!editor || !url.trim()) return;
    editor.commands.setYoutubeVideo({ src: url.trim() });
    onClose();
  };

  return (
    <div className="absolute top-full right-0 mt-1 z-50 bg-popover border rounded-lg shadow-lg p-2 flex items-center gap-1.5 min-w-[320px]">
      <input
        ref={ref}
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onClose();
        }}
        placeholder="Paste YouTube URL..."
        className="flex-1 text-sm bg-transparent border rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
      />
      <button
        onClick={submit}
        className="p-1 rounded-md hover:bg-accent text-green-600"
      >
        <Check className={I} />
      </button>
      <button
        onClick={onClose}
        className="p-1 rounded-md hover:bg-accent text-muted-foreground"
      >
        <X className={I} />
      </button>
    </div>
  );
}

// ── Table Menu ──

function TableMenu({
  editor,
  onClose,
}: {
  editor: ReturnType<typeof useEditor>;
  onClose: () => void;
}) {
  if (!editor) return null;
  const inTable = editor.isActive("table");
  const item =
    "w-full text-left text-sm px-3 py-1.5 rounded-md hover:bg-accent flex items-center gap-2";

  return (
    <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-lg shadow-lg p-1 min-w-[170px]">
      {!inTable ? (
        <button
          onClick={() => {
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run();
            onClose();
          }}
          className={item}
        >
          <TableIcon className={IB} /> Insert 3×3 Table
        </button>
      ) : (
        <>
          <button
            onClick={() => {
              editor.chain().focus().addColumnAfter().run();
              onClose();
            }}
            className={item}
          >
            <Columns3 className={IB} /> Add Column
          </button>
          <button
            onClick={() => {
              editor.chain().focus().addRowAfter().run();
              onClose();
            }}
            className={item}
          >
            <RowsIcon className={IB} /> Add Row
          </button>
          <button
            onClick={() => {
              editor.chain().focus().deleteColumn().run();
              onClose();
            }}
            className={`${item} text-destructive`}
          >
            <Columns3 className={IB} /> Delete Column
          </button>
          <button
            onClick={() => {
              editor.chain().focus().deleteRow().run();
              onClose();
            }}
            className={`${item} text-destructive`}
          >
            <RowsIcon className={IB} /> Delete Row
          </button>
          <div className="h-px bg-border my-1" />
          <button
            onClick={() => {
              editor.chain().focus().deleteTable().run();
              onClose();
            }}
            className={`${item} text-destructive`}
          >
            <Trash2 className={IB} /> Delete Table
          </button>
        </>
      )}
    </div>
  );
}

// ── Font Family Dropdown ──

const FONT_FAMILIES = [
  { label: "Default (Sans)", value: "" },
  { label: "Inter", value: "'Inter', sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Garamond", value: "'Garamond', serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Fira Code", value: "'Fira Code', monospace" },
  { label: "Comic Sans", value: "'Comic Sans MS', cursive" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Verdana", value: "'Verdana', sans-serif" },
  { label: "Palatino", value: "'Palatino Linotype', serif" },
];

function FontFamilyMenu({
  editor,
  onClose,
}: {
  editor: ReturnType<typeof useEditor>;
  onClose: () => void;
}) {
  if (!editor) return null;
  const currentFont = editor.getAttributes("textStyle")?.fontFamily || "";

  return (
    <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-lg shadow-lg p-1 min-w-[200px] max-h-[300px] overflow-y-auto">
      {FONT_FAMILIES.map((f) => {
        const isActive = f.value ? currentFont === f.value : !currentFont;
        return (
          <button
            key={f.value || "default"}
            onClick={() => {
              f.value
                ? editor.chain().focus().setFontFamily(f.value).run()
                : editor.chain().focus().unsetFontFamily().run();
              onClose();
            }}
            className={`w-full text-left text-sm px-3 py-1.5 rounded-md hover:bg-accent transition-colors ${
              isActive ? "bg-primary/10 text-primary font-medium" : ""
            }`}
            style={{ fontFamily: f.value || undefined }}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════
// Main Editor
// ═══════════════════════════════════════════

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  function RichTextEditor(
    { content = "", onChange, placeholder = "Start writing your notes...", aiEnabled = false, aiHierarchy },
    ref,
  ) {
    // Popover states
    const [pop, setPop] = useState<string | null>(null);
    // AI state
    const [showAIHelp, setShowAIHelp] = useState(false);
    const [aiInsertPos, setAiInsertPos] = useState<number | null>(null);
    const [aiInitialPrompt, setAiInitialPrompt] = useState<string | undefined>();
    const [aiSelectedText, setAiSelectedText] = useState<string | undefined>();
    const [aiChatCoords, setAiChatCoords] = useState<{ top: number; left: number; width: number } | null>(null);
    const editorWrapperRef = useRef<HTMLDivElement>(null);
    const [slashDropdown, setSlashDropdown] = useState<{
      query: string;
      coords: { top: number; left: number };
      triggerStart: number;
    } | null>(null);

    const closePop = useCallback(() => setPop(null), []);
    const togglePop = useCallback(
      (name: string) => setPop((p) => (p === name ? null : name)),
      [],
    );

    // Refs for ProseMirror plugin (stable across renders)
    const aiEnabledRef = useRef(aiEnabled);
    aiEnabledRef.current = aiEnabled;

    const slashCallbackRef = useRef<{
      onSlashUpdate: (query: string, coords: { top: number; left: number }, triggerStart: number) => void;
      onSlashClose: () => void;
    }>({
      onSlashUpdate: () => {},
      onSlashClose: () => {},
    });

    slashCallbackRef.current.onSlashUpdate = useCallback(
      (query: string, coords: { top: number; left: number }, triggerStart: number) => {
        setSlashDropdown((prev) => {
          if (
            prev &&
            prev.query === query &&
            prev.triggerStart === triggerStart &&
            Math.abs(prev.coords.top - coords.top) < 1 &&
            Math.abs(prev.coords.left - coords.left) < 1
          ) {
            return prev; // no change, prevent re-render
          }
          return { query, coords, triggerStart };
        });
      },
      [],
    );

    slashCallbackRef.current.onSlashClose = useCallback(() => {
      setSlashDropdown((prev) => (prev === null ? prev : null));
    }, []);

    // Get AI chat position relative to editor scroll container
    const getAIChatCoords = useCallback((docPos: number) => {
      const ed = editorRef.current;
      const wrapper = editorWrapperRef.current;
      if (!ed || !wrapper) return null;
      const coords = ed.view.coordsAtPos(docPos);
      const wrapperRect = wrapper.getBoundingClientRect();
      return {
        top: coords.bottom - wrapperRect.top + wrapper.scrollTop + 4,
        left: 0,
        width: wrapperRect.width,
      };
    }, []);

    // Open AI chat helper
    const openAIChat = useCallback((pos: number, prompt?: string, selected?: string) => {
      setAiInsertPos(pos);
      setAiInitialPrompt(prompt);
      setAiSelectedText(selected);
      setAiChatCoords(getAIChatCoords(pos));
      setShowAIHelp(true);
    }, [getAIChatCoords]);

    // Handle slash command selection
    const handleSlashCommandSelect = useCallback(
      (cmd: SlashCommand) => {
        if (!slashDropdown) return;
        const editorInstance = editorRef.current;
        if (editorInstance) {
          const { state } = editorInstance.view;
          const $from = state.selection.$from;
          const tr = state.tr.delete(slashDropdown.triggerStart, $from.pos);
          editorInstance.view.dispatch(tr);
        }
        setSlashDropdown(null);

        const pos = slashDropdown.triggerStart;
        const promptMap: Record<string, string | undefined> = {
          "ai-help": undefined,
          "ai-ask": undefined,
          "ai-explain": "Explain this topic in detail with clear definitions and key points.",
          "ai-example": "Provide detailed examples with explanations for this topic.",
          "ai-summarize": "Summarize the current notes concisely with key points, formulas, and important definitions.",
        };
        openAIChat(pos, promptMap[cmd.id]);
      },
      [slashDropdown, openAIChat],
    );

    // "Ask AI" from bubble menu (selected text)
    const handleAskAISelection = useCallback(() => {
      const ed = editorRef.current;
      if (!ed) return;
      const { state } = ed.view;
      const { from, to } = state.selection;
      const text = state.doc.textBetween(from, to, " ");
      if (!text.trim()) return;
      // Capture selected content as HTML for rich display
      const slice = state.doc.slice(from, to);
      const tempDiv = document.createElement("div");
      const serializer = DOMSerializer.fromSchema(state.schema);
      const fragment = serializer.serializeFragment(slice.content);
      tempDiv.appendChild(fragment);
      const selectedHtml = tempDiv.innerHTML;
      openAIChat(to, undefined, selectedHtml || text);
    }, [openAIChat]);

    // Editor ref for accessing from callbacks
    const editorRef = useRef<ReturnType<typeof useEditor>>(null);

    // AI slash-detection ProseMirror plugin
    const aiSlashExtension = useRef(
      Extension.create({
        name: "aiSlashDetector",
        addProseMirrorPlugins() {
          const enabledRef = aiEnabledRef;
          const cbRef = slashCallbackRef;
          return [
            new Plugin({
              key: new PluginKey("aiSlashDetector"),
              props: {
                handleKeyDown(view, event) {
                  if (!enabledRef.current) return false;

                  // Close dropdown on Escape
                  if (event.key === "Escape") {
                    cbRef.current.onSlashClose();
                    return false;
                  }

                  // Let the dropdown handle Enter/Arrow keys
                  return false;
                },
              },
              view() {
                return {
                  update(view) {
                    if (!enabledRef.current) return;

                    const { state } = view;
                    const { $from } = state.selection;

                    // Only in empty selections (cursor, not range)
                    if (!state.selection.empty) {
                      cbRef.current.onSlashClose();
                      return;
                    }

                    const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
                    const match = textBefore.match(/\/ai([\w-]*)$/);

                    if (!match) {
                      cbRef.current.onSlashClose();
                      return;
                    }

                    // Get cursor coordinates for dropdown positioning
                    const coords = view.coordsAtPos($from.pos);
                    const editorRect = view.dom.getBoundingClientRect();
                    const triggerStart = $from.pos - match[0].length;

                    cbRef.current.onSlashUpdate(
                      match[1] || "", // query after "/ai"
                      {
                        top: coords.bottom + 4,
                        left: Math.max(coords.left, editorRect.left),
                      },
                      triggerStart,
                    );
                  },
                };
              },
            }),
          ];
        },
      }),
    ).current;

    const editor = useEditor({
      extensions: [
        // ── Core (StarterKit bundles many) ──
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          codeBlock: false, // replaced by lowlight version
          dropcursor: { color: "var(--primary)", width: 2 },
        }),
        Placeholder.configure({ placeholder }),
        CharacterCount,
        Focus.configure({ className: "has-focus", mode: "deepest" }),
        Typography,

        // ── Marks ──
        Underline,
        Highlight.configure({ multicolor: true }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { class: "text-primary underline cursor-pointer" },
        }),
        TextStyle,
        Color,
        Subscript,
        Superscript,
        FontFamily,
        FontSize,

        // ── Nodes ──
        ResizableImage.configure({
          inline: true,
        }),
        Table.configure({ resizable: true }),
        TableRow,
        TableCell,
        TableHeader,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        TaskList,
        TaskItem.configure({ nested: true }),
        CodeBlockLowlight.configure({ lowlight }),
        ResizableYoutube.configure({
          HTMLAttributes: {
            class: "rounded-lg overflow-hidden my-3",
          },
        }),
        Details.configure({
          HTMLAttributes: { class: "details-node" },
        }),
        DetailsSummary,
        DetailsContent,

        // ── AI Help trigger (always loaded, checks aiEnabled ref internally) ──
        aiSlashExtension,

        // ── Functionality ──
        FileHandler.configure({
          allowedMimeTypes: [
            "image/png",
            "image/jpeg",
            "image/gif",
            "image/webp",
            "image/svg+xml",
          ],
          onDrop: (currentEditor, files, pos) => {
            files.forEach((file) => {
              const reader = new FileReader();
              reader.onload = () => {
                currentEditor
                  .chain()
                  .insertContentAt(pos, {
                    type: "image",
                    attrs: { src: reader.result, width: 25 },
                  })
                  .focus()
                  .run();
              };
              reader.readAsDataURL(file);
            });
          },
          onPaste: (currentEditor, files) => {
            files.forEach((file) => {
              const reader = new FileReader();
              reader.onload = () => {
                currentEditor
                  .chain()
                  .insertContentAt(currentEditor.state.selection.anchor, {
                    type: "image",
                    attrs: { src: reader.result, width: 25 },
                  })
                  .focus()
                  .run();
              };
              reader.readAsDataURL(file);
            });
          },
        }),
      ],
      content,
      immediatelyRender: true,
      onUpdate: ({ editor: e }) => {
        onChange?.(e.getHTML());
      },
      editorProps: {
        attributes: {
          class:
            "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-5 py-4",
        },
      },
    });

    // Force re-render on selection/transaction changes so toolbar stays in sync
    const [, forceUpdate] = useState(0);
    useEffect(() => {
      if (!editor) return;
      const handler = () => forceUpdate((n) => n + 1);
      editor.on("selectionUpdate", handler);
      editor.on("transaction", handler);
      return () => {
        editor.off("selectionUpdate", handler);
        editor.off("transaction", handler);
      };
    }, [editor]);

    // Keep editor ref in sync for AI callbacks
    editorRef.current = editor;

    useImperativeHandle(ref, () => ({
      getHTML: () => editor?.getHTML() || "",
      getJSON: () => (editor?.getJSON() as Record<string, unknown>) || {},
    }));

    if (!editor) return null;

    const chars = editor.storage.characterCount.characters();
    const words = editor.storage.characterCount.words();
    const inTable = editor.isActive("table");

    return (
      <div className="flex flex-col h-full border rounded-lg bg-background overflow-hidden">
        {/* ═══ Toolbar ═══ */}
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b bg-muted/30 flex-wrap shrink-0">
          {/* Undo / Redo */}
          <TBtn
            onClick={() => editor.chain().focus().undo().run()}
            title="Undo (Ctrl+Z)"
          >
            <Undo className={I} />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().redo().run()}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo className={I} />
          </TBtn>

          <TSep />

          {/* Font family */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => togglePop("font")}
              title="Font Family"
              className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-colors ${
                pop === "font"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Type className={I} />
              <span className="max-w-[80px] truncate hidden sm:inline">
                {(() => {
                  const cf = editor.getAttributes("textStyle")?.fontFamily || "";
                  const match = FONT_FAMILIES.find((f) => f.value === cf);
                  return match?.label || "Default";
                })()}
              </span>
              <ChevronDown className="h-3 w-3 -mr-0.5" />
            </button>
            {pop === "font" && (
              <FontFamilyMenu editor={editor} onClose={closePop} />
            )}
          </div>

          <TSep />

          {/* Headings */}
          <TBtn
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            isActive={editor.isActive("heading", { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className={I} />
          </TBtn>
          <TBtn
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            isActive={editor.isActive("heading", { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className={I} />
          </TBtn>
          <TBtn
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            isActive={editor.isActive("heading", { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className={I} />
          </TBtn>

          <TSep />

          {/* Inline formatting */}
          <TBtn
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            title="Bold (Ctrl+B)"
          >
            <Bold className={I} />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            title="Italic (Ctrl+I)"
          >
            <Italic className={I} />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive("underline")}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className={I} />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive("strike")}
            title="Strikethrough"
          >
            <Strikethrough className={I} />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive("code")}
            title="Inline Code"
          >
            <Code className={I} />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            isActive={editor.isActive("superscript")}
            title="Superscript"
          >
            <SuperscriptIcon className={I} />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            isActive={editor.isActive("subscript")}
            title="Subscript"
          >
            <SubscriptIcon className={I} />
          </TBtn>

          {/* Color + Highlight */}
          <div className="relative">
            <TBtn
              onClick={() => togglePop("color")}
              isActive={pop === "color"}
              title="Colors & Highlight"
            >
              <Palette className={I} />
            </TBtn>
            {pop === "color" && (
              <ColorPicker editor={editor} onClose={closePop} />
            )}
          </div>

          {/* Font Size */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => togglePop("fontSize")}
              title="Font Size"
              className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-colors ${
                pop === "fontSize"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <AArrowUp className={I} />
              <span className="tabular-nums hidden sm:inline">
                {editor.getAttributes("textStyle")?.fontSize || "16px"}
              </span>
              <ChevronDown className="h-3 w-3 -mr-0.5" />
            </button>
            {pop === "fontSize" && (
              <FontSizePicker editor={editor} onClose={closePop} />
            )}
          </div>

          <TSep />

          {/* Alignment */}
          <TBtn
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            isActive={editor.isActive({ textAlign: "left" })}
            title="Align Left"
          >
            <AlignLeft className={I} />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            isActive={editor.isActive({ textAlign: "center" })}
            title="Align Center"
          >
            <AlignCenter className={I} />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            isActive={editor.isActive({ textAlign: "right" })}
            title="Align Right"
          >
            <AlignRight className={I} />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            isActive={editor.isActive({ textAlign: "justify" })}
            title="Justify"
          >
            <AlignJustify className={I} />
          </TBtn>

          <TSep />

          {/* Lists */}
          <TBtn
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            title="Bullet List"
          >
            <List className={I} />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            title="Ordered List"
          >
            <ListOrdered className={I} />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive("taskList")}
            title="Task List"
          >
            <ListChecks className={I} />
          </TBtn>

          <TSep />

          {/* Block elements */}
          <TBtn
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive("blockquote")}
            title="Quote"
          >
            <Quote className={I} />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive("codeBlock")}
            title="Code Block"
          >
            <CodeSquare className={I} />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Divider"
          >
            <Minus className={I} />
          </TBtn>

          <TSep />

          {/* Link */}
          <div className="relative">
            <TBtn
              onClick={() => {
                if (editor.isActive("link")) {
                  editor.chain().focus().unsetLink().run();
                } else {
                  togglePop("link");
                }
              }}
              isActive={editor.isActive("link")}
              title={editor.isActive("link") ? "Remove Link" : "Insert Link"}
            >
              {editor.isActive("link") ? (
                <Unlink className={I} />
              ) : (
                <LinkIcon className={I} />
              )}
            </TBtn>
            {pop === "link" && (
              <LinkInput editor={editor} onClose={closePop} />
            )}
          </div>

          {/* Image */}
          <div className="relative">
            <TBtn
              onClick={() => togglePop("image")}
              title="Insert Image"
            >
              <ImageIcon className={I} />
            </TBtn>
            {pop === "image" && (
              <ImageInput editor={editor} onClose={closePop} />
            )}
          </div>

          {/* Table */}
          <div className="relative">
            <TBtn
              onClick={() => togglePop("table")}
              isActive={editor.isActive("table")}
              title="Table"
            >
              <TableIcon className={I} />
            </TBtn>
            {pop === "table" && (
              <TableMenu editor={editor} onClose={closePop} />
            )}
          </div>

          {/* YouTube */}
          <div className="relative">
            <TBtn
              onClick={() => togglePop("youtube")}
              title="Embed YouTube Video"
            >
              <YoutubeIcon className={I} />
            </TBtn>
            {pop === "youtube" && (
              <YoutubeInput editor={editor} onClose={closePop} />
            )}
          </div>

          {/* AI Help */}
          {aiEnabled && (
            <>
              <TSep />
              <TBtn
                onClick={() => {
                  if (showAIHelp) {
                    setShowAIHelp(false);
                    setAiChatCoords(null);
                    editor.commands.focus();
                  } else {
                    openAIChat(editor.state.selection.from);
                  }
                }}
                isActive={showAIHelp}
                title="AI Help (/ai-help)"
              >
                <Sparkles className={I} />
              </TBtn>
            </>
          )}
        </div>

        {/* ═══ Bubble Menu (on text selection) ═══ */}
        <BubbleMenu
          editor={editor}
          className="flex items-center gap-0.5 bg-popover border rounded-lg shadow-lg px-1.5 py-1"
        >
          <TBtn
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            title="Bold"
          >
            <Bold className={IB} />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            title="Italic"
          >
            <Italic className={IB} />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive("underline")}
            title="Underline"
          >
            <UnderlineIcon className={IB} />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive("strike")}
            title="Strikethrough"
          >
            <Strikethrough className={IB} />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            isActive={editor.isActive("highlight")}
            title="Highlight"
          >
            <Highlighter className={IB} />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive("code")}
            title="Code"
          >
            <Code className={IB} />
          </TBtn>
          <div className="w-px h-4 bg-border mx-0.5" />
          <TBtn
            onClick={() => {
              if (editor.isActive("link")) {
                editor.chain().focus().unsetLink().run();
              } else {
                const url = window.prompt("Enter URL:");
                if (url)
                  editor
                    .chain()
                    .focus()
                    .extendMarkRange("link")
                    .setLink({ href: url })
                    .run();
              }
            }}
            isActive={editor.isActive("link")}
            title="Link"
          >
            <LinkIcon className={IB} />
          </TBtn>
          {aiEnabled && (
            <>
              <div className="w-px h-4 bg-border mx-0.5" />
              <TBtn
                onClick={handleAskAISelection}
                title="Ask AI about selection"
              >
                <Sparkles className={IB} />
              </TBtn>
            </>
          )}
        </BubbleMenu>

        {/* ═══ Table controls bar (when cursor is in a table) ═══ */}
        {inTable && (
          <div className="flex items-center gap-0.5 px-3 py-1 border-b bg-accent/30 shrink-0 text-xs">
            <span className="text-muted-foreground font-medium mr-2">Table:</span>
            <TBtn
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              title="Add Column Before"
            >
              <span className="text-xs font-medium px-0.5">+Col←</span>
            </TBtn>
            <TBtn
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              title="Add Column After"
            >
              <span className="text-xs font-medium px-0.5">+Col→</span>
            </TBtn>
            <TBtn
              onClick={() => editor.chain().focus().addRowBefore().run()}
              title="Add Row Before"
            >
              <span className="text-xs font-medium px-0.5">+Row↑</span>
            </TBtn>
            <TBtn
              onClick={() => editor.chain().focus().addRowAfter().run()}
              title="Add Row After"
            >
              <span className="text-xs font-medium px-0.5">+Row↓</span>
            </TBtn>
            <TSep />
            <TBtn
              onClick={() => editor.chain().focus().deleteColumn().run()}
              title="Delete Column"
              className="text-destructive hover:text-destructive"
            >
              <Columns3 className={IB} />
            </TBtn>
            <TBtn
              onClick={() => editor.chain().focus().deleteRow().run()}
              title="Delete Row"
              className="text-destructive hover:text-destructive"
            >
              <RowsIcon className={IB} />
            </TBtn>
            <TBtn
              onClick={() => editor.chain().focus().toggleHeaderRow().run()}
              title="Toggle Header Row"
              isActive={editor.isActive("tableHeader")}
            >
              <span className="text-xs font-medium px-0.5">H</span>
            </TBtn>
            <TBtn
              onClick={() => editor.chain().focus().mergeCells().run()}
              title="Merge Cells"
            >
              <span className="text-xs font-medium px-0.5">Merge</span>
            </TBtn>
            <TBtn
              onClick={() => editor.chain().focus().splitCell().run()}
              title="Split Cell"
            >
              <span className="text-xs font-medium px-0.5">Split</span>
            </TBtn>
            <TSep />
            <TBtn
              onClick={() => editor.chain().focus().deleteTable().run()}
              title="Delete Table"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className={IB} />
            </TBtn>
          </div>
        )}

        {/* ═══ Editor Content ═══ */}
        <div ref={editorWrapperRef} className="flex-1 overflow-y-auto relative" onClick={closePop}>
          <EditorContent editor={editor} className="h-full [&_.tiptap]:py-4 [&_.tiptap]:px-2" />

          {/* ═══ AI Slash Command Dropdown ═══ */}
          {slashDropdown && aiEnabled && (
            <AISlashDropdown
              query={slashDropdown.query}
              coords={slashDropdown.coords}
              onSelect={handleSlashCommandSelect}
              onClose={() => setSlashDropdown(null)}
            />
          )}
        </div>

        {/* ═══ AI Help Inline Chat — fixed centered overlay ═══ */}
        {showAIHelp && aiEnabled && (
          <AIHelpInline
            key={`${aiInsertPos}-${aiInitialPrompt}-${aiSelectedText}`}
            hierarchy={aiHierarchy || {}}
            currentNotesHtml={editor.getHTML()}
            initialPrompt={aiInitialPrompt}
            selectedText={aiSelectedText}
            onApprove={(html) => {
              const pos = aiInsertPos ?? editor.state.doc.content.size;
              editor.chain().focus().insertContentAt(pos, html).run();
              setShowAIHelp(false);
              setAiInsertPos(null);
              setAiInitialPrompt(undefined);
              setAiSelectedText(undefined);
              setAiChatCoords(null);
            }}
            onClose={() => {
              setShowAIHelp(false);
              setAiInsertPos(null);
              setAiInitialPrompt(undefined);
              setAiSelectedText(undefined);
              setAiChatCoords(null);
              editor.commands.focus();
            }}
          />
        )}

        {/* ═══ Footer ═══ */}
        <div className="flex items-center justify-end gap-3 px-3 py-1 border-t bg-muted/20 text-[11px] text-muted-foreground select-none shrink-0">
          <span>
            {words} {words === 1 ? "word" : "words"}
          </span>
          <span>
            {chars} {chars === 1 ? "character" : "characters"}
          </span>
        </div>
      </div>
    );
  },
);
