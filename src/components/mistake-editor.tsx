"use client";

import { useState, useRef } from "react";
import { X, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Mistake, MistakeType } from "@/types";

const MISTAKE_TYPE_OPTIONS: { value: MistakeType; label: string }[] = [
  { value: "CONCEPTUAL", label: "Conceptual" },
  { value: "SILLY", label: "Silly" },
  { value: "CALCULATION", label: "Calculation" },
  { value: "MISREAD", label: "Misread" },
  { value: "TIME_PRESSURE", label: "Time Pressure" },
  { value: "OTHER", label: "Other" },
];

interface MistakeEditorProps {
  mistake?: Mistake;
  questionId?: string | null;
  onSave: (data: {
    question_id?: string | null;
    mistake_type: string;
    description_html: string;
    correction_html?: string | null;
    tags: string[];
  }) => void;
  onCancel: () => void;
  saving?: boolean;
}

export function MistakeEditor({
  mistake,
  questionId,
  onSave,
  onCancel,
  saving,
}: MistakeEditorProps) {
  const [mistakeType, setMistakeType] = useState<MistakeType>(
    mistake?.mistake_type || "OTHER"
  );
  const [descriptionHtml, setDescriptionHtml] = useState(
    mistake?.description_html || ""
  );
  const [correctionHtml, setCorrectionHtml] = useState(
    mistake?.correction_html || ""
  );
  const [tags, setTags] = useState<string[]>(mistake?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [showCorrection, setShowCorrection] = useState(!!mistake?.correction_html);

  const tagInputRef = useRef<HTMLInputElement>(null);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput("");
  };

  const handleSave = () => {
    if (!descriptionHtml.trim() || descriptionHtml === "<p></p>") return;
    onSave({
      question_id: questionId ?? mistake?.question_id ?? null,
      mistake_type: mistakeType,
      description_html: descriptionHtml,
      correction_html: showCorrection ? correctionHtml || null : null,
      tags,
    });
  };

  return (
    <div className="space-y-4">
      {/* Top row: type + tags */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0">Type</Label>
          <Select value={mistakeType} onValueChange={(v) => v && setMistakeType(v as MistakeType)}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MISTAKE_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
              {tag}
              <button onClick={() => setTags(tags.filter((t) => t !== tag))}>
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
          <Input
            ref={tagInputRef}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addTag(); }
            }}
            placeholder="Add tag..."
            className="h-6 w-20 text-[10px] px-1.5 border-dashed"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Save
          </Button>
        </div>
      </div>

      {/* Description editor */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">What went wrong?</Label>
        <div className="border rounded-lg overflow-hidden">
          <RichTextEditor
            content={descriptionHtml}
            onChange={setDescriptionHtml}
            placeholder="Describe the mistake..."
          />
        </div>
      </div>

      {/* Correction editor (toggleable) */}
      {!showCorrection ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1.5 text-muted-foreground"
          onClick={() => setShowCorrection(true)}
        >
          <Plus className="h-3 w-3" />
          Add correction / correct approach
        </Button>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Correct approach</Label>
            <Button
              variant="ghost"
              size="xs"
              className="text-[10px] text-muted-foreground"
              onClick={() => { setShowCorrection(false); setCorrectionHtml(""); }}
            >
              Remove
            </Button>
          </div>
          <div className="border rounded-lg overflow-hidden border-dashed">
            <RichTextEditor
              content={correctionHtml}
              onChange={setCorrectionHtml}
              placeholder="Write the correct approach..."
            />
          </div>
        </div>
      )}
    </div>
  );
}
