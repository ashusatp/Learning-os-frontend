"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import "@excalidraw/excalidraw/index.css";

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
        Loading whiteboard...
      </div>
    ),
  }
);

interface WhiteboardProps {
  initialData?: string;
  onChange?: (data: string) => void;
}

export function Whiteboard({ initialData, onChange }: WhiteboardProps) {
  const [ready, setReady] = useState(false);

  const parsedInitial = initialData
    ? (() => {
        try {
          return JSON.parse(initialData);
        } catch {
          return undefined;
        }
      })()
    : undefined;

  const handleChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (elements: readonly any[], appState: any) => {
      if (!ready) return;
      const data = JSON.stringify({
        elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          currentItemFontFamily: appState.currentItemFontFamily,
        },
      });
      onChange?.(data);
    },
    [onChange, ready]
  );

  return (
    <div className="h-full w-full" style={{ minHeight: 400 }}>
      <Excalidraw
        initialData={parsedInitial}
        onChange={handleChange}
        onPointerUpdate={() => {
          if (!ready) setReady(true);
        }}
        UIOptions={{
          canvasActions: {
            loadScene: false,
          },
        }}
      />
    </div>
  );
}
