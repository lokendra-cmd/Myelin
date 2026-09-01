"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  AlignLeft,
  GripVertical,
  Heading1,
  Heading2,
  List,
  Plus,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  addMentalToolkitBlock,
  deleteMentalToolkitBlock,
  updateMentalToolkitBlock,
} from "@/actions/mental-toolkit";
import type { MentalToolkitBlockDTO, MentalToolkitBlockType, MentalToolkitSectionDTO } from "@/types/mental-toolkit";
import { cn } from "@/lib/utils";

const docField =
  "w-full resize-none border-0 bg-transparent p-0 shadow-none outline-none ring-0 focus:ring-0 placeholder:text-zinc-300 dark:placeholder:text-zinc-600";

const slashOptions: {
  type: MentalToolkitBlockType;
  label: string;
  description: string;
  icon: React.ElementType;
  keywords: string[];
}[] = [
  {
    type: "paragraph",
    label: "Text",
    description: "Plain text paragraph",
    icon: AlignLeft,
    keywords: ["text", "paragraph", "p"],
  },
  {
    type: "h1",
    label: "Heading 1",
    description: "Large section heading",
    icon: Heading1,
    keywords: ["h1", "heading", "title"],
  },
  {
    type: "h2",
    label: "Heading 2",
    description: "Medium section heading",
    icon: Heading2,
    keywords: ["h2", "subheading", "subtitle"],
  },
  {
    type: "bullet",
    label: "Bulleted list",
    description: "Create a bulleted list",
    icon: List,
    keywords: ["bullet", "list", "ul"],
  },
];

function filterSlashOptions(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return slashOptions;
  return slashOptions.filter(
    (option) =>
      option.label.toLowerCase().includes(q) ||
      option.description.toLowerCase().includes(q) ||
      option.keywords.some((keyword) => keyword.includes(q)),
  );
}

function blockPlaceholder(type: MentalToolkitBlockType) {
  switch (type) {
    case "h1":
      return "Heading 1";
    case "h2":
      return "Heading 2";
    case "bullet":
      return "List item";
    default:
      return "Type '/' for commands";
  }
}

function blockClassName(type: MentalToolkitBlockType) {
  switch (type) {
    case "h1":
      return "text-[1.75rem] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-[2rem]";
    case "h2":
      return "text-xl font-medium leading-snug tracking-tight text-zinc-800 dark:text-zinc-100";
    case "bullet":
      return "text-[15px] leading-[1.65] text-zinc-600 dark:text-zinc-300";
    default:
      return "min-h-[1.75rem] text-[15px] leading-[1.85] text-zinc-600 dark:text-zinc-300";
  }
}

function BlockSlashMenu({
  anchorRef,
  query,
  onSelect,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  query: string;
  onSelect: (type: MentalToolkitBlockType) => void;
  onClose: () => void;
}) {
  const options = filterSlashOptions(query);
  const [activeIndex, setActiveIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const menu = menuRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const menuHeight = menu?.offsetHeight ?? 280;
    const menuWidth = 288;
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + gap && rect.top > menuHeight + gap;

    const top = openUp ? rect.top - menuHeight - gap : rect.bottom + gap;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8));

    setPosition({ top, left });
  }, [anchorRef]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    updatePosition();
    const frame = requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [updatePosition, query, options.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, options.length - 1));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
      }
      if (event.key === "Enter" && options[activeIndex]) {
        event.preventDefault();
        onSelect(options[activeIndex].type);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, onClose, onSelect, options]);

  if (typeof document === "undefined") return null;

  const menuClassName =
    "w-72 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-800 dark:bg-zinc-950";

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[100]"
      style={{ top: position.top, left: position.left }}
    >
      {options.length === 0 ? (
        <div className={cn(menuClassName, "p-3 text-xs text-zinc-500 dark:text-zinc-400")}>
          No matching blocks
        </div>
      ) : (
        <div className={menuClassName}>
          <p className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400">
            Basic blocks
          </p>
          {options.map((option, index) => {
            const Icon = option.icon;
            return (
              <button
                key={option.type}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(option.type);
                }}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left transition",
                  index === activeIndex
                    ? "bg-zinc-100 dark:bg-zinc-900"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-900/60",
                )}
              >
                <span className="grid size-8 place-items-center rounded-lg border border-zinc-200/80 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-100">
                    {option.label}
                  </span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>,
    document.body,
  );
}

function BlockRow({
  block,
  autoFocus,
  onAutoFocusDone,
  onChangeLocal,
  onSave,
  onChangeType,
  onAddBelow,
  onDelete,
  onFocusPrevious,
}: {
  block: MentalToolkitBlockDTO;
  autoFocus?: boolean;
  onAutoFocusDone?: () => void;
  onChangeLocal: (content: string) => void;
  onSave: (content: string) => void;
  onChangeType: (type: MentalToolkitBlockType) => void;
  onAddBelow: (type: MentalToolkitBlockType) => void;
  onDelete: () => void;
  onFocusPrevious: () => void;
}) {
  const [value, setValue] = useState(block.content);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setValue(block.content);
  }, [block.content]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      onAutoFocusDone?.();
    }
  }, [autoFocus, onAutoFocusDone]);

  const handleValueChange = (next: string) => {
    setValue(next);
    if (next.startsWith("/")) {
      setSlashOpen(true);
      setSlashQuery(next.slice(1));
    } else {
      setSlashOpen(false);
      setSlashQuery("");
    }
    if (!next.startsWith("/")) {
      onChangeLocal(next);
    }
  };

  const applySlash = (type: MentalToolkitBlockType) => {
    setSlashOpen(false);
    setSlashQuery("");
    setValue("");
    onChangeType(type);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (slashOpen) return;

    if (event.key === "Enter" && block.type !== "paragraph" && !event.shiftKey) {
      event.preventDefault();
      onAddBelow(block.type === "bullet" ? "bullet" : "paragraph");
      return;
    }

    if (event.key === "Enter" && block.type === "paragraph" && !event.shiftKey) {
      event.preventDefault();
      onAddBelow("paragraph");
      return;
    }

    if (event.key === "Backspace" && value === "") {
      event.preventDefault();
      onDelete();
      onFocusPrevious();
    }
  };

  const handleBlur = () => {
    if (value.startsWith("/")) {
      setSlashOpen(false);
      setSlashQuery("");
      setValue("");
      onSave("");
    } else {
      onSave(value);
    }
  };

  const sharedProps = {
    value,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      handleValueChange(event.target.value),
    onKeyDown: handleKeyDown,
    onBlur: handleBlur,
    placeholder: blockPlaceholder(block.type),
    className: cn(docField, blockClassName(block.type)),
  };

  return (
    <div
      className="group relative flex items-start gap-1"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={cn(
          "flex w-8 shrink-0 items-center justify-end gap-0.5 pt-1 opacity-0 transition-opacity",
          (hovered || slashOpen) && "opacity-100",
        )}
      >
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              title="Add block"
              className="rounded-md p-1 text-zinc-300 transition hover:bg-zinc-100 hover:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-400"
            >
              <Plus className="size-3.5" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="start"
              side="right"
              sideOffset={8}
              className="z-50 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
            >
              {slashOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <DropdownMenu.Item
                    key={option.type}
                    onSelect={() => onAddBelow(option.type)}
                    className="flex cursor-default select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none transition hover:bg-zinc-100 focus:bg-zinc-100 dark:hover:bg-zinc-900 dark:focus:bg-zinc-900"
                  >
                    <Icon className="size-4 text-zinc-400" />
                    {option.label}
                  </DropdownMenu.Item>
                );
              })}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        <span className="cursor-grab p-1 text-zinc-200 dark:text-zinc-700">
          <GripVertical className="size-3.5" />
        </span>
      </div>

      <div ref={anchorRef} className="relative min-w-0 flex-1">
        {block.type === "paragraph" ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            rows={Math.max(1, value.split("\n").length)}
            {...sharedProps}
          />
        ) : (
          <div className="flex items-start gap-2.5">
            {block.type === "bullet" ? (
              <span className="mt-[0.55rem] size-1.5 shrink-0 rounded-full bg-zinc-400/90 dark:bg-zinc-500" />
            ) : null}
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              {...sharedProps}
              className={cn(sharedProps.className, "flex-1")}
            />
          </div>
        )}

        {slashOpen ? (
          <BlockSlashMenu
            anchorRef={anchorRef}
            query={slashQuery}
            onSelect={applySlash}
            onClose={() => {
              setSlashOpen(false);
              setSlashQuery("");
              setValue("");
              onSave("");
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

interface MentalToolkitBlockEditorProps {
  sectionId: string;
  blocks: MentalToolkitBlockDTO[];
  onSectionUpdate: (blocks: MentalToolkitBlockDTO[]) => void;
}

export function MentalToolkitBlockEditor({
  sectionId,
  blocks,
  onSectionUpdate,
}: MentalToolkitBlockEditorProps) {
  const [localBlocks, setLocalBlocks] = useState(blocks);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setLocalBlocks(blocks);
  }, [blocks]);

  const applySectionBlocks = (nextBlocks: MentalToolkitBlockDTO[]) => {
    setLocalBlocks(nextBlocks);
    onSectionUpdate(nextBlocks);
  };

  const runSectionUpdate = (runner: () => Promise<MentalToolkitSectionDTO>) => {
    startTransition(async () => {
      try {
        const updated = await runner();
        applySectionBlocks(updated.blocks);
      } catch (error) {
        console.error("Failed to update blocks:", error);
      }
    });
  };

  const handleSave = (blockId: string, content: string) => {
    setLocalBlocks((current) =>
      current.map((block) => (block._id === blockId ? { ...block, content } : block)),
    );
    runSectionUpdate(() => updateMentalToolkitBlock(sectionId, blockId, { content }));
  };

  const handleChangeType = (blockId: string, type: MentalToolkitBlockType) => {
    setLocalBlocks((current) =>
      current.map((block) =>
        block._id === blockId ? { ...block, type, content: "" } : block,
      ),
    );
    runSectionUpdate(() =>
      updateMentalToolkitBlock(sectionId, blockId, { type, content: "" }),
    );
  };

  const handleAddBelow = (afterBlockId: string, type: MentalToolkitBlockType) => {
    runSectionUpdate(async () => {
      const updated = await addMentalToolkitBlock(sectionId, type, afterBlockId);
      const index = updated.blocks.findIndex((block) => block._id === afterBlockId);
      const newBlock = index >= 0 ? updated.blocks[index + 1] : updated.blocks.at(-1);
      if (newBlock) setFocusBlockId(newBlock._id);
      return updated;
    });
  };

  const handleDelete = (blockId: string) => {
    const index = localBlocks.findIndex((block) => block._id === blockId);
    const previousBlock = index > 0 ? localBlocks[index - 1] : null;

    runSectionUpdate(async () => {
      const updated = await deleteMentalToolkitBlock(sectionId, blockId);
      if (previousBlock) setFocusBlockId(previousBlock._id);
      return updated;
    });
  };

  const displayBlocks =
    localBlocks.length > 0
      ? localBlocks
      : [{ _id: "placeholder", type: "paragraph" as const, content: "", order: 0 }];

  return (
    <div className="space-y-0">
      {displayBlocks.map((block, index) => {
        const previous = displayBlocks[index - 1];
        const tightWithPrevious = block.type === "bullet" && previous?.type === "bullet";

        return (
          <div key={block._id} className={cn(tightWithPrevious ? "-mt-0.5" : "mt-1.5")}>
            <BlockRow
              block={block}
              autoFocus={focusBlockId === block._id}
              onAutoFocusDone={() => setFocusBlockId(null)}
              onChangeLocal={(content) =>
                setLocalBlocks((current) =>
                  current.map((item) => (item._id === block._id ? { ...item, content } : item)),
                )
              }
              onSave={(content) => handleSave(block._id, content)}
              onChangeType={(type) => handleChangeType(block._id, type)}
              onAddBelow={(type) => handleAddBelow(block._id, type)}
              onDelete={() => handleDelete(block._id)}
              onFocusPrevious={() => {
                const previousBlock = displayBlocks[index - 1];
                if (previousBlock) setFocusBlockId(previousBlock._id);
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
