"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Folder, X } from "lucide-react";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";

function DynamicIcon({
  name,
  className,
  fallback = Folder,
}: {
  name?: string;
  className?: string;
  fallback?: React.ComponentType<{ className?: string }>;
}) {
  if (!name) {
    const FallbackIcon = fallback;
    return <FallbackIcon className={className} />;
  }
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  if (!Icon) {
    const FallbackIcon = fallback;
    return <FallbackIcon className={className} />;
  }
  return <Icon className={className} />;
}

interface ModalHeaderProps {
  iconName?: string;
  defaultIcon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  accentBg?: string;
  accentText?: string;
}

export function ModalHeader({
  iconName,
  defaultIcon,
  title,
  description,
  accentBg = "bg-violet-100",
  accentText = "text-violet-700",
}: ModalHeaderProps) {
  return (
    <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800/80 px-5 py-4">
      <div className={cn("size-9 rounded-xl flex items-center justify-center shrink-0", accentBg)}>
        <DynamicIcon name={iconName} className={cn("size-5", accentText)} fallback={defaultIcon} />
      </div>
      <div className="flex-1 min-w-0">
        <Dialog.Title className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
          {title || "Create"}
        </Dialog.Title>
        {description && (
          <Dialog.Description className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
            {description}
          </Dialog.Description>
        )}
      </div>
      <Dialog.Close asChild>
        <button
          className="shrink-0 size-7 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </Dialog.Close>
    </div>
  );
}

export { DynamicIcon };
