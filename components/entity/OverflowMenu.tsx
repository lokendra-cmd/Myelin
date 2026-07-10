"use client";

import { useEffect, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { motion } from "framer-motion";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface OverflowMenuProps {
  onEdit: () => void;
  onDelete: () => void;
  deleteConfirmTitle?: string;
  deleteConfirmSubtext?: string;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  className?: string;
}

export function OverflowMenu({
  onEdit,
  onDelete,
  deleteConfirmTitle = "Delete this rule?",
  deleteConfirmSubtext,
  menuOpen,
  onMenuOpenChange,
  className,
}: OverflowMenuProps) {
  const [confirmMode, setConfirmMode] = useState<"none" | "delete">("none");

  // Reset confirmation mode when the menu is closed
  useEffect(() => {
    if (!menuOpen) {
      setConfirmMode("none");
    }
  }, [menuOpen]);

  return (
    <DropdownMenu.Root open={menuOpen} onOpenChange={onMenuOpenChange}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          title="Actions"
          className={cn(
            "p-1.5 hover:text-zinc-950 dark:hover:text-zinc-50 transition rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-400 dark:text-zinc-500 outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2",
            className
          )}
        >
          <MoreVertical className="size-3.5" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          side="bottom"
          sideOffset={6}
          // Utilizing Radix viewport-aware placement and styles
          className="z-50 min-w-[12rem] overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 text-zinc-950 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 animate-in fade-in-50 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 duration-100"
        >
          <motion.div layout="position" className="w-full">
            {confirmMode === "none" ? (
              <div className="py-0.5">
                <DropdownMenu.Item
                  onSelect={(e) => {
                    // Prevent close to handle edit transition properly
                    e.preventDefault();
                    onMenuOpenChange(false);
                    onEdit();
                  }}
                  className="flex w-full cursor-default select-none items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-zinc-700 outline-none hover:bg-zinc-100 focus:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:focus:bg-zinc-900 transition"
                >
                  <Pencil className="size-3.5 text-zinc-400" />
                  Edit
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={(e) => {
                    // Prevent dropdown closing when selecting Delete so we transition to confirmation state
                    e.preventDefault();
                    setConfirmMode("delete");
                  }}
                  className="flex w-full cursor-default select-none items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-red-600 outline-none hover:bg-red-50 focus:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 dark:focus:bg-red-950/20 transition"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </DropdownMenu.Item>
              </div>
            ) : (
              <div className="p-3 text-left animate-fade-in space-y-3 max-w-[14rem]">
                <div>
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-tight">
                    {deleteConfirmTitle}
                  </p>
                  {deleteConfirmSubtext && (
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 leading-normal">
                      {deleteConfirmSubtext}
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmMode("none");
                    }}
                    className="px-2.5 py-1.5 rounded-md text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMenuOpenChange(false);
                      onDelete();
                    }}
                    className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-red-600 hover:bg-red-700 text-white transition shadow-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
