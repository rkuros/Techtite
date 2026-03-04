import { useCallback, useState } from "react";
import { invokeCommand } from "@/shared/utils/ipc";

/**
 * Hook for calling IPC commands with loading/error state.
 */
export function useIpc<T>(cmd: string) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (args?: Record<string, unknown>) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await invokeCommand<T>(cmd, args);
        setData(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cmd]
  );

  return { data, isLoading, error, execute };
}
