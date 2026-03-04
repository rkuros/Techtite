import { useEffect } from "react";
import { listenEvent } from "@/shared/utils/ipc";

/**
 * Hook for subscribing to Tauri events.
 * Automatically cleans up the listener on unmount.
 */
export function useEventListener<T>(
  event: string,
  handler: (payload: T) => void
) {
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listenEvent<T>(event, handler).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [event, handler]);
}
