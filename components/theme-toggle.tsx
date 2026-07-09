"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Theme toggle button.
 *
 * Renders null until after hydration to prevent a server/client mismatch.
 * `resolvedTheme` is always a concrete "light" | "dark" value — never
 * undefined — once the component is mounted, so no extra guards are needed
 * beyond the `mounted` flag.
 */
export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  // Only render after first client-side paint to avoid hydration mismatch.
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Reserve space so the header doesn't shift when the icon appears.
    return <div className="size-9" aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
