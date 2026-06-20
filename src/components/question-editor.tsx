"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Plus,
  Trash2,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  Tag,
  X,
  Maximize2,
  Minimize2,
  FileText,
  Pencil,
  FolderOpen,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Subscript as SubIcon,
  Superscript as SuperIcon,
  Code,
  ImageIcon,
  Highlighter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor, RichTextEditorRef } from "@/components/rich-text-editor";
import { MiniEditor, MiniEditorRef } from "@/components/mini-editor";
import { SketchBoard } from "@/components/sketchboard";
import { FileManager } from "@/components/file-manager";
import { Question, QuestionType, DifficultyLevel } from "@/types";
import type { Editor } from "@tiptap/react";

// ── Constants ──

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "SINGLE_MCQ", label: "Single MCQ" },
  { value: "MULTI_MCQ", label: "Multi MCQ" },
  { value: "NUMERICAL", label: "Numerical" },
  { value: "TRUE_FALSE", label: "True / False" },
  { value: "SUBJECTIVE", label: "Subjective" },
];

const DIFFICULTY_LEVELS: { value: DifficultyLevel; label: string; className: string }[] = [
  { value: "EASY", label: "Easy", className: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" },
  { value: "MEDIUM", label: "Medium", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400" },
  { value: "HARD", label: "Hard", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" },
];

// ── Types ──

interface OptionData {
  id?: string;
  text_html: string;
  is_correct: boolean;
  order: number;
}

export interface QuestionFormData {
  question_type: QuestionType;
  text_html: string;
  explanation_html: string | null;
  explanation_sketch: string | null;
  difficulty: DifficultyLevel;
  marks: number;
  negative_marks: number;
  numerical_answer: number | null;
  numerical_tolerance: number | null;
  answer_html: string | null;
  is_pyq: boolean;
  tags: string[];
  options: OptionData[];
}

interface QuestionEditorProps {
  question?: Question;
  onSave: (data: QuestionFormData) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

type ExplanationTab = "text" | "sketch" | "files";

function getInitialForm(question?: Question): QuestionFormData {
  if (question) {
    return {
      question_type: question.question_type,
      text_html: question.text_html,
      explanation_html: question.explanation_html,
      explanation_sketch: null,
      difficulty: question.difficulty,
      marks: question.marks,
      negative_marks: question.negative_marks,
      numerical_answer: question.numerical_answer,
      numerical_tolerance: question.numerical_tolerance,
      answer_html: question.answer_html,
      is_pyq: question.is_pyq,
      tags: [...question.tags],
      options: question.options.map((o) => ({
        id: o.id,
        text_html: o.text_html,
        is_correct: o.is_correct,
        order: o.order,
      })),
    };
  }
  return {
    question_type: "SINGLE_MCQ",
    text_html: "",
    explanation_html: null,
    explanation_sketch: null,
    difficulty: "MEDIUM",
    marks: 1,
    negative_marks: 0,
    numerical_answer: null,
    numerical_tolerance: 0,
    answer_html: null,
    is_pyq: false,
    tags: [],
    options: [
      { text_html: "", is_correct: false, order: 0 },
      { text_html: "", is_correct: false, order: 1 },
      { text_html: "", is_correct: false, order: 2 },
      { text_html: "", is_correct: false, order: 3 },
    ],
  };
}

// ── Fullscreen overlay ──

function FullscreenOverlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2 shrink-0">
        <span className="text-sm font-medium">{title}</span>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <Minimize2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

// ── Shared mini-toolbar for option editors ──

function OptionToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) {
    return (
      <div className="flex items-center gap-0.5 px-2 py-1 border-b bg-muted/30 text-muted-foreground text-xs">
        <span className="italic">Click an option to format it</span>
      </div>
    );
  }

  const I = "h-3.5 w-3.5";
  const btn = (active: boolean) =>
    `h-6 w-6 rounded flex items-center justify-center transition-colors ${
      active
        ? "bg-accent text-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-accent"
    }`;

  return (
    <div className="flex items-center gap-0.5 px-2 py-1 border-b bg-muted/30">
      <button className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
        <Bold className={I} />
      </button>
      <button className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
        <Italic className={I} />
      </button>
      <button className={btn(editor.isActive("underline"))} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
        <UnderlineIcon className={I} />
      </button>
      <button className={btn(editor.isActive("strike"))} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
        <Strikethrough className={I} />
      </button>
      <div className="w-px h-4 bg-border mx-0.5" />
      <button className={btn(editor.isActive("code"))} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline Code">
        <Code className={I} />
      </button>
      <button className={btn(editor.isActive("subscript"))} onClick={() => editor.chain().focus().toggleSubscript().run()} title="Subscript">
        <SubIcon className={I} />
      </button>
      <button className={btn(editor.isActive("superscript"))} onClick={() => editor.chain().focus().toggleSuperscript().run()} title="Superscript">
        <SuperIcon className={I} />
      </button>
      <button className={btn(editor.isActive("highlight"))} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Highlight">
        <Highlighter className={I} />
      </button>
      <div className="w-px h-4 bg-border mx-0.5" />
      <button
        className={btn(false)}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/*";
          input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              editor
                .chain()
                .insertContentAt(editor.state.selection.anchor, {
                  type: "image",
                  attrs: { src: reader.result, width: 25 },
                })
                .focus()
                .run();
            };
            reader.readAsDataURL(file);
          };
          input.click();
        }}
        title="Insert Image"
      >
        <ImageIcon className={I} />
      </button>
    </div>
  );
}

// ── Explanation content ──

function ExplanationContent({
  form,
  setForm,
  explanationTab,
  setExplanationTab,
  explanationEditorRef,
  explainTabs,
  fullHeight,
}: {
  form: QuestionFormData;
  setForm: React.Dispatch<React.SetStateAction<QuestionFormData>>;
  explanationTab: ExplanationTab;
  setExplanationTab: (tab: ExplanationTab) => void;
  explanationEditorRef: React.RefObject<RichTextEditorRef | null>;
  explainTabs: { id: ExplanationTab; label: string; icon: React.ReactNode }[];
  fullHeight?: boolean;
}) {
  return (
    <div className={`border rounded-lg overflow-hidden flex flex-col ${fullHeight ? "flex-1" : ""}`}>
      <div className="flex items-center gap-0.5 border-b bg-muted/30 px-2 py-1 shrink-0">
        {explainTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setExplanationTab(tab.id)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              explanationTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      <div className={`${fullHeight ? "flex-1 overflow-hidden" : ""} ${explanationTab === "text" ? "" : "hidden"}`}>
        <RichTextEditor
          ref={explanationEditorRef}
          content={form.explanation_html || ""}
          onChange={(html) => setForm((prev) => ({ ...prev, explanation_html: html }))}
          placeholder="Explain the solution..."
        />
      </div>
      {explanationTab === "sketch" && (
        <div className={fullHeight ? "flex-1" : "h-[400px]"}>
          <SketchBoard
            initialData={form.explanation_sketch || undefined}
            onChange={(data) => setForm((prev) => ({ ...prev, explanation_sketch: data }))}
          />
        </div>
      )}
      {explanationTab === "files" && (
        <div className={`p-4 ${fullHeight ? "flex-1 overflow-y-auto" : ""}`}>
          <FileManager />
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════

export function QuestionEditor({ question, onSave, onCancel, saving }: QuestionEditorProps) {
  const [form, setForm] = useState<QuestionFormData>(() => getInitialForm(question));
  const [showExplanation, setShowExplanation] = useState(!!question?.explanation_html);
  const [explanationTab, setExplanationTab] = useState<ExplanationTab>("text");
  const [explanationFullscreen, setExplanationFullscreen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [focusedOptionIdx, setFocusedOptionIdx] = useState<number | null>(null);
  // Force re-render when option editor selection changes so toolbar stays in sync
  const [, forceUpdate] = useState(0);

  const questionEditorRef = useRef<RichTextEditorRef>(null);
  const explanationEditorRef = useRef<RichTextEditorRef>(null);
  const answerEditorRef = useRef<RichTextEditorRef>(null);
  const optionEditorRefs = useRef<(MiniEditorRef | null)[]>([]);

  const isMCQ = form.question_type === "SINGLE_MCQ" || form.question_type === "MULTI_MCQ";
  const isTrueFalse = form.question_type === "TRUE_FALSE";
  const isNumerical = form.question_type === "NUMERICAL";
  const isSubjective = form.question_type === "SUBJECTIVE";

  // Get focused option's tiptap editor for the shared toolbar
  const focusedOptionEditor =
    focusedOptionIdx !== null ? optionEditorRefs.current[focusedOptionIdx]?.getEditor() ?? null : null;

  // Subscribe to focused editor's transaction for toolbar reactivity
  useEffect(() => {
    if (!focusedOptionEditor) return;
    const handler = () => forceUpdate((n) => n + 1);
    focusedOptionEditor.on("transaction", handler);
    return () => {
      focusedOptionEditor.off("transaction", handler);
    };
  }, [focusedOptionEditor]);

  const handleTypeChange = (type: QuestionType) => {
    const newForm = { ...form, question_type: type };
    if (type === "TRUE_FALSE") {
      newForm.options = [
        { text_html: "<p>True</p>", is_correct: false, order: 0 },
        { text_html: "<p>False</p>", is_correct: false, order: 1 },
      ];
    } else if (type === "SINGLE_MCQ" || type === "MULTI_MCQ") {
      if (form.options.length < 2) {
        newForm.options = [
          { text_html: "", is_correct: false, order: 0 },
          { text_html: "", is_correct: false, order: 1 },
          { text_html: "", is_correct: false, order: 2 },
          { text_html: "", is_correct: false, order: 3 },
        ];
      }
    }
    setForm(newForm);
  };

  const toggleOptionCorrect = (index: number) => {
    setForm((prev) => {
      const options = prev.options.map((o, i) => {
        if (prev.question_type === "SINGLE_MCQ" || prev.question_type === "TRUE_FALSE") {
          return { ...o, is_correct: i === index };
        }
        if (i === index) return { ...o, is_correct: !o.is_correct };
        return o;
      });
      return { ...prev, options };
    });
  };

  const addOption = () => {
    setForm((prev) => ({
      ...prev,
      options: [...prev.options, { text_html: "", is_correct: false, order: prev.options.length }],
    }));
  };

  const removeOption = (index: number) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index).map((o, i) => ({ ...o, order: i })),
    }));
    if (focusedOptionIdx === index) setFocusedOptionIdx(null);
    else if (focusedOptionIdx !== null && focusedOptionIdx > index) {
      setFocusedOptionIdx(focusedOptionIdx - 1);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const handleSubmit = useCallback(async () => {
    const data: QuestionFormData = {
      ...form,
      text_html: questionEditorRef.current?.getHTML() || form.text_html,
      explanation_html: showExplanation
        ? explanationEditorRef.current?.getHTML() || form.explanation_html
        : null,
      answer_html: isSubjective
        ? answerEditorRef.current?.getHTML() || form.answer_html
        : null,
      options: (isMCQ || isTrueFalse)
        ? form.options.map((opt, i) => ({
            ...opt,
            text_html: optionEditorRefs.current[i]?.getHTML() || opt.text_html,
          }))
        : [],
    };
    await onSave(data);
  }, [form, showExplanation, isSubjective, isMCQ, isTrueFalse, onSave]);

  const explainTabs: { id: ExplanationTab; label: string; icon: React.ReactNode }[] = [
    { id: "text", label: "Text", icon: <FileText className="h-3 w-3" /> },
    { id: "sketch", label: "Sketch", icon: <Pencil className="h-3 w-3" /> },
    { id: "files", label: "Files", icon: <FolderOpen className="h-3 w-3" /> },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* ═══ TOP BAR — metadata in a compact strip ═══ */}
      <div className="flex items-center gap-3 px-1 pb-3 border-b mb-4 flex-wrap">
        {/* Question type */}
        <Select
          value={form.question_type}
          onValueChange={(v) => v && handleTypeChange(v as QuestionType)}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QUESTION_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Difficulty pills */}
        <div className="flex gap-0.5">
          {DIFFICULTY_LEVELS.map((d) => (
            <button
              key={d.value}
              onClick={() => setForm((prev) => ({ ...prev, difficulty: d.value }))}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                form.difficulty === d.value
                  ? `${d.className} border-current ring-1 ring-current/20`
                  : "border-border text-muted-foreground hover:border-foreground/20"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Marks */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Marks</span>
          <Input
            type="number" min={0} step={0.5} value={form.marks}
            onChange={(e) => setForm((prev) => ({ ...prev, marks: Number(e.target.value) }))}
            className="h-8 w-16 text-xs"
          />
          <span className="text-xs text-muted-foreground">-ve</span>
          <Input
            type="number" min={0} step={0.25} value={form.negative_marks}
            onChange={(e) => setForm((prev) => ({ ...prev, negative_marks: Number(e.target.value) }))}
            className="h-8 w-16 text-xs"
          />
        </div>

        <div className="w-px h-6 bg-border" />

        {/* PYQ toggle */}
        <button
          onClick={() => setForm((prev) => ({ ...prev, is_pyq: !prev.is_pyq }))}
          className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
            form.is_pyq
              ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400 border-current ring-1 ring-current/20"
              : "border-border text-muted-foreground hover:border-foreground/20"
          }`}
        >
          PYQ
        </button>
        {/* Tags */}
        {form.tags.map((tag) => (
          <Badge key={tag} variant="outline" className="text-[10px] gap-1 pr-1">
            {tag}
            <button onClick={() => removeTag(tag)} className="hover:text-destructive">
              <X className="h-2.5 w-2.5" />
            </button>
          </Badge>
        ))}
        <div className="flex items-center gap-1">
          <Input
            placeholder="+ tag"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            className="h-7 w-20 text-xs"
          />
        </div>

        {/* Spacer + Actions */}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={saving} className="h-8 text-xs">
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving} className="h-8 text-xs gap-1.5">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {question ? "Update" : "Save Question"}
          </Button>
        </div>
      </div>

      {/* ═══ MAIN CONTENT — full width, scrollable ═══ */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-1">
        {/* Question Body */}
        <div className="border rounded-lg overflow-hidden">
          <RichTextEditor
            ref={questionEditorRef}
            content={form.text_html}
            onChange={(html) => setForm((prev) => ({ ...prev, text_html: html }))}
            placeholder="Write your question here..."
          />
        </div>

        {/* ── Options (MCQ / True-False) ── */}
        {(isMCQ || isTrueFalse) && (
          <div className="space-y-0">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium">
                Options
                <span className="font-normal text-muted-foreground ml-1">
                  {form.question_type === "SINGLE_MCQ" && "— click letter to mark correct"}
                  {form.question_type === "MULTI_MCQ" && "— click to toggle correct"}
                </span>
              </Label>
              {isMCQ && (
                <button onClick={addOption} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                  <Plus className="h-3 w-3" /> Add
                </button>
              )}
            </div>

            {/* Shared toolbar for whichever option is focused */}
            <div className="border rounded-t-lg overflow-hidden">
              <OptionToolbar editor={focusedOptionEditor} />
            </div>

            {/* Option rows — compact, no individual toolbars */}
            <div className="border border-t-0 rounded-b-lg overflow-hidden divide-y">
              {form.options.map((opt, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-0 transition-colors ${
                    focusedOptionIdx === i ? "bg-accent/30" : ""
                  }`}
                >
                  {/* Letter + correct toggle */}
                  <button
                    onClick={() => toggleOptionCorrect(i)}
                    className={`w-10 shrink-0 flex items-center justify-center self-stretch border-r transition-all ${
                      opt.is_correct
                        ? "bg-green-500 text-white"
                        : "text-muted-foreground hover:bg-accent"
                    }`}
                    title={opt.is_correct ? "Correct" : "Mark correct"}
                  >
                    {opt.is_correct ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span className="text-xs font-semibold">{String.fromCharCode(65 + i)}</span>
                    )}
                  </button>

                  {/* Mini editor — no toolbar, just content */}
                  <div className="flex-1 min-w-0">
                    <MiniEditor
                      ref={(el) => { optionEditorRefs.current[i] = el; }}
                      content={opt.text_html}
                      onChange={(html) => {
                        setForm((prev) => ({
                          ...prev,
                          options: prev.options.map((o, j) => j === i ? { ...o, text_html: html } : o),
                        }));
                      }}
                      onFocus={() => setFocusedOptionIdx(i)}
                      placeholder={isTrueFalse ? "" : `Option ${String.fromCharCode(65 + i)}...`}
                    />
                  </div>

                  {/* Remove button */}
                  {isMCQ && form.options.length > 2 && (
                    <button
                      onClick={() => removeOption(i)}
                      className="w-9 shrink-0 flex items-center justify-center self-stretch text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/30 border-l transition-colors"
                      title="Remove option"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Numerical Answer ── */}
        {isNumerical && (
          <div className="flex items-center gap-4 rounded-lg border p-4">
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Answer</Label>
              <Input
                type="number" step="any"
                value={form.numerical_answer ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    numerical_answer: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                className="h-9 text-sm"
                placeholder="e.g. 3.14"
              />
            </div>
            <div className="space-y-1 w-32">
              <Label className="text-xs">Tolerance (±)</Label>
              <Input
                type="number" step="any" min={0}
                value={form.numerical_tolerance ?? 0}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    numerical_tolerance: Number(e.target.value),
                  }))
                }
                className="h-9 text-sm"
                placeholder="0.01"
              />
            </div>
          </div>
        )}

        {/* ── Subjective Answer ── */}
        {isSubjective && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Model Answer</Label>
            <div className="border rounded-lg overflow-hidden">
              <RichTextEditor
                ref={answerEditorRef}
                content={form.answer_html || ""}
                onChange={(html) => setForm((prev) => ({ ...prev, answer_html: html }))}
                placeholder="Write the model answer here..."
              />
            </div>
          </div>
        )}

        {/* ── Explanation / Solution ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {showExplanation ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              Explanation / Solution
            </button>
            {showExplanation && (
              <button
                onClick={() => setExplanationFullscreen(true)}
                className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Fullscreen"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {showExplanation && !explanationFullscreen && (
            <ExplanationContent
              form={form}
              setForm={setForm}
              explanationTab={explanationTab}
              setExplanationTab={setExplanationTab}
              explanationEditorRef={explanationEditorRef}
              explainTabs={explainTabs}
            />
          )}
          {explanationFullscreen && (
            <FullscreenOverlay
              title="Explanation / Solution"
              onClose={() => setExplanationFullscreen(false)}
            >
              <div className="h-full flex flex-col">
                <ExplanationContent
                  form={form}
                  setForm={setForm}
                  explanationTab={explanationTab}
                  setExplanationTab={setExplanationTab}
                  explanationEditorRef={explanationEditorRef}
                  explainTabs={explainTabs}
                  fullHeight
                />
              </div>
            </FullscreenOverlay>
          )}
        </div>
      </div>
    </div>
  );
}
