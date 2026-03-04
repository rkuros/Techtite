import { useEffect, useState } from "react";
import { useCostStore } from "@/stores/cost-store";
import { BudgetBar } from "./BudgetBar";
import type { DailyCostPoint } from "@/types/cost";

/**
 * CostDisplay -- Cost dashboard panel.
 *
 * Shows:
 * - Period selector (daily / weekly / monthly)
 * - Total cost and token counts
 * - Budget usage bars (daily + monthly)
 * - Per-agent cost breakdown table
 * - Simple CSS bar chart for daily cost trend
 */
export function CostDisplay() {
  const summary = useCostStore((s) => s.summary);
  const trend = useCostStore((s) => s.trend);
  const budget = useCostStore((s) => s.budget);
  const isLoadingSummary = useCostStore((s) => s.isLoadingSummary);
  const fetchSummary = useCostStore((s) => s.fetchSummary);
  const fetchTrend = useCostStore((s) => s.fetchTrend);
  const fetchBudget = useCostStore((s) => s.fetchBudget);

  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">(
    "daily"
  );

  useEffect(() => {
    fetchSummary(period);
    fetchBudget();
    fetchTrend(30);
  }, [period, fetchSummary, fetchBudget, fetchTrend]);

  return (
    <div
      className="flex flex-col gap-3 p-3"
      style={{ color: "var(--color-text)" }}
    >
      {/* Period selector */}
      <div className="flex items-center gap-1">
        {(["daily", "weekly", "monthly"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className="px-2 py-0.5 rounded text-xs transition-colors"
            style={{
              backgroundColor:
                period === p
                  ? "var(--color-accent, #3b82f6)"
                  : "var(--color-bg-hover)",
              color:
                period === p ? "#fff" : "var(--color-text-secondary)",
              border: "none",
              cursor: "pointer",
            }}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Summary */}
      {isLoadingSummary ? (
        <div
          className="text-xs"
          style={{ color: "var(--color-text-muted)" }}
        >
          Loading...
        </div>
      ) : summary ? (
        <div className="flex flex-col gap-2">
          {/* Total cost */}
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-mono font-bold">
              ${summary.totalCostUsd.toFixed(2)}
            </span>
            <span
              className="text-xs"
              style={{ color: "var(--color-text-muted)" }}
            >
              {formatTokenCount(
                summary.totalInputTokens + summary.totalOutputTokens
              )}{" "}
              tokens
            </span>
          </div>

          {/* Token breakdown */}
          <div
            className="flex gap-3 text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <span>
              In: {formatTokenCount(summary.totalInputTokens)}
            </span>
            <span>
              Out: {formatTokenCount(summary.totalOutputTokens)}
            </span>
          </div>

          {/* Budget bars */}
          {budget && (
            <div className="flex flex-col gap-2 mt-1">
              <BudgetBar
                currentUsd={summary.totalCostUsd}
                limitUsd={budget.dailyLimitUsd ?? 0}
                warningThreshold={budget.warningThreshold}
                label="Daily Budget"
              />
              <BudgetBar
                currentUsd={summary.totalCostUsd}
                limitUsd={budget.monthlyLimitUsd ?? 0}
                warningThreshold={budget.warningThreshold}
                label="Monthly Budget"
              />
            </div>
          )}

          {/* Agent breakdown */}
          {summary.byAgent.length > 0 && (
            <div className="flex flex-col gap-1 mt-2">
              <span
                className="text-xs font-medium"
                style={{ color: "var(--color-text-muted)" }}
              >
                By Agent
              </span>
              {summary.byAgent.map((agent) => (
                <div
                  key={agent.agentId}
                  className="flex items-center justify-between text-xs py-0.5"
                  style={{
                    borderBottom:
                      "1px solid var(--color-border-subtle)",
                  }}
                >
                  <span className="truncate flex-1">
                    {agent.agentName}
                  </span>
                  <span
                    className="font-mono shrink-0 ml-2"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    ${agent.costUsd.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Daily cost chart */}
          {trend.length > 0 && <DailyCostChart data={trend} />}
        </div>
      ) : (
        <div
          className="text-xs"
          style={{ color: "var(--color-text-muted)" }}
        >
          No cost data available
        </div>
      )}
    </div>
  );
}

/**
 * Simple CSS bar chart showing daily costs.
 *
 * Each bar's height is proportional to the maximum daily cost in the dataset.
 * Hover shows the date and cost.
 */
function DailyCostChart({ data }: { data: DailyCostPoint[] }) {
  const maxCost = Math.max(...data.map((d) => d.costUsd), 0.01);

  return (
    <div className="flex flex-col gap-1 mt-2">
      <span
        className="text-xs font-medium"
        style={{ color: "var(--color-text-muted)" }}
      >
        Daily Trend (30d)
      </span>
      <div
        className="flex items-end gap-px"
        style={{ height: 60 }}
      >
        {data.map((point) => {
          const heightPct = (point.costUsd / maxCost) * 100;
          return (
            <div
              key={point.date}
              className="flex-1 rounded-t transition-all"
              style={{
                height: `${Math.max(heightPct, 2)}%`,
                backgroundColor:
                  point.costUsd > 0
                    ? "var(--color-accent, #3b82f6)"
                    : "var(--color-bg-hover)",
                minWidth: 2,
              }}
              title={`${point.date}: $${point.costUsd.toFixed(2)}`}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * Format large token counts with K/M suffixes.
 */
function formatTokenCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return count.toString();
}
