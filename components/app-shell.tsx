"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, Command, Home, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/command-palette";
import { NewSprintButton } from "@/components/new-sprint-button";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/store";

const nav = [
  { href: "/", label: "Today", icon: Home },
  { href: "/review", label: "Review", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const setCommandOpen = useUIStore((state) => state.setCommandOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dark = mounted && theme === "dark";

  return (
    <div
      className="min-h-screen bg-[#f7f7f5] text-zinc-950 dark:bg-[#090909] dark:text-zinc-50"
      style={{ colorScheme: dark ? "dark" : "light" }}
    >
      <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-[#f7f7f5]/80 backdrop-blur-xl dark:border-zinc-800 dark:bg-[#090909]/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <span className="grid size-7 place-items-center rounded-md bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950">M</span>
            Myelin
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm text-zinc-500 transition hover:bg-zinc-200/60 hover:text-zinc-950 dark:hover:bg-zinc-900 dark:hover:text-zinc-50",
                  pathname === item.href && "bg-white text-zinc-950 shadow-sm dark:bg-zinc-900 dark:text-zinc-50",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" title="Command palette" onClick={() => setCommandOpen(true)}>
              <Command className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Theme" onClick={() => setTheme(dark ? "light" : "dark")}>
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <NewSprintButton size="sm" />
          </div>
        </div>
      </header>
      {children}
      <CommandPalette />
    </div>
  );
}
