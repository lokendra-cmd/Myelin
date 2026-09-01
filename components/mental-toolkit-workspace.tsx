"use client";

import { useState, useTransition } from "react";
import {
  Puzzle,
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
  MoreHorizontal,
  BookOpen,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MentalToolkitBlockEditor } from "@/components/mental-toolkit-block-editor";
import {
  addMentalToolkitBlock,
  createMentalToolkitSection,
  deleteMentalToolkitSection,
  updateMentalToolkitSection,
} from "@/actions/mental-toolkit";
import type { MentalToolkitBlockDTO, MentalToolkitSectionDTO } from "@/types/mental-toolkit";
import { cn } from "@/lib/utils";

const docField =
  "w-full resize-none border-0 bg-transparent p-0 shadow-none outline-none ring-0 focus:ring-0 placeholder:text-zinc-300 dark:placeholder:text-zinc-600";

function sectionPreview(blocks: MentalToolkitBlockDTO[]) {
  const block = blocks.find((item) => item.content.trim());
  return block?.content.trim().slice(0, 120) ?? "";
}

function SectionDocument({
  section,
  isPending,
  deletingSectionId,
  onToggle,
  onTitleBlur,
  onDeleteSection,
  onSetDeletingSectionId,
  onBlocksChange,
  onAddBlock,
}: {
  section: MentalToolkitSectionDTO;
  isPending: boolean;
  deletingSectionId: string | null;
  onToggle: () => void;
  onTitleBlur: (title: string) => void;
  onDeleteSection: () => void;
  onSetDeletingSectionId: (id: string | null) => void;
  onBlocksChange: (blocks: MentalToolkitBlockDTO[]) => void;
  onAddBlock: () => void;
}) {
  const isExpanded = !section.collapsed;
  const preview = sectionPreview(section.blocks);

  return (
    <article className="rounded-[1.35rem] border border-zinc-200/70 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_8px_24px_rgba(0,0,0,0.25)]">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-900 sm:px-7">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <BookOpen className="size-4" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <input
              type="text"
              defaultValue={section.title}
              onClick={(event) => event.stopPropagation()}
              onBlur={(event) => onTitleBlur(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }}
              className={cn(
                docField,
                "text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50",
                isExpanded && "sm:text-xl",
              )}
            />
            {!isExpanded && preview ? (
              <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {preview}
                {preview.length >= 120 ? "…" : ""}
              </p>
            ) : null}
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-1 pt-1">
          <DropdownMenu.Root
            onOpenChange={(open) => {
              if (!open) onSetDeletingSectionId(null);
            }}
          >
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                title="Section options"
                className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                side="bottom"
                sideOffset={4}
                className="z-50 min-w-[12rem] overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 text-zinc-950 shadow-xl animate-in fade-in-50 zoom-in-95 duration-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              >
                {deletingSectionId !== section._id ? (
                  <DropdownMenu.Item
                    onSelect={(event) => {
                      event.preventDefault();
                      onSetDeletingSectionId(section._id);
                    }}
                    className="flex w-full cursor-default select-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 outline-none transition hover:bg-red-50 focus:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 dark:focus:bg-red-950/20"
                  >
                    <Trash2 className="size-3.5" />
                    Delete section
                  </DropdownMenu.Item>
                ) : (
                  <div className="max-w-[14rem] space-y-3 p-3 text-left">
                    <div>
                      <p className="text-xs font-semibold leading-tight text-zinc-900 dark:text-zinc-200">
                        Delete this section?
                      </p>
                      <p className="mt-1 text-[10px] leading-normal text-zinc-400 dark:text-zinc-500">
                        All content inside will be removed.
                      </p>
                    </div>
                    <div className="flex justify-end gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => onSetDeletingSectionId(null)}
                        className="rounded-md px-2.5 py-1.5 text-[11px] font-medium text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800 dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={onDeleteSection}
                        className="rounded-md bg-red-600 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-red-700"
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
            onClick={onToggle}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
          >
            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div className="px-3 pb-8 pt-6 sm:px-6 sm:pt-7">
          <div className="mx-auto max-w-[42rem]">
            <MentalToolkitBlockEditor
              sectionId={section._id}
              blocks={section.blocks}
              onSectionUpdate={onBlocksChange}
            />

            <button
              type="button"
              onClick={onAddBlock}
              disabled={isPending}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-600 disabled:opacity-60 dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
            >
              <Plus className="size-3.5" />
              Click to add a block, or type &apos;/&apos;
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

interface MentalToolkitWorkspaceProps {
  initialSections: MentalToolkitSectionDTO[];
}

export function MentalToolkitWorkspace({ initialSections }: MentalToolkitWorkspaceProps) {
  const [sections, setSections] = useState(initialSections);
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const replaceSection = (updated: MentalToolkitSectionDTO) => {
    setSections((current) =>
      current.map((section) => (section._id === updated._id ? updated : section)),
    );
  };

  const handleCreateSection = () => {
    startTransition(async () => {
      try {
        const created = await createMentalToolkitSection();
        setSections((current) => [...current, created]);
      } catch (error) {
        console.error("Failed to create section:", error);
      }
    });
  };

  const handleToggleSection = (section: MentalToolkitSectionDTO) => {
    const collapsed = !section.collapsed;
    setSections((current) =>
      current.map((item) => (item._id === section._id ? { ...item, collapsed } : item)),
    );
    startTransition(async () => {
      try {
        const updated = await updateMentalToolkitSection(section._id, { collapsed });
        replaceSection(updated);
      } catch (error) {
        console.error("Failed to toggle section:", error);
        setSections((current) =>
          current.map((item) =>
            item._id === section._id ? { ...item, collapsed: section.collapsed } : item,
          ),
        );
      }
    });
  };

  const handleTitleBlur = (sectionId: string, title: string) => {
    const section = sections.find((item) => item._id === sectionId);
    if (!section || section.title === title.trim()) return;

    startTransition(async () => {
      try {
        const updated = await updateMentalToolkitSection(sectionId, { title });
        replaceSection(updated);
      } catch (error) {
        console.error("Failed to update section title:", error);
      }
    });
  };

  const handleDeleteSection = (sectionId: string) => {
    startTransition(async () => {
      try {
        await deleteMentalToolkitSection(sectionId);
        setSections((current) => current.filter((section) => section._id !== sectionId));
        setDeletingSectionId(null);
      } catch (error) {
        console.error("Failed to delete section:", error);
      }
    });
  };

  const handleAddBlock = (sectionId: string) => {
    startTransition(async () => {
      try {
        const updated = await addMentalToolkitBlock(sectionId, "paragraph");
        replaceSection(updated);
      } catch (error) {
        console.error("Failed to add block:", error);
      }
    });
  };

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <header className="space-y-3 border-b border-zinc-200/70 pb-7 dark:border-zinc-800/80">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
              <Puzzle className="size-3.5 text-accent" />
              Reference library
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
              Mental toolkit
            </h1>
            <p className="max-w-xl text-[15px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              Build pages block by block — type <span className="font-medium text-zinc-700 dark:text-zinc-300">/</span>{" "}
              to add headings, text, and bullet lists.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCreateSection}
            disabled={isPending}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            <Plus className="mr-1.5 size-4" />
            New section
          </button>
        </div>
      </header>

      {sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[1.35rem] border border-dashed border-zinc-200 bg-white/60 px-8 py-20 text-center dark:border-zinc-800 dark:bg-zinc-950/30">
          <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600">
            <BookOpen className="size-7" />
          </div>
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Nothing here yet</h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Create a section and start typing. Use slash commands to add any block type, just like
            Notion.
          </p>
          <button
            type="button"
            onClick={handleCreateSection}
            disabled={isPending}
            className="mt-6 inline-flex h-9 items-center justify-center rounded-full bg-zinc-950 px-4 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            Create section
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {sections.map((section) => (
            <SectionDocument
              key={section._id}
              section={section}
              isPending={isPending}
              deletingSectionId={deletingSectionId}
              onToggle={() => handleToggleSection(section)}
              onTitleBlur={(title) => handleTitleBlur(section._id, title)}
              onDeleteSection={() => handleDeleteSection(section._id)}
              onSetDeletingSectionId={setDeletingSectionId}
              onBlocksChange={(blocks) =>
                setSections((current) =>
                  current.map((item) => (item._id === section._id ? { ...item, blocks } : item)),
                )
              }
              onAddBlock={() => handleAddBlock(section._id)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
