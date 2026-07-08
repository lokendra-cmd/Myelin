"use client";

import { useCallback, useRef } from "react";

export function useDebouncedCallback<Args extends unknown[]>(callback: (...args: Args) => void, delay = 500) {
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (...args: Args) => {
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay],
  );
}
