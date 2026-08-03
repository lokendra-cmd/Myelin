"use client";

import { useState, useTransition } from "react";
import {
  Brain,
  Trash2,
  Plus,
  Check,
  ChevronDown,
  ChevronUp,
  Pencil,
  Sparkles,
  MoreHorizontal,
  Folder,
  CheckCircle2,
  Link2,
  ExternalLink,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Card } from "@/components/ui/card";
import { DynamicIcon } from "@/components/entity/ModalHeader";
import { EntityModal } from "@/components/entity/EntityModal";
import { hashTheme, getThemeById } from "@/lib/themeUtils";
import {
  createBrainDumpThought,
  updateBrainDumpThought,
  deleteBrainDumpThought,
  convertThoughtToTask,
} from "@/actions/sprints";
import type { CategoryDTO, BrainDumpThoughtDTO } from "@/types/sprint";
import type { EntityFormValues } from "@/components/entity/EntityForm";
import { cn } from "@/lib/utils";

function formatLinkLabel(link: string): string {
  try {
    const url = new URL(link.startsWith("http") ? link : `https://${link}`);
    const path = url.pathname === "/" ? "" : url.pathname;
    const display = `${url.hostname.replace(/^www\./, "")}${path}`;
    return display.length > 48 ? `${display.slice(0, 45)}…` : display;
  } catch {
    return link.length > 48 ? `${link.slice(0, 45)}…` : link;
  }
}

const thoughtFieldClass =
  "w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm outline-none transition focus:border-violet-400 dark:focus:border-violet-600 focus:bg-white dark:focus:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400";

interface BrainDumpWorkspaceProps {
  initialCategories: CategoryDTO[];
  initialThoughts: BrainDumpThoughtDTO[];
}

export function BrainDumpWorkspace({
  initialCategories,
  initialThoughts,
}: BrainDumpWorkspaceProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [thoughts, setThoughts] = useState(initialThoughts);

  // Accordion expanded state (category key -> boolean)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // New Category modal state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  // Editing Category state
  const [editingCategory, setEditingCategory] = useState<CategoryDTO | null>(null);

  // Delete category confirmation state
  const [deletingCategoryKey, setDeletingCategoryKey] = useState<string | null>(null);

  // Inline add thought states
  const [addingCategoryKey, setAddingCategoryKey] = useState<string | null>(null);
  const [addingText, setAddingText] = useState("");
  const [addingDescription, setAddingDescription] = useState("");
  const [addingLink, setAddingLink] = useState("");

  // Inline edit thought states
  const [editingThoughtId, setEditingThoughtId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingLink, setEditingLink] = useState("");

  // Async transitions
  const [isPending, startTransition] = useTransition();

  // start closed; only toggleCategory / create-category open states apply
  const toggleCategory = (key: string) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const resetAddForm = () => {
    setAddingText("");
    setAddingDescription("");
    setAddingLink("");
    setAddingCategoryKey(null);
  };

  // Add thought handler
  const handleAddThought = async (categoryKey: string) => {
    const text = addingText.trim();
    if (!text) return;
    const description = addingDescription.trim();
    const link = addingLink.trim();
    resetAddForm();

    startTransition(async () => {
      try {
        const newThought = await createBrainDumpThought(text, categoryKey, {
          description,
          link,
        });
        setThoughts((prev) => [...prev, newThought]);
      } catch (error) {
        console.error("Failed to add thought:", error);
      }
    });
  };

  // Edit thought handler
  const handleSaveEdit = async (thoughtId: string) => {
    const text = editingText.trim();
    if (!text) return;
    const description = editingDescription.trim();
    const link = editingLink.trim();
    setEditingThoughtId(null);

    startTransition(async () => {
      try {
        const updated = await updateBrainDumpThought(thoughtId, {
          text,
          description,
          link,
        });
        setThoughts((prev) => prev.map((t) => (t._id === thoughtId ? updated : t)));
      } catch (error) {
        console.error("Failed to edit thought:", error);
      }
    });
  };

  const startEditThought = (thought: BrainDumpThoughtDTO) => {
    setEditingThoughtId(thought._id);
    setEditingText(thought.text);
    setEditingDescription(thought.description ?? "");
    setEditingLink(thought.link ?? "");
  };

  // Convert thought to task in today's sprint
  const handleConvertToTask = async (thoughtId: string, targetCategoryKey: string) => {
    startTransition(async () => {
      try {
        const res = await convertThoughtToTask(thoughtId, targetCategoryKey);
        if (res.success) {
          setThoughts((prev) => prev.filter((t) => t._id !== thoughtId));
        }
      } catch (error) {
        console.error("Failed to convert thought to task:", error);
      }
    });
  };

  // Delete thought handler
  const handleDeleteThought = async (thoughtId: string) => {
    startTransition(async () => {
      try {
        const res = await deleteBrainDumpThought(thoughtId);
        if (res.success) {
          setThoughts((prev) => prev.filter((t) => t._id !== thoughtId));
        }
      } catch (error) {
        console.error("Failed to delete thought:", error);
      }
    });
  };

  // Delete category handler
  const handleDeleteCategory = async (key: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/categories/${encodeURIComponent(key)}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Could not delete category");
        setCategories((current) => current.filter((category) => category.key !== key));
        setThoughts((current) => current.filter((t) => t.category !== key));
        setExpanded((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      } catch (error) {
        console.error("Failed to delete category:", error);
      }
    });
  };

  // Category submission from modal (creates or updates a category)
  const handleCategorySubmit = async (values: EntityFormValues) => {
    try {
      if (editingCategory) {
        const body = {
          label: values.label,
          tagline: values.tagline || "",
          icon: values.icon,
          themeId: editingCategory.themeId || hashTheme(values.label).id,
          isBrainDump: true,
        };
        const res = await fetch(`/api/categories/${encodeURIComponent(editingCategory.key)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to update category");
        const updated = await res.json();
        setCategories((current) =>
          current.map((cat) => (cat.key === editingCategory.key ? updated : cat))
        );
        setEditingCategory(null);
      } else {
        const body = {
          label: values.label,
          tagline: values.tagline || "",
          icon: values.icon,
          themeId: hashTheme(values.label).id,
          isBrainDump: true,
        };
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to create category");
        const created = await res.json();
        setCategories((prev) => [...prev, created]);
        setCategoryModalOpen(false);
        setExpanded((prev) => ({ ...prev, [created.key]: true }));
      }
    } catch (error) {
      console.error("Failed to submit category:", error);
    }
  };

  const brainDumpCategories = categories.filter((c) => c.isBrainDump);
  const activeCategories = categories.filter((c) => !c.isBrainDump);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
            <Brain className="size-6" />
          </div>
          <div>
            <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold tracking-normal">
              Brain Dump
            </h1>
          </div>
        </div>

        <button
          onClick={() => setCategoryModalOpen(true)}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          <Plus className="mr-1.5 size-4 stroke-[2.5]" />
          New Category
        </button>
      </div>

      {/* Banner */}
      <div className="relative flex items-start justify-between rounded-2xl border border-accent/15 bg-accent-soft/70 p-4 dark:bg-accent-soft/40">
        <div className="flex gap-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/70 text-accent dark:bg-zinc-950/40">
            <Sparkles className="size-4" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Dump now. Organize later.
            </p>
            <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Capture ideas before they disappear. You can always turn ideas into tasks when you&apos;re ready.
            </p>
          </div>
        </div>
      </div>

      {/* Categories Accordion */}
      {brainDumpCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 bg-white/50 dark:bg-zinc-950/20 backdrop-blur-sm">
          <div className="grid size-14 place-items-center rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 mb-4">
            <Folder className="size-7" />
          </div>
          <h2 className="text-lg font-semibold">No Brain Dump Categories</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
            Create a category to begin dumping thoughts. They will be saved in your customized brain dump collection.
          </p>
          <button
            onClick={() => setCategoryModalOpen(true)}
            className="mt-5 inline-flex h-9 items-center justify-center rounded-xl bg-zinc-950 px-4 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 transition"
          >
            Create Category
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {brainDumpCategories.map((category) => {
            const theme = category.themeId ? getThemeById(category.themeId) : hashTheme(category._id);
            const categoryThoughts = thoughts.filter((t) => t.category === category.key);
            const isExpanded = !!expanded[category.key];

            return (
              <Card
                key={category.key}
                className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm transition hover:shadow dark:border-zinc-800/80 dark:bg-zinc-950/60"
              >
                {/* Category Accordion Header Row */}
                <div className="flex w-full items-center justify-between px-4 py-3.5 text-left transition hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 sm:px-5 sm:py-4">
                  <button
                    type="button"
                    onClick={() => toggleCategory(category.key)}
                    className="flex flex-1 items-center gap-3 text-left outline-none focus:underline"
                  >
                    <div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/40 shadow-sm dark:border-zinc-800/30",
                        theme.accentBg
                      )}
                    >
                      {category.icon ? (
                        <DynamicIcon name={category.icon} className={cn("size-5", theme.accentText)} />
                      ) : (
                        <span className="text-lg leading-none">📁</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate text-base font-semibold text-zinc-800 dark:text-zinc-200">
                        {category.label}
                      </span>
                      <span className="mt-0.5 inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-900 sm:hidden">
                        {categoryThoughts.length} {categoryThoughts.length === 1 ? "thought" : "thoughts"}
                      </span>
                    </div>
                  </button>

                  <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <span className="hidden items-center rounded-full border border-zinc-200/30 bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:border-zinc-800/50 dark:bg-zinc-900 sm:inline-flex">
                      {categoryThoughts.length} {categoryThoughts.length === 1 ? "thought" : "thoughts"}
                    </span>
                    
                    {/* Delete Category Dropdown Menu */}
                    <DropdownMenu.Root
                      onOpenChange={(open) => {
                        if (!open) {
                          setDeletingCategoryKey(null);
                        }
                      }}
                    >
                      <DropdownMenu.Trigger asChild>
                        <button
                          type="button"
                          title="Category Actions"
                          className="p-1 rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition"
                        >
                          <MoreHorizontal className="size-4" />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          align="end"
                          side="bottom"
                          sideOffset={4}
                          className="z-50 min-w-[12rem] overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 text-zinc-950 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 animate-in fade-in-50 zoom-in-95 duration-100"
                        >
                          {deletingCategoryKey !== category.key ? (
                            <div className="py-0.5">
                              <DropdownMenu.Item
                                onSelect={() => {
                                  setEditingCategory(category);
                                }}
                                className="flex w-full cursor-default select-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-700 outline-none hover:bg-zinc-100 focus:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:focus:bg-zinc-900 transition"
                              >
                                <Pencil className="size-3.5 text-zinc-400" />
                                Edit Category
                              </DropdownMenu.Item>
                              <DropdownMenu.Item
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setDeletingCategoryKey(category.key);
                                }}
                                className="flex w-full cursor-default select-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 outline-none hover:bg-red-50 focus:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 dark:focus:bg-red-950/20 transition"
                              >
                                <Trash2 className="size-3.5" />
                                Delete Category
                              </DropdownMenu.Item>
                            </div>
                          ) : (
                            <div className="p-3 text-left space-y-3 max-w-[14rem]">
                              <div>
                                <p className="text-xs font-semibold text-zinc-850 dark:text-zinc-200 leading-tight">
                                  Delete category?
                                </p>
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 leading-normal">
                                  This will delete the category and all its thoughts.
                                </p>
                              </div>
                              <div className="flex justify-end gap-2 text-xs">
                                <button
                                  type="button"
                                  onClick={() => setDeletingCategoryKey(null)}
                                  className="px-2.5 py-1.5 rounded-md text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(category.key)}
                                  className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-red-600 hover:bg-red-700 text-white transition shadow-sm"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>

                    <button
                      type="button"
                      onClick={() => toggleCategory(category.key)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition"
                    >
                      {isExpanded ? (
                        <ChevronUp className="size-4 text-zinc-400" />
                      ) : (
                        <ChevronDown className="size-4 text-zinc-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Category Accordion Body */}
                {isExpanded && (
                  <div className="border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/30 dark:bg-zinc-900/10 divide-y divide-zinc-100 dark:divide-zinc-900/60">
                    {/* Thoughts List */}
                    {categoryThoughts.length > 0 ? (
                      <div className="divide-y divide-zinc-100 dark:divide-zinc-900/60">
                        {categoryThoughts.map((thought) => (
                          <div
                            key={thought._id}
                            className="group flex items-start justify-between gap-2 px-5 py-3.5 sm:px-6 hover:bg-white/50 dark:hover:bg-zinc-950/30 transition duration-150"
                          >
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-zinc-400" />
                              {editingThoughtId === thought._id ? (
                                <div className="flex w-full min-w-0 flex-col gap-2">
                                  <input
                                    type="text"
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSaveEdit(thought._id);
                                      }
                                      if (e.key === "Escape") setEditingThoughtId(null);
                                    }}
                                    placeholder="Thought"
                                    className={thoughtFieldClass}
                                    autoFocus
                                  />
                                  <textarea
                                    value={editingDescription}
                                    onChange={(e) => setEditingDescription(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Escape") setEditingThoughtId(null);
                                    }}
                                    placeholder="Description (optional)"
                                    rows={2}
                                    className={cn(thoughtFieldClass, "resize-none leading-relaxed")}
                                  />
                                  <div className="relative">
                                    <Link2 className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
                                    <input
                                      type="url"
                                      value={editingLink}
                                      onChange={(e) => setEditingLink(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          handleSaveEdit(thought._id);
                                        }
                                        if (e.key === "Escape") setEditingThoughtId(null);
                                      }}
                                      placeholder="Link (optional)"
                                      className={cn(thoughtFieldClass, "pl-9")}
                                    />
                                  </div>
                                  <div className="flex items-center gap-1.5 pt-0.5">
                                    <button
                                      onClick={() => handleSaveEdit(thought._id)}
                                      disabled={!editingText.trim() || isPending}
                                      className="inline-flex h-7 items-center gap-1 rounded-md bg-zinc-900 px-2.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-55 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                                    >
                                      <Check className="size-3.5 stroke-[2.5]" />
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingThoughtId(null)}
                                      className="inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="min-w-0 space-y-1 py-0.5">
                                  <p className="text-sm leading-relaxed break-words text-zinc-800 dark:text-zinc-200">
                                    {thought.text}
                                  </p>
                                  {thought.description ? (
                                    <p className="text-xs leading-relaxed break-words text-zinc-500 dark:text-zinc-400">
                                      {thought.description}
                                    </p>
                                  ) : null}
                                  {thought.link ? (
                                    <a
                                      href={
                                        thought.link.startsWith("http")
                                          ? thought.link
                                          : `https://${thought.link}`
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="group/link inline-flex max-w-full items-center gap-1.5 rounded-md text-xs font-medium text-violet-600 transition hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                                    >
                                      <ExternalLink className="size-3 shrink-0 opacity-70" />
                                      <span className="truncate underline-offset-2 group-hover/link:underline">
                                        {formatLinkLabel(thought.link)}
                                      </span>
                                    </a>
                                  ) : null}
                                </div>
                              )}
                            </div>

                            {/* Hover Actions Menu */}
                            {editingThoughtId !== thought._id && (
                              <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
                                {/* Edit button */}
                                <button
                                  onClick={() => startEditThought(thought)}
                                  title="Edit Thought"
                                  className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-300"
                                >
                                  <Pencil className="size-4" />
                                </button>

                                {/* Convert to Task (Checkmark) trigger with active categories dropdown */}
                                <DropdownMenu.Root>
                                  <DropdownMenu.Trigger asChild>
                                    <button
                                      title="Convert to Task"
                                      className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-violet-600 dark:hover:bg-zinc-800/80 dark:hover:text-violet-400"
                                    >
                                      <CheckCircle2 className="size-4" />
                                    </button>
                                  </DropdownMenu.Trigger>
                                  <DropdownMenu.Portal>
                                    <DropdownMenu.Content
                                      align="end"
                                      side="bottom"
                                      sideOffset={4}
                                      className="z-50 min-w-[12rem] overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 text-zinc-950 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 animate-in fade-in-50 zoom-in-95 duration-100"
                                    >
                                      <div className="mb-1 border-b border-zinc-100 px-2.5 py-1.5 text-[10px] font-bold tracking-wider text-zinc-400 uppercase dark:border-zinc-800/80 dark:text-zinc-500">
                                        Select Target Category
                                      </div>
                                      {activeCategories.length > 0 ? (
                                        activeCategories.map((actCat) => (
                                          <DropdownMenu.Item
                                            key={actCat.key}
                                            onSelect={() => handleConvertToTask(thought._id, actCat.key)}
                                            className="flex w-full cursor-default select-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-zinc-700 outline-none transition hover:bg-zinc-100 focus:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:focus:bg-zinc-900"
                                          >
                                            <div className="flex size-4 shrink-0 items-center justify-center">
                                              {actCat.icon ? (
                                                <DynamicIcon name={actCat.icon} className="size-3.5" />
                                              ) : (
                                                <span className="text-[10px]">{actCat.emoji}</span>
                                              )}
                                            </div>
                                            <span className="truncate">{actCat.label}</span>
                                          </DropdownMenu.Item>
                                        ))
                                      ) : (
                                        <div className="max-w-[14rem] px-2.5 py-2 text-center text-xs leading-normal text-zinc-400 dark:text-zinc-500">
                                          Create a category in Today&apos;s sprint first to send tasks there.
                                        </div>
                                      )}
                                    </DropdownMenu.Content>
                                  </DropdownMenu.Portal>
                                </DropdownMenu.Root>

                                {/* More actions (Delete) */}
                                <DropdownMenu.Root>
                                  <DropdownMenu.Trigger asChild>
                                    <button
                                      title="More Actions"
                                      className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-300"
                                    >
                                      <MoreHorizontal className="size-4" />
                                    </button>
                                  </DropdownMenu.Trigger>
                                  <DropdownMenu.Portal>
                                    <DropdownMenu.Content
                                      align="end"
                                      side="bottom"
                                      sideOffset={4}
                                      className="z-50 min-w-[10rem] overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 text-zinc-950 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 animate-in fade-in-50 zoom-in-95 duration-100"
                                    >
                                      <DropdownMenu.Item
                                        onSelect={() => handleDeleteThought(thought._id)}
                                        className="flex w-full cursor-default select-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 outline-none transition hover:bg-red-50 focus:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 dark:focus:bg-red-950/20"
                                      >
                                        <Trash2 className="size-3.5" />
                                        Delete Thought
                                      </DropdownMenu.Item>
                                    </DropdownMenu.Content>
                                  </DropdownMenu.Portal>
                                </DropdownMenu.Root>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-14 items-center justify-center text-xs text-zinc-400 dark:text-zinc-600">
                        No thoughts in this category
                      </div>
                    )}

                    {/* Add Thought Block */}
                    <div className="bg-white p-3 dark:bg-zinc-950/30">
                      {addingCategoryKey === category.key ? (
                        <div className="mx-auto max-w-2xl space-y-2 rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/40">
                          <input
                            type="text"
                            placeholder="What's on your mind?"
                            value={addingText}
                            onChange={(e) => setAddingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleAddThought(category.key);
                              }
                              if (e.key === "Escape") resetAddForm();
                            }}
                            className={thoughtFieldClass}
                            autoFocus
                          />
                          <textarea
                            placeholder="Add a description (optional)"
                            value={addingDescription}
                            onChange={(e) => setAddingDescription(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") resetAddForm();
                            }}
                            rows={2}
                            className={cn(thoughtFieldClass, "resize-none leading-relaxed")}
                          />
                          <div className="relative">
                            <Link2 className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
                            <input
                              type="url"
                              placeholder="Add a link (optional)"
                              value={addingLink}
                              onChange={(e) => setAddingLink(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddThought(category.key);
                                }
                                if (e.key === "Escape") resetAddForm();
                              }}
                              className={cn(thoughtFieldClass, "pl-9")}
                            />
                          </div>
                          <div className="flex items-center justify-end gap-1.5 pt-0.5">
                            <button
                              onClick={resetAddForm}
                              className="inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-900"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleAddThought(category.key)}
                              disabled={!addingText.trim() || isPending}
                              className="inline-flex h-8 items-center justify-center rounded-lg bg-zinc-900 px-3.5 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-55 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                            >
                              Add Thought
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setAddingCategoryKey(category.key);
                            setAddingText("");
                            setAddingDescription("");
                            setAddingLink("");
                          }}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-200 bg-white/40 py-2.5 text-xs font-medium text-zinc-400 transition duration-150 hover:border-violet-300 hover:bg-violet-50/10 hover:text-violet-600 dark:border-zinc-800 dark:hover:border-violet-900 dark:hover:text-violet-400"
                        >
                          <Plus className="size-3.5 stroke-[2.5]" />
                          Add Thought
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Reusable Category Modal */}
      <EntityModal
        open={categoryModalOpen || !!editingCategory}
        onOpenChange={(open) => {
          if (!open) {
            setCategoryModalOpen(false);
            setEditingCategory(null);
          }
        }}
        entityType="category"
        title={editingCategory ? "Edit Category" : "Create New Category"}
        submitLabel={editingCategory ? "Save Changes" : "Create Category"}
        description={editingCategory ? "Update category information." : "Create a category to group your thoughts."}
        initialValues={
          editingCategory
            ? {
                label: editingCategory.label,
                tagline: editingCategory.tagline || "",
                icon: editingCategory.icon || "",
                isBrainDump: true,
              }
            : { label: "", tagline: "", icon: "", isBrainDump: true }
        }
        onSubmit={handleCategorySubmit}
      />
    </main>
  );
}
