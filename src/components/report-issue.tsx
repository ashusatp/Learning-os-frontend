"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { Bug, Send, X, ImagePlus, Film, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

const CATEGORIES = [
  { value: "bug", label: "Bug" },
  { value: "ui", label: "UI Issue" },
  { value: "feature", label: "Feature Request" },
  { value: "performance", label: "Performance" },
  { value: "other", label: "Other" },
];

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "video/mp4", "video/webm", "video/quicktime",
];

const MAX_FILES = 3;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export function ReportIssue() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("bug");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const reset = () => {
    setTitle("");
    setDescription("");
    setCategory("bug");
    setFiles([]);
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    setOpen(false);
    reset();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (e.target) e.target.value = "";

    const valid: File[] = [];
    for (const f of selected) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        setError(`"${f.name}" is not a supported format. Use images or videos.`);
        return;
      }
      if (f.size > MAX_FILE_SIZE) {
        setError(`"${f.name}" exceeds 20MB limit.`);
        return;
      }
      valid.push(f);
    }

    const total = files.length + valid.length;
    if (total > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} attachments allowed.`);
      return;
    }

    setError(null);
    setFiles((prev) => [...prev, ...valid]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Create stable object URLs and revoke on cleanup
  const previewUrls = useMemo(
    () => files.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : null)),
    [files],
  );
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => url && URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("category", category);
      formData.append("page_url", window.location.href);
      for (const file of files) {
        formData.append("files", file);
      }

      await api.post("/issues", formData);
      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch {
      setError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all"
        title="Report an issue"
      >
        <Bug className="h-5 w-5" />
      </button>

      {/* Modal */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          <div
            className="fixed z-50 top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[min(480px,92vw)] max-h-[90vh] rounded-2xl border border-border/60 bg-background shadow-2xl overflow-hidden animate-in slide-in-from-bottom-3 fade-in-0 duration-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-destructive/10">
                  <Bug className="h-3.5 w-3.5 text-destructive" />
                </div>
                <span className="text-sm font-semibold">Report an Issue</span>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {success ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm font-medium text-emerald-600">
                  Thanks for your feedback!
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  We&apos;ll look into it.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 overflow-y-auto">
                {/* Category */}
                <div className="flex gap-1.5 flex-wrap">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        category === cat.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 text-muted-foreground border-border/40 hover:bg-muted"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Title */}
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief summary of the issue"
                  maxLength={200}
                  required
                  className="w-full text-sm bg-background border border-border/60 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 placeholder:text-muted-foreground/50 transition-shadow"
                />

                {/* Description */}
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what happened, what you expected, and steps to reproduce..."
                  required
                  rows={4}
                  className="w-full text-sm bg-background border border-border/60 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 placeholder:text-muted-foreground/50 transition-shadow resize-none"
                />

                {/* Attachments */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={files.length >= MAX_FILES}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border/60 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-muted/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed w-full justify-center"
                  >
                    <ImagePlus className="h-4 w-4" />
                    <Film className="h-4 w-4" />
                    <span>Add screenshot or video ({files.length}/{MAX_FILES})</span>
                  </button>

                  {/* File previews */}
                  {files.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {files.map((file, i) => (
                        <div key={i} className="relative group">
                          {previewUrls[i] ? (
                            <img
                              src={previewUrls[i]!}
                              alt={file.name}
                              className="h-16 w-16 object-cover rounded-lg border border-border/40"
                            />
                          ) : (
                            <div className="h-16 w-16 rounded-lg border border-border/40 bg-muted/50 flex flex-col items-center justify-center">
                              <Film className="h-5 w-5 text-muted-foreground" />
                              <span className="text-[8px] text-muted-foreground mt-0.5 truncate max-w-[56px]">
                                {file.name.split(".").pop()?.toUpperCase()}
                              </span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeFile(i)}
                            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                          <span className="block text-[8px] text-muted-foreground/60 text-center mt-0.5 truncate max-w-[64px]">
                            {(file.size / 1024 / 1024).toFixed(1)}MB
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Page URL info */}
                <p className="text-[10px] text-muted-foreground/60">
                  Current page URL will be attached automatically.
                </p>

                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting || !title.trim() || !description.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="h-3.5 w-3.5" />
                  {submitting ? "Submitting..." : "Submit Issue"}
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </>
  );
}
