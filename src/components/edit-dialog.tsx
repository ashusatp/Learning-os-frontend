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
import { Textarea } from "@/components/ui/textarea";
import { FieldConfig } from "@/components/create-dialog";

interface EditDialogProps {
  title: string;
  description?: string;
  fields: FieldConfig[];
  initialData: Record<string, string | number | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Record<string, string | number>) => Promise<void>;
}

export function EditDialog({
  title,
  description,
  fields,
  initialData,
  open,
  onOpenChange,
  onSubmit,
}: EditDialogProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      const initial: Record<string, string> = {};
      for (const field of fields) {
        initial[field.name] = String(initialData[field.name] ?? "");
      }
      setFormData(initial);
    }
  }, [open, initialData, fields]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const processed: Record<string, string | number> = {};
      for (const field of fields) {
        const value = formData[field.name] || "";
        if (field.type === "number" && value) {
          processed[field.name] = Number(value);
        } else if (value) {
          processed[field.name] = value;
        }
      }
      await onSubmit(processed);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit {title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {fields.map((field) => (
              <div key={field.name} className="grid gap-2">
                <Label htmlFor={`edit-${field.name}`}>{field.label}</Label>
                {field.type === "textarea" ? (
                  <Textarea
                    id={`edit-${field.name}`}
                    placeholder={field.placeholder}
                    value={formData[field.name] || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        [field.name]: e.target.value,
                      }))
                    }
                    required={field.required}
                  />
                ) : (
                  <Input
                    id={`edit-${field.name}`}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={formData[field.name] || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        [field.name]: e.target.value,
                      }))
                    }
                    required={field.required}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
