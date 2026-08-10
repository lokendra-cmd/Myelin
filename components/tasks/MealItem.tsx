"use client";

import { useEffect, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Flame, MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { TaskDTO } from "@/types/sprint";

function MacroChip({ label, value }: { label: string; value: number | null | undefined }) {
  if (value == null || value <= 0) return null;
  return (
    <span className="inline-flex items-center rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
      <span className="opacity-60 mr-0.5">{label}</span>
      {Math.round(value)}g
    </span>
  );
}

export function MealItem({
  task,
  onEdit,
  onDelete,
}: {
  task: TaskDTO;
  onEdit: (task: TaskDTO) => void;
  onDelete: (taskId: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!menuOpen) setConfirmDelete(false);
  }, [menuOpen]);

  return (
    <div className="group flex min-w-0 items-center gap-3 rounded-xl border border-zinc-200/80 bg-white/80 px-3.5 py-3 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950/70">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400">
        <Flame className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold tabular-nums text-orange-600 dark:text-orange-400">
            {task.calories ?? 0} kcal
          </span>
          <MacroChip label="P" value={task.protein} />
          <MacroChip label="F" value={task.fat} />
          <MacroChip label="C" value={task.carbs} />
        </div>
      </div>

      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            title="Actions"
            className="grid size-8 shrink-0 place-items-center rounded-full text-zinc-400 outline-none transition hover:bg-zinc-100 hover:text-zinc-700 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
          >
            <MoreVertical className="size-4" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            side="bottom"
            sideOffset={6}
            collisionPadding={12}
            className="z-50 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-xl ring-1 ring-black/5 dark:border-zinc-800 dark:bg-zinc-950"
          >
            {!confirmDelete ? (
              <div className="py-0.5">
                <DropdownMenu.Item
                  onSelect={() => onEdit(task)}
                  className="flex w-full cursor-default select-none items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-zinc-700 outline-none hover:bg-zinc-100 focus:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  <Pencil className="size-3.5" />
                  Edit Meal
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={(event) => {
                    event.preventDefault();
                    setConfirmDelete(true);
                  }}
                  className="flex w-full cursor-default select-none items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-red-600 outline-none hover:bg-red-50 focus:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                >
                  <Trash2 className="size-3.5" />
                  Delete Meal
                </DropdownMenu.Item>
              </div>
            ) : (
              <div className="p-3">
                <p className="text-xs font-semibold">Delete this meal?</p>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-md px-2.5 py-1.5 text-[11px] text-zinc-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmDelete(false);
                      onDelete(task._id);
                    }}
                    className="rounded-md bg-red-600 px-2.5 py-1.5 text-[11px] font-semibold text-white"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
