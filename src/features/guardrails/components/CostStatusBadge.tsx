import { useEffect } from "react";
import { useCostStore } from "@/stores/cost-store";

/**
 * CostStatusBadge -- StatusBar badge showing current spending vs daily budget.
 *
 * Displays in the format "$X.XX / $Y.YY" and changes color based on
 * budget usage:
 * - Normal (muted text): under warning threshold
 * - Yellow: at or above warning threshold
 * - Red: at or above daily limit
 *
 * Hidden when no budget or summary data is available.
 */
export function CostStatusBadge() {
  const summary = useCostStore((s) => s.summary);
  const budget = useCostStore((s) => s.budget);
  const fetchSummary = useCostStore((s) => s.fetchSummary);
  const fetchBudget = useCostStore((s) => s.fetchBudget);

  useEffect(() => {
    fetchSummary("daily");
    fetchBudget();
  }, [fetchSummary, fetchBudget]);

  if (!summary || !budget) {
    return null;
  }

  const currentUsd = summary.totalCostUsd;
  const limitUsd = budget.dailyLimitUsd ?? 0;
  const ratio = limitUsd > 0 ? currentUsd / limitUsd : 0;

  let textColor: string;
  if (ratio >= 1.0) {
    textColor = "#ef4444"; // red
  } else if (ratio >= (budget.warningThreshold ?? 0.8)) {
    textColor = "#eab308"; // yellow
  } else {
    textColor = "var(--color-text-muted)";
  }

  return (
    <span
      className="flex items-center gap-1 px-1.5 py-0.5 font-mono"
      style={{
        fontSize: 11,
        color: textColor,
      }}
      title={`Daily cost: $${currentUsd.toFixed(2)} / $${limitUsd.toFixed(2)}`}
    >
      ${currentUsd.toFixed(2)} / ${limitUsd.toFixed(2)}
    </span>
  );
}
