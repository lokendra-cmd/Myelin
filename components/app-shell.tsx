"use client";

import { useEffect, useState } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, CalendarDays, Command, Home, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/command-palette";
import { NewSprintButton } from "@/components/new-sprint-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/store";

const nav = [
  { href: "/", label: "Today", icon: Home },
  { href: "/review", label: "Review", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/brain-dump", label: "Brain Dump", icon: Brain },
];

function NavLinkContent({
  label,
  icon: Icon,
  active,
}: {
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
  const { pending } = useLinkStatus();

  useEffect(() => {
    if (!pending) return;
    window.dispatchEvent(new CustomEvent("myelin:nav-pending", { detail: true }));
    return () => {
      window.dispatchEvent(new CustomEvent("myelin:nav-pending", { detail: false }));
    };
  }, [pending]);

  return (
    <span
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm transition",
        active
          ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
          : "text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-950 dark:hover:bg-zinc-900 dark:hover:text-zinc-50",
        pending && "bg-zinc-200/80 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50",
      )}
    >
      <span className="relative grid size-4 place-items-center">
        <Icon
          className={cn(
            "size-4 transition-opacity",
            pending && "opacity-0",
          )}
        />
        {pending ? (
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-zinc-400 border-t-zinc-950 dark:border-zinc-600 dark:border-t-zinc-50"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
          />
        ) : null}
      </span>
      {label}
    </span>
  );
}

function NavigationProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    const onPending = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail;
      setActive(Boolean(detail));
    };
    window.addEventListener("myelin:nav-pending", onPending);
    return () => window.removeEventListener("myelin:nav-pending", onPending);
  }, []);

  useEffect(() => {
    setActive(false);
  }, [pathname]);

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="h-full w-1/3 bg-zinc-950 dark:bg-zinc-50"
            initial={{ x: "-100%" }}
            animate={{ x: "400%" }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const setCommandOpen = useUIStore((state) => state.setCommandOpen);

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return decodeURIComponent(parts.pop()!.split(";").shift()!);
      return null;
    };
    if (getCookie("timezone") !== tz) {
      document.cookie = `timezone=${encodeURIComponent(tz)}; path=/; max-age=31536000; SameSite=Lax`;
      window.location.reload();
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-zinc-950 dark:bg-[#090909] dark:text-zinc-50">
      <NavigationProgress />
      <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-[#f7f7f5]/80 backdrop-blur-xl dark:border-zinc-800 dark:bg-[#090909]/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <span className="grid size-7 place-items-center rounded-md bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950">M</span>
            Myelin
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} prefetch>
                <NavLinkContent
                  label={item.label}
                  icon={item.icon}
                  active={pathname === item.href}
                />
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" title="Command palette" onClick={() => setCommandOpen(true)}>
              <Command className="size-4" />
            </Button>
            <ThemeToggle />
            <NewSprintButton size="sm" />
          </div>
        </div>
      </header>
      {children}
      <CommandPalette />
    </div>
  );
}
