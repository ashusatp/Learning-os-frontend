"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ReorderItem {
  id: string;
  name: string;
  order: number;
}

interface ReorderDialogProps {
  title: string;
  item: ReorderItem;
  totalItems: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (newPosition: number) => Promise<void>;
}

export function ReorderDialog({
  title,
  item,
  totalItems,
  open,
  onOpenChange,
  onSubmit,
}: ReorderDialogProps) {
  const [position, setPosition] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setPosition(item.order);
    }
  }, [open, item.order]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clamped = Math.max(1, Math.min(totalItems, position));
    if (clamped === item.order) {
      onOpenChange(false);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(clamped);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Reorder {title}</DialogTitle>
            <DialogDescription>
              Change the position of &quot;{item.name}&quot;. Items will shift automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                {item.order}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  Current position: {item.order} of {totalItems}
                </p>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-position">New position</Label>
              <Input
                id="new-position"
                type="number"
                min={1}
                max={totalItems}
                value={position}
                onChange={(e) => setPosition(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Enter a number between 1 and {totalItems}
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Moving..." : "Move here"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
