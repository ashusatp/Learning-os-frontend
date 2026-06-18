"use client";

import { MoreHorizontal, Pencil, Trash2, Copy, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ItemActionsMenuProps {
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onReorder: () => void;
  triggerClassName?: string;
}

export function ItemActionsMenu({
  onEdit,
  onDelete,
  onDuplicate,
  onReorder,
  triggerClassName,
}: ItemActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            className={triggerClassName}
          />
        }
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4}>
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}>
          <Copy className="h-3.5 w-3.5" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onReorder}>
          <ArrowUpDown className="h-3.5 w-3.5" />
          Reorder
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
