"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import type { AnalyticsRange } from "@/types/sprint";

const PRESETS: Array<{ value: AnalyticsRange; label: string }> = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom" },
];

export function AnalyticsRangeFilter({
  range,
  from,
  to,
}: {
  range: AnalyticsRange;
  from: string | null;
  to: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [customFrom, setCustomFrom] = useState(from ?? "");
  const [customTo, setCustomTo] = useState(to ?? "");

  function navigate(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className={`flex flex-col gap-3 ${pending ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => {
          const active = range === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => {
                if (preset.value === "custom") {
                  const fallbackTo = to || new Date().toISOString().slice(0, 10);
                  const start = new Date(`${fallbackTo}T00:00:00Z`);
                  start.setUTCDate(start.getUTCDate() - 6);
                  const fallbackFrom = from || start.toISOString().slice(0, 10);
                  setCustomFrom(customFrom || fallbackFrom);
                  setCustomTo(customTo || fallbackTo);
                  navigate({
                    range: "custom",
                    from: customFrom || fallbackFrom,
                    to: customTo || fallbackTo,
                  });
                  return;
                }
                navigate({ range: preset.value, from: null, to: null });
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "bg-accent text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      {range === "custom" && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!customFrom || !customTo) return;
            navigate({ range: "custom", from: customFrom, to: customTo });
          }}
        >
          <label className="text-xs text-zinc-500">
            From
            <input
              type="date"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
              className="mt-1 block rounded-lg border border-zinc-200 bg-transparent px-2 py-1.5 text-sm dark:border-zinc-700"
            />
          </label>
          <label className="text-xs text-zinc-500">
            To
            <input
              type="date"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
              className="mt-1 block rounded-lg border border-zinc-200 bg-transparent px-2 py-1.5 text-sm dark:border-zinc-700"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Apply
          </button>
        </form>
      )}
    </div>
  );
}
