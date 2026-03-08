import { useCallback } from "react";
import { useEditorStore } from "@/stores/editor-store";
import type { ChatMessage as ChatMessageType } from "@/stores/semantic-store";

interface ChatMessageProps {
  message: ChatMessageType;
  isLoading?: boolean;
}

/**
 * ChatMessage -- Renders a single chat message (user or assistant).
 *
 * - User messages: right-aligned with accent background
 * - Assistant messages: left-aligned with reference document links
 * - Loading state: shows animated dots for in-progress responses
 */
export function ChatMessage({ message, isLoading }: ChatMessageProps) {
  const openTab = useEditorStore((s) => s.openTab);

  const handleReferenceClick = useCallback(
    (filePath: string) => {
      openTab(filePath);
    },
    [openTab]
  );

  const isUser = message.role === "user";

  return (
    <div
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {/* Message content */}
        {isLoading ? (
          <div className="flex items-center gap-1 py-1">
            <span
              className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
          </p>
        )}

        {/* Reference links (assistant messages only) */}
        {!isUser &&
          message.references &&
          message.references.length > 0 && (
            <div className="mt-2 border-t border-border/50 pt-2">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                References
              </span>
              <div className="mt-1 flex flex-col gap-1">
                {message.references.map((ref, idx) => (
                  <button
                    key={`${ref.filePath}-${idx}`}
                    className="flex items-baseline gap-1.5 rounded px-1.5 py-0.5 text-left text-xs transition-colors hover:bg-background/50"
                    onClick={() => handleReferenceClick(ref.filePath)}
                  >
                    <span className="shrink-0 text-primary">
                      [{idx + 1}]
                    </span>
                    <span className="truncate text-foreground">
                      {ref.filePath}
                    </span>
                    {ref.sectionHeading && (
                      <span className="shrink-0 text-muted-foreground">
                        - {ref.sectionHeading}
                      </span>
                    )}
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      ({Math.round(ref.score * 100)}%)
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

        {/* Timestamp */}
        <div
          className={`mt-1 text-[10px] ${
            isUser
              ? "text-primary-foreground/60"
              : "text-muted-foreground"
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;
