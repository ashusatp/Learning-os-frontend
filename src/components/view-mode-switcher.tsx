"use client";

import { LayoutGrid, List, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ViewMode = "grid" | "list" | "compact";

interface ViewModeSwitcherProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const modes: { value: ViewMode; icon: typeof LayoutGrid; label: string }[] = [
  { value: "grid", icon: LayoutGrid, label: "Grid" },
  { value: "list", icon: List, label: "List" },
  { value: "compact", icon: Rows3, label: "Compact" },
];

export function ViewModeSwitcher({ mode, onChange }: ViewModeSwitcherProps) {
  return (
    <div className="flex items-center rounded-lg border bg-muted/50 p-0.5">
      {modes.map((m) => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          className={`flex items-center justify-center rounded-md p-1.5 transition-all ${
            mode === m.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title={m.label}
        >
          <m.icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
