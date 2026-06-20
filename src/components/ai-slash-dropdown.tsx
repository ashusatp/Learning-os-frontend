"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Sparkles, MessageSquare, BookOpen, Lightbulb, CheckCircle } from "lucide-react";

export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const AI_COMMANDS: SlashCommand[] = [
  {
    id: "ai-help",
    label: "AI Help",
    description: "Ask AI to help write your notes",
    icon: <Sparkles className="h-4 w-4 text-violet-500" />,
  },
  {
    id: "ai-explain",
    label: "Explain",
    description: "Explain a concept in detail",
    icon: <BookOpen className="h-4 w-4 text-blue-500" />,
  },
  {
    id: "ai-example",
    label: "Give Examples",
    description: "Generate examples for a topic",
    icon: <Lightbulb className="h-4 w-4 text-amber-500" />,
  },
  {
    id: "ai-summarize",
    label: "Summarize",
    description: "Summarize content concisely",
    icon: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  },
  {
    id: "ai-ask",
    label: "Ask Anything",
    description: "Open chat to ask AI anything",
    icon: <MessageSquare className="h-4 w-4 text-cyan-500" />,
  },
];

interface AISlashDropdownProps {
  query: string; // text after "/ai" e.g. "" or "-he" or "-help"
  coords: { top: number; left: number };
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
}

export function AISlashDropdown({ query, coords, onSelect, onClose }: AISlashDropdownProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter commands based on query
  const filtered = AI_COMMANDS.filter((cmd) => {
    if (!query) return true;
    const q = query.replace(/^-/, "").toLowerCase();
    return (
      cmd.id.toLowerCase().includes(q) ||
      cmd.label.toLowerCase().includes(q)
    );
  });

  // Reset selection when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (filtered.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        onSelect(filtered[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [filtered, selectedIndex, onSelect, onClose],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [handleKeyDown]);

  if (filtered.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-[100] bg-popover border border-border rounded-xl shadow-xl py-1.5 min-w-[260px] max-w-[300px] animate-in fade-in-0 zoom-in-95 duration-100"
      style={{ top: coords.top, left: coords.left }}
    >
      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        AI Commands
      </div>
      {filtered.map((cmd, i) => (
        <button
          key={cmd.id}
          onClick={() => onSelect(cmd)}
          onMouseEnter={() => setSelectedIndex(i)}
          className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
            i === selectedIndex
              ? "bg-accent text-accent-foreground"
              : "text-foreground hover:bg-accent/50"
          }`}
        >
          <div className="shrink-0">{cmd.icon}</div>
          <div className="min-w-0">
            <div className="text-sm font-medium">{cmd.label}</div>
            <div className="text-xs text-muted-foreground truncate">{cmd.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

export { AI_COMMANDS };
