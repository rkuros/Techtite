import { useCallback, useEffect, useRef, useState } from "react";
import { useSemanticStore, type ChatMessage as ChatMessageType } from "@/stores/semantic-store";
import { ChatMessage } from "./ChatMessage";

/**
 * AIChat -- Floating chat panel for RAG-powered AI conversation.
 *
 * Features:
 * - Chat message history (scrollable, auto-scrolls to bottom)
 * - Input field (Enter to send, Shift+Enter for newline)
 * - Expand/collapse toggle
 * - Reference document links in AI responses
 * - Clear conversation button
 */
export function AIChat() {
  const {
    chatMessages,
    isChatLoading,
    sendChatMessage,
    clearChat,
  } = useSemanticStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  // Handle send
  const handleSend = useCallback(() => {
    if (!inputValue.trim() || isChatLoading) return;
    sendChatMessage(inputValue.trim());
    setInputValue("");
  }, [inputValue, isChatLoading, sendChatMessage]);

  // Handle keyboard
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Loading placeholder message
  const loadingMessage: ChatMessageType = {
    id: "loading",
    role: "assistant",
    content: "",
    timestamp: Date.now(),
  };

  if (!isExpanded) {
    // Collapsed state: just a toggle button
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsExpanded(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
          title="Open AI Chat"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {chatMessages.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {chatMessages.length}
            </span>
          )}
        </button>
      </div>
    );
  }

  // Expanded state: full chat panel
  return (
    <div className="fixed bottom-4 right-4 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-lg border border-border bg-background shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-2">
        <h3 className="text-sm font-semibold">AI Chat</h3>
        <div className="flex items-center gap-1">
          {chatMessages.length > 0 && (
            <button
              onClick={clearChat}
              className="rounded p-1 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              title="Clear conversation"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
          <button
            onClick={() => setIsExpanded(false)}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            title="Minimize chat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
            >
              <polyline points="4 14 10 14 10 20" />
              <polyline points="20 10 14 10 14 4" />
              <line x1="14" y1="10" x2="21" y2="3" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {chatMessages.length === 0 && !isChatLoading && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Ask a question about your notes
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                AI will search your vault for relevant context
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {chatMessages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isChatLoading && (
            <ChatMessage message={loadingMessage} isLoading />
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border px-3 py-2">
        <div className="flex gap-1.5">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="min-h-[36px] min-w-0 flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={handleSend}
            disabled={isChatLoading || !inputValue.trim()}
            className="flex shrink-0 items-center justify-center rounded-md bg-primary px-3 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            title="Send message"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <div className="mt-1 text-[10px] text-muted-foreground">
          Enter to send, Shift+Enter for newline
        </div>
      </div>
    </div>
  );
}

export default AIChat;
