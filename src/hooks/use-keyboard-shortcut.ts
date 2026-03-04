import { useEffect } from "react";

interface ShortcutOptions {
  key: string;
  ctrlOrCmd?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: (e: KeyboardEvent) => void;
  enabled?: boolean;
}

/**
 * Hook for registering keyboard shortcuts.
 * Uses Cmd on macOS, Ctrl on other platforms.
 */
export function useKeyboardShortcut({
  key,
  ctrlOrCmd = false,
  shift = false,
  alt = false,
  handler,
  enabled = true,
}: ShortcutOptions) {
  useEffect(() => {
    if (!enabled) return;

    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      const modMatch = ctrlOrCmd
        ? isMac
          ? e.metaKey
          : e.ctrlKey
        : true;
      const shiftMatch = shift ? e.shiftKey : !e.shiftKey;
      const altMatch = alt ? e.altKey : !e.altKey;

      if (modMatch && shiftMatch && altMatch && e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        handler(e);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [key, ctrlOrCmd, shift, alt, handler, enabled]);
}
