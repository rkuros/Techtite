import type { ReactNode } from "react";

interface StatusBarProps {
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
}

export function StatusBar({ leftSlot, rightSlot }: StatusBarProps) {
  return (
    <div
      className="flex items-center justify-between px-3"
      style={{
        height: 24,
        minHeight: 24,
        backgroundColor: "var(--color-statusbar-bg)",
        borderTop: "1px solid var(--color-border-subtle)",
        color: "var(--color-text-muted)",
        fontSize: 11,
      }}
    >
      <div className="flex items-center gap-3">
        {/* Unit 6: Branch name, sync status */}
        {leftSlot ?? <span>Techtite v0.1.0</span>}
      </div>
      <div className="flex items-center gap-3">
        {/* Unit 5: RAG status | Unit 7: Agent count | Unit 9: API cost */}
        {rightSlot}
      </div>
    </div>
  );
}
