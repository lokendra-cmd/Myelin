import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-200/80 bg-white/80 shadow-sm shadow-zinc-950/[0.03] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70",
        className,
      )}
      {...props}
    />
  );
}
