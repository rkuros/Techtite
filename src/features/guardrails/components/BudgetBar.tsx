interface BudgetBarProps {
  /** Current spending in USD. */
  currentUsd: number;
  /** Budget limit in USD. */
  limitUsd: number;
  /** Warning threshold as a fraction (0.0 - 1.0). Defaults to 0.8. */
  warningThreshold?: number;
  /** Optional label displayed above the bar. */
  label?: string;
}

/**
 * BudgetBar -- Visual progress bar for budget usage.
 *
 * Color scheme:
 * - Green (accent): usage < warning threshold
 * - Yellow: usage >= warning threshold but < 100%
 * - Red: usage >= 100% (over budget)
 */
export function BudgetBar({
  currentUsd,
  limitUsd,
  warningThreshold = 0.8,
  label,
}: BudgetBarProps) {
  const ratio = limitUsd > 0 ? currentUsd / limitUsd : 0;
  const percentage = Math.min(ratio * 100, 100);

  let barColor: string;
  if (ratio >= 1.0) {
    barColor = "#ef4444"; // red
  } else if (ratio >= warningThreshold) {
    barColor = "#eab308"; // yellow
  } else {
    barColor = "var(--color-accent, #3b82f6)"; // accent / blue
  }

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="flex items-center justify-between">
          <span
            className="text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            {label}
          </span>
          <span
            className="text-xs font-mono"
            style={{ color: "var(--color-text-secondary)" }}
          >
            ${currentUsd.toFixed(2)} / ${limitUsd.toFixed(2)}
          </span>
        </div>
      )}
      <div
        className="w-full rounded-full overflow-hidden"
        style={{
          height: 6,
          backgroundColor: "var(--color-bg-hover, #374151)",
        }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
    </div>
  );
}
