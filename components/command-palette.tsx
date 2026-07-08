"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, Sparkles, SquarePen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useUIStore } from "@/lib/store";
import type { SprintDTO } from "@/types/sprint";

export function CommandPalette() {
  const open = useUIStore((state) => state.commandOpen);
  const setOpen = useUIStore((state) => state.setCommandOpen);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SprintDTO[]>([]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "/" && !open) {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open || query.length < 2) {
      setResults([]);
      return;
    }
    const id = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      setResults(await res.json());
    }, 250);
    return () => clearTimeout(id);
  }, [open, query]);

  const actions = useMemo(
    () => [
      {
        label: "Open Today's Myelin",
        icon: Sparkles,
        run: async () => {
          const res = await fetch("/api/sprints", { method: "POST", body: JSON.stringify({}) });
          const sprint = await res.json();
          router.push(`/sprints/${sprint._id}`);
          setOpen(false);
        },
      },
      {
        label: "Quick Add Task",
        icon: SquarePen,
        run: async () => {
          const res = await fetch("/api/sprints", { method: "POST", body: JSON.stringify({}) });
          const sprint = await res.json();
          router.push(`/sprints/${sprint._id}?new=1`);
          setOpen(false);
        },
      },
    ],
    [router, setOpen],
  );

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm dark:bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-20 z-50 w-[min(92vw,620px)] -translate-x-1/2 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <Search className="size-4 text-zinc-400" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search sprints or run a command"
              className="border-0 bg-transparent px-0 shadow-none focus:border-0"
            />
          </div>
          <div className="max-h-[420px] overflow-y-auto p-2">
            {actions.map((action) => (
              <button key={action.label} onClick={action.run} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900">
                <action.icon className="size-4 text-zinc-500" />
                {action.label}
              </button>
            ))}
            {results.map((sprint) => (
              <button
                key={sprint._id}
                onClick={() => {
                  router.push(`/sprints/${sprint._id}`);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <span>{sprint.title}</span>
                <span className="text-xs text-zinc-500">{sprint.productivity}%</span>
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
