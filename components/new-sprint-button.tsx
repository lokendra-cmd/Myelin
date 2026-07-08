"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { CalendarDays, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type NewSprintButtonProps = {
  label?: string;
  size?: "sm" | "md";
};

export function NewSprintButton({ label = "New Myelin", size = "md" }: NewSprintButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayInputValue());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createOrOpenSprint(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/sprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });

      if (!res.ok) throw new Error("Could not create sprint");
      const sprint = await res.json();
      setOpen(false);
      router.push(`/sprints/${sprint._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button size={size}>
          <Plus className="size-4" />
          {label}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm dark:bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-24 z-50 w-[min(92vw,420px)] -translate-x-1/2 rounded-lg border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-md bg-zinc-100 dark:bg-zinc-900">
              <CalendarDays className="size-5 text-zinc-500" />
            </div>
            <div>
              <Dialog.Title className="text-lg font-semibold">New Myelin</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-zinc-500">
                Pick a date. If a sprint already exists for that day, Myelin will open it.
              </Dialog.Description>
            </div>
          </div>

          <form onSubmit={createOrOpenSprint} className="mt-5 space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-medium text-zinc-500">Myelin date</span>
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
            </label>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost">Cancel</Button>
              </Dialog.Close>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Create or Open
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function todayInputValue() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
