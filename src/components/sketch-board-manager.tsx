"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  PenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { SketchBoard } from "@/components/sketchboard";
import { useSketchBoardStore } from "@/stores/sketch-board-store";
import { SketchBoard as SketchBoardType } from "@/types";

interface SketchBoardManagerProps {
  topicId: string;
  subtopicId: string;
  readOnly?: boolean;
  onFullscreen?: () => void;
}

export function SketchBoardManager({
  topicId,
  subtopicId,
  readOnly,
  onFullscreen,
}: SketchBoardManagerProps) {
  const {
    boards,
    activeBoard,
    loading,
    fetchBoards,
    setActiveBoard,
    createBoard,
    updateBoard,
    renameBoard,
    deleteBoard,
  } = useSketchBoardStore();

  const [creating, setCreating] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renamingBoard, setRenamingBoard] = useState<SketchBoardType | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedData = useRef<string | null>(null);

  useEffect(() => {
    fetchBoards(topicId, subtopicId);
  }, [topicId, subtopicId, fetchBoards]);

  // Auto-select first board
  useEffect(() => {
    if (boards.length > 0 && !activeBoard) {
      setActiveBoard(boards[0]);
    }
  }, [boards, activeBoard, setActiveBoard]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const board = await createBoard(topicId, subtopicId, `Board ${boards.length + 1}`);
      setActiveBoard(board);
    } finally {
      setCreating(false);
    }
  };

  const handleRenameOpen = (board: SketchBoardType) => {
    setRenamingBoard(board);
    setRenameValue(board.name);
    setRenameOpen(true);
  };

  const handleRenameSubmit = async () => {
    if (!renamingBoard || !renameValue.trim()) return;
    await renameBoard(topicId, subtopicId, renamingBoard.id, renameValue.trim());
    setRenameOpen(false);
  };

  const handleDelete = async (board: SketchBoardType) => {
    await deleteBoard(topicId, subtopicId, board.id);
  };

  // Debounced auto-save for sketch data changes
  const handleSketchChange = useCallback(
    (data: string) => {
      if (!activeBoard) return;
      if (data === lastSavedData.current) return;

      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        lastSavedData.current = data;
        updateBoard(topicId, subtopicId, activeBoard.id, { data });
      }, 2000);
    },
    [activeBoard, topicId, subtopicId, updateBoard]
  );

  // Update lastSavedData when active board changes
  useEffect(() => {
    lastSavedData.current = activeBoard?.data ?? null;
  }, [activeBoard?.id]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (boards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <PenLine className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground max-w-xs">
          {readOnly
            ? "No sketchboards yet."
            : "Create a sketchboard to start drawing."}
        </p>
        {!readOnly && (
          <Button size="sm" onClick={handleCreate} disabled={creating} className="gap-1.5">
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            New Board
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Board tabs */}
      <div className="shrink-0 flex items-center gap-1 px-2 py-1.5 border-b bg-muted/30 overflow-x-auto">
        {boards.map((board) => {
          const isActive = activeBoard?.id === board.id;
          return (
            <div key={board.id} className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => setActiveBoard(board)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  isActive
                    ? "bg-background text-foreground shadow-sm border"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {board.name}
              </button>
              {!readOnly && isActive && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon-xs" className="h-6 w-6" />
                    }
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" sideOffset={4}>
                    <DropdownMenuItem onClick={() => handleRenameOpen(board)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => handleDelete(board)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
        {!readOnly && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="h-7 w-7 shrink-0"
            onClick={handleCreate}
            disabled={creating}
            title="New board"
          >
            {creating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>

      {/* Active board canvas */}
      <div className="flex-1 min-h-0">
        {activeBoard && (
          <SketchBoard
            key={activeBoard.id}
            initialData={activeBoard.data ?? undefined}
            onChange={readOnly ? undefined : handleSketchChange}
            readOnly={readOnly}
            onFullscreen={onFullscreen}
          />
        )}
      </div>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRenameSubmit();
            }}
          >
            <DialogHeader>
              <DialogTitle>Rename Board</DialogTitle>
              <DialogDescription>Enter a new name for this sketchboard.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Board name"
                autoFocus
              />
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
              <Button type="submit" disabled={!renameValue.trim()}>
                Rename
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
