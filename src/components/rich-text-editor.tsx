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
import Youtube from "@tiptap/extension-youtube";
import Details from "@tiptap/extension-details";
import DetailsSummary from "@tiptap/extension-details-summary";
import DetailsContent from "@tiptap/extension-details-content";
import { common, createLowlight } from "lowlight";

// ── Icons ──
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
} from "lucide-react";

const lowlight = createLowlight(common);

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

interface RichTextEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
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
  { label: "Default", value: "" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Mono", value: "ui-monospace, monospace" },
  { label: "Cursive", value: "'Segoe Script', cursive" },
];

function FontFamilyMenu({
  editor,
  onClose,
}: {
  editor: ReturnType<typeof useEditor>;
  onClose: () => void;
}) {
  if (!editor) return null;
  const item =
    "w-full text-left text-sm px-3 py-1.5 rounded-md hover:bg-accent";

  return (
    <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-lg shadow-lg p-1 min-w-[140px]">
      {FONT_FAMILIES.map((f) => (
        <button
          key={f.value || "default"}
          onClick={() => {
            f.value
              ? editor.chain().focus().setFontFamily(f.value).run()
              : editor.chain().focus().unsetFontFamily().run();
            onClose();
          }}
          className={item}
          style={{ fontFamily: f.value || undefined }}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// Main Editor
// ═══════════════════════════════════════════

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  function RichTextEditor(
    { content = "", onChange, placeholder = "Start writing your notes..." },
    ref,
  ) {
    // Popover states
    const [pop, setPop] = useState<string | null>(null);
    const closePop = useCallback(() => setPop(null), []);
    const togglePop = useCallback(
      (name: string) => setPop((p) => (p === name ? null : name)),
      [],
    );

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
        Youtube.configure({
          HTMLAttributes: {
            class: "rounded-lg overflow-hidden my-3",
          },
          width: 640,
          height: 360,
        }),
        Details.configure({
          HTMLAttributes: { class: "details-node" },
        }),
        DetailsSummary,
        DetailsContent,

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
            <TBtn
              onClick={() => togglePop("font")}
              isActive={pop === "font"}
              title="Font Family"
            >
              <Type className={I} />
              <ChevronDown className="h-3 w-3 ml-0.5 -mr-0.5" />
            </TBtn>
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
        <div className="flex-1 overflow-y-auto" onClick={closePop}>
          <EditorContent editor={editor} className="h-full [&_.tiptap]:py-4 [&_.tiptap]:px-2" />
        </div>

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
