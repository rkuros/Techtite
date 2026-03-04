import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

/**
 * Type-safe IPC command invocation wrapper.
 * In dev mode with mock handlers registered, uses mocks instead of Tauri IPC.
 */
const mockHandlers: Record<string, (args?: Record<string, unknown>) => unknown> =
  {};

export function registerMockHandler(
  cmd: string,
  handler: (args?: Record<string, unknown>) => unknown
) {
  mockHandlers[cmd] = handler;
}

export async function invokeCommand<T>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  if (import.meta.env.DEV && mockHandlers[cmd]) {
    return mockHandlers[cmd](args) as T;
  }
  return invoke<T>(cmd, args);
}

/**
 * Type-safe event listener wrapper.
 * Returns an unlisten function to clean up the subscription.
 */
export function listenEvent<T>(
  event: string,
  handler: (payload: T) => void
): Promise<UnlistenFn> {
  return listen<T>(event, (e) => handler(e.payload));
}

/**
 * Dev-only: emit a mock event for testing event subscriptions.
 */
export function emitMockEvent(event: string, payload: unknown) {
  if (import.meta.env.DEV) {
    window.dispatchEvent(
      new CustomEvent(`tauri://${event}`, { detail: payload })
    );
  }
}
