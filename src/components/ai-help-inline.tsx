"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  Send,
  X,
  Square,
  Trash2,
  Quote,
  ArrowDownToLine,
  RotateCcw,
  ChevronDown,
  Minimize2,
  Maximize2,
  FileText,
  Zap,
  CaseSensitive,
  Pencil,
  Check,
} from "lucide-react";
import { streamAIResponse } from "@/lib/ai-stream";

const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);
const modKey = isMac ? "⌘" : "Ctrl+";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const REFINE_PRESETS = [
  { id: "shorter", label: "Make shorter", icon: Minimize2 },
  { id: "longer", label: "Make longer", icon: Maximize2 },
  { id: "simpler", label: "Simplify", icon: Zap },
  { id: "detailed", label: "More detailed", icon: FileText },
  { id: "formal", label: "More formal", icon: CaseSensitive },
] as const;

const REFINE_PROMPTS: Record<string, string> = {
  shorter: "Make the previous response more concise. Keep all key information but reduce verbosity.",
  longer: "Expand the previous response with more detail, examples, and explanations.",
  simpler: "Simplify the previous response. Use simpler language and break down complex concepts.",
  detailed: "Add more technical depth, edge cases, and nuance to the previous response.",
  formal: "Rewrite the previous response in a more formal, academic tone.",
};

interface AIHelpInlineProps {
  hierarchy: {
    goal?: string | null;
    subject?: string | null;
    topic?: string | null;
    subtopic?: string | null;
  };
  currentNotesHtml: string;
  initialPrompt?: string;
  selectedText?: string;
  onApprove: (html: string) => void;
  onClose: () => void;
}

export function AIHelpInline({
  hierarchy,
  currentNotesHtml,
  initialPrompt,
  selectedText,
  onApprove,
  onClose,
}: AIHelpInlineProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRefineMenu, setShowRefineMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);
  const refineMenuRef = useRef<HTMLDivElement>(null);
  messagesRef.current = messages;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Close refine menu on outside click
  useEffect(() => {
    if (!showRefineMenu) return;
    const handler = (e: MouseEvent) => {
      if (refineMenuRef.current && !refineMenuRef.current.contains(e.target as Node)) {
        setShowRefineMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showRefineMenu]);

  const sendMessageWithText = useCallback(
    async (text: string, prevMessages?: ChatMessage[]) => {
      if (!text || isStreaming) return;

      setError(null);
      setShowRefineMenu(false);

      const baseMsgs = prevMessages ?? messagesRef.current;
      const userMessage: ChatMessage = { role: "user", content: text };
      const newMessages = [...baseMsgs, userMessage];
      setMessages(newMessages);
      setInput("");
      setIsStreaming(true);

      const assistantMessage: ChatMessage = { role: "assistant", content: "" };
      setMessages([...newMessages, assistantMessage]);

      const abortController = new AbortController();
      abortRef.current = abortController;

      await streamAIResponse(
        "/ai/help",
        {
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          hierarchy: {
            goal: hierarchy.goal || null,
            subject: hierarchy.subject || null,
            topic: hierarchy.topic || null,
            subtopic: hierarchy.subtopic || null,
          },
          current_notes_html: currentNotesHtml,
          ...(selectedText ? { selected_text: selectedText } : {}),
        },
        (chunk) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === "assistant") {
              updated[updated.length - 1] = { ...last, content: last.content + chunk };
            }
            return updated;
          });
        },
        () => {
          setIsStreaming(false);
          abortRef.current = null;
        },
        (errMsg) => {
          setError(errMsg);
          setIsStreaming(false);
          abortRef.current = null;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last.role === "assistant" && !last.content) return prev.slice(0, -1);
            return prev;
          });
        },
        abortController.signal,
      );
    },
    [isStreaming, hierarchy, currentNotesHtml, selectedText],
  );

  const sendMessage = useCallback(() => {
    sendMessageWithText(input.trim());
  }, [input, sendMessageWithText]);

  const hasSentInitial = useRef(false);
  useEffect(() => {
    if (hasSentInitial.current) return;
    if (initialPrompt) {
      hasSentInitial.current = true;
      sendMessageWithText(initialPrompt, []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    abortRef.current = null;
  }, []);

  const clearChat = useCallback(() => {
    if (isStreaming) return;
    setMessages([]);
    setError(null);
    setShowRefineMenu(false);
    setIsEditing(false);
    setEditedContent("");
    inputRef.current?.focus();
  }, [isStreaming]);

  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant" && m.content);

  const handleApprove = useCallback(() => {
    if (lastAssistantMessage) onApprove(lastAssistantMessage.content);
  }, [lastAssistantMessage, onApprove]);

  // Regenerate: resend the last user message
  const handleTryAgain = useCallback(() => {
    if (isStreaming || messages.length < 2) return;
    // Find last user message
    const lastUserIdx = messages.map((m) => m.role).lastIndexOf("user");
    if (lastUserIdx === -1) return;
    const lastUserMsg = messages[lastUserIdx].content;
    // Remove everything from lastUserIdx onward and resend
    const prevMessages = messages.slice(0, lastUserIdx);
    sendMessageWithText(lastUserMsg, prevMessages);
  }, [isStreaming, messages, sendMessageWithText]);

  // Discard last AI response
  const handleDiscard = useCallback(() => {
    if (isStreaming) return;
    // Remove the last assistant message (and the user message that triggered it)
    const lastAssistantIdx = messages.map((m) => m.role).lastIndexOf("assistant");
    if (lastAssistantIdx === -1) return;
    const newMessages = messages.slice(0, lastAssistantIdx > 0 ? lastAssistantIdx - 1 : 0);
    setMessages(newMessages);
    setShowRefineMenu(false);
    if (newMessages.length === 0) inputRef.current?.focus();
  }, [isStreaming, messages]);

  // Enter edit mode
  const enterEditMode = useCallback(() => {
    if (!lastAssistantMessage) return;
    setEditedContent(lastAssistantMessage.content);
    setIsEditing(true);
    setShowRefineMenu(false);
    setTimeout(() => {
      const ta = editTextareaRef.current;
      if (ta) {
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
      }
    }, 50);
  }, [lastAssistantMessage]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditedContent("");
  }, []);

  // Approve edited content directly
  const approveEdited = useCallback(() => {
    if (editedContent.trim()) {
      onApprove(editedContent);
    }
  }, [editedContent, onApprove]);

  // Send edited content back to AI for refinement
  const sendEditedToAI = useCallback(() => {
    if (!editedContent.trim()) return;
    setIsEditing(false);
    const prompt = `The user has edited your previous response. Here is their edited version:\n\n${editedContent}\n\nPlease refine and improve this based on the user's edits. Return the improved version.`;
    setEditedContent("");
    sendMessageWithText(prompt);
  }, [editedContent, sendMessageWithText]);

  // Refine with a preset prompt
  const handleRefinePreset = useCallback(
    (presetId: string) => {
      const prompt = REFINE_PROMPTS[presetId];
      if (prompt) {
        setShowRefineMenu(false);
        sendMessageWithText(prompt);
      }
    },
    [sendMessageWithText],
  );

  // Hierarchy breadcrumb
  const contextParts = [hierarchy.goal, hierarchy.subject, hierarchy.topic, hierarchy.subtopic].filter(Boolean);

  const showActionBar = !!lastAssistantMessage && !isStreaming && !isEditing;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Chat container */}
      <div
        className="fixed z-50 top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[min(720px,92vw)] max-h-[88vh] rounded-2xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-2xl shadow-primary/5 overflow-hidden animate-in slide-in-from-bottom-3 fade-in-0 duration-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">AI Help</div>
              {contextParts.length > 0 && (
                <div className="text-[10px] text-muted-foreground truncate max-w-[300px]">
                  {contextParts.join(" › ")}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && !isStreaming && (
              <button
                onClick={clearChat}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Clear chat"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Selected text context */}
        {selectedText && (
          <div className="mx-4 mt-3 mb-1 flex gap-2 items-start shrink-0">
            <div className="shrink-0 mt-0.5">
              <Quote className="h-3.5 w-3.5 text-muted-foreground/60" />
            </div>
            <div
              className="text-xs text-muted-foreground bg-muted/60 rounded-lg px-3 py-2 border border-border/40 max-h-[120px] overflow-y-auto leading-relaxed prose prose-xs dark:prose-invert max-w-none [&_p]:my-0.5 [&_ul]:my-0.5 [&_ol]:my-0.5 [&_li]:my-0 [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs"
              dangerouslySetInnerHTML={{ __html: selectedText }}
            />
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 ? (
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scroll-smooth min-h-0">
            {messages.map((msg, i) => {
              const isLastAssistant = msg.role === "assistant" && msg.content && lastAssistantMessage === msg;

              return (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "user" ? (
                  <div className="max-w-[85%] bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed shadow-sm">
                    {msg.content}
                  </div>
                ) : (
                  <div className="max-w-[95%] w-full">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Sparkles className="h-3 w-3 text-primary/70" />
                      <span className="text-[10px] font-medium text-primary/70 uppercase tracking-wider">AI</span>
                    </div>
                    {msg.content ? (
                      isLastAssistant && isEditing ? (
                        /* Edit mode: textarea with raw HTML */
                        <div className="space-y-2">
                          <textarea
                            ref={editTextareaRef}
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="w-full text-sm bg-background border-2 border-primary/40 rounded-2xl rounded-tl-md px-4 py-3 outline-none focus:border-primary/60 resize-y min-h-[120px] max-h-[50vh] font-mono leading-relaxed transition-colors"
                            rows={Math.min(20, editedContent.split("\n").length + 2)}
                          />
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={approveEdited}
                              disabled={!editedContent.trim()}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-sm disabled:opacity-40"
                            >
                              <Check className="h-3 w-3" />
                              Insert as edited
                            </button>
                            <button
                              onClick={sendEditedToAI}
                              disabled={!editedContent.trim()}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm disabled:opacity-40"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Send to AI
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted border border-border/40 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                      <div
                        className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none bg-muted/40 rounded-2xl rounded-tl-md px-4 py-3 border border-border/30 leading-relaxed [&_pre]:bg-background [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:border [&_pre]:border-border/40 [&_pre]:overflow-x-auto [&_code]:text-xs [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_ul]:my-1.5 [&_ul]:pl-5 [&_ol]:my-1.5 [&_ol]:pl-5 [&_li]:my-0.5 [&_p]:my-1.5 [&_blockquote]:border-primary/30 [&_blockquote]:bg-primary/5 [&_blockquote]:rounded-r-lg [&_blockquote]:py-2 [&_blockquote]:px-3 [&_table]:text-xs [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_th]:bg-muted/60 [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_th]:border [&_th]:border-border/50 [&_td]:px-3 [&_td]:py-1.5 [&_td]:border [&_td]:border-border/50 [&_tr:nth-child(even)]:bg-muted/20 [&_hr]:my-3 [&_hr]:border-border/40 [&_strong]:font-semibold [&_em]:italic"
                        dangerouslySetInnerHTML={{ __html: msg.content }}
                      />
                      )
                    ) : (
                      <div className="bg-muted/40 rounded-2xl rounded-tl-md px-4 py-3 border border-border/30">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="flex gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-bounce [animation-delay:0ms]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-bounce [animation-delay:150ms]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-bounce [animation-delay:300ms]" />
                          </div>
                          Thinking...
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })}
            {isStreaming && messages[messages.length - 1]?.content && (
              <div className="flex items-center gap-2">
                <button
                  onClick={stopStreaming}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted border border-border/40 transition-colors"
                >
                  <Square className="h-3 w-3 fill-current" />
                  Stop
                </button>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        ) : (
          /* Empty state */
          <div className="px-6 py-8">
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 mb-3">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Ask AI to help with your notes
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                e.g. &quot;Explain deadlocks with examples&quot;
              </p>
            </div>

            {/* Tips */}
            <div className="max-w-[320px] mx-auto space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">Ways to use AI</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground/80">
                <kbd className="shrink-0 px-1.5 py-0.5 rounded bg-muted border border-border/60 text-[10px] font-mono min-w-[38px] text-center">{modKey}J</kbd>
                <span>Open AI help from anywhere in the editor</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground/80">
                <kbd className="shrink-0 px-1.5 py-0.5 rounded bg-muted border border-border/60 text-[10px] font-mono min-w-[38px] text-center">/ai</kbd>
                <span>Type in editor to pick a command</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground/80">
                <div className="shrink-0 min-w-[38px] text-center text-[10px] text-muted-foreground/60">✦</div>
                <span>Select text, then press <kbd className="px-1 py-px rounded bg-muted border border-border/60 text-[10px] font-mono">{modKey}J</kbd> to ask about it</span>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-lg text-xs text-destructive bg-destructive/10 border border-destructive/20">
            {error}
          </div>
        )}

        {/* Action bar: Insert / Try Again / Refine / Discard */}
        {showActionBar && (
          <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border/40 bg-muted/10 flex-wrap">
            {/* Primary: Insert into Notes */}
            <button
              onClick={handleApprove}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-sm shadow-emerald-600/20"
            >
              <ArrowDownToLine className="h-3.5 w-3.5" />
              Insert into Notes
            </button>

            {/* Refine dropdown */}
            <div className="relative" ref={refineMenuRef}>
              <button
                onClick={() => setShowRefineMenu((p) => !p)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-border/50 bg-background text-foreground hover:bg-muted transition-colors"
              >
                Refine
                <ChevronDown className={`h-3 w-3 transition-transform ${showRefineMenu ? "rotate-180" : ""}`} />
              </button>
              {showRefineMenu && (
                <div className="absolute bottom-full left-0 mb-1.5 bg-popover border border-border rounded-xl shadow-xl py-1 min-w-[180px] animate-in fade-in-0 zoom-in-95 duration-100 z-10">
                  {REFINE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleRefinePreset(preset.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                    >
                      <preset.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Try Again */}
            <button
              onClick={handleTryAgain}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-border/50 bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Regenerate response"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Try again
            </button>

            {/* Edit */}
            <button
              onClick={enterEditMode}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-border/50 bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Edit the response"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>

            {/* Discard */}
            <button
              onClick={handleDiscard}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ml-auto"
              title="Discard this response"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Discard
            </button>
          </div>
        )}

        {/* Input (hidden during edit mode) */}
        {!isEditing && (
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border/40 bg-muted/20">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
              if (e.key === "Escape") onClose();
            }}
            placeholder={
              showActionBar
                ? "Tell AI how to refine this response..."
                : messages.length === 0
                  ? "What do you want to learn about?"
                  : "Ask a follow-up..."
            }
            disabled={isStreaming}
            className="flex-1 text-sm bg-background border border-border/60 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 disabled:opacity-40 placeholder:text-muted-foreground/50 transition-shadow"
          />
          {isStreaming ? (
            <button
              onClick={stopStreaming}
              className="shrink-0 p-2.5 rounded-xl text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
              title="Stop generating"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="shrink-0 p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
              title="Send (Enter)"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
        )}
      </div>
    </>
  );
}
