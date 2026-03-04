import { useEffect, useState } from "react";
import { useCostStore } from "@/stores/cost-store";

/**
 * CredentialManager -- UI for managing stored API keys and secrets.
 *
 * Displays a table of credential entries (key, service, last updated)
 * with add and delete actions. Secret values are never displayed.
 */
export function CredentialManager() {
  const credentials = useCostStore((s) => s.credentials);
  const isLoading = useCostStore((s) => s.isLoadingCredentials);
  const fetchCredentials = useCostStore((s) => s.fetchCredentials);
  const addCredential = useCostStore((s) => s.addCredential);
  const deleteCredential = useCostStore((s) => s.deleteCredential);

  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newService, setNewService] = useState("");

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const handleAdd = async () => {
    if (!newKey.trim() || !newValue.trim()) return;

    await addCredential(
      newKey.trim(),
      newValue.trim(),
      newService.trim() || "default"
    );
    setNewKey("");
    setNewValue("");
    setNewService("");
    setIsAdding(false);
  };

  const handleDelete = async (key: string) => {
    await deleteCredential(key);
  };

  return (
    <div
      className="flex flex-col gap-3 p-3"
      style={{ color: "var(--color-text)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Credentials</span>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-2 py-0.5 rounded text-xs transition-colors"
          style={{
            backgroundColor: "var(--color-accent, #3b82f6)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          {isAdding ? "Cancel" : "Add"}
        </button>
      </div>

      {/* Add form */}
      {isAdding && (
        <div
          className="flex flex-col gap-2 p-2 rounded"
          style={{
            backgroundColor: "var(--color-bg-surface)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <input
            type="text"
            placeholder="Key (e.g. ANTHROPIC_API_KEY)"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="w-full px-2 py-1 rounded text-xs"
            style={{
              backgroundColor: "var(--color-bg-input, var(--color-bg))",
              color: "var(--color-text)",
              border: "1px solid var(--color-border-subtle)",
              outline: "none",
            }}
          />
          <input
            type="password"
            placeholder="Value (secret)"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="w-full px-2 py-1 rounded text-xs"
            style={{
              backgroundColor: "var(--color-bg-input, var(--color-bg))",
              color: "var(--color-text)",
              border: "1px solid var(--color-border-subtle)",
              outline: "none",
            }}
          />
          <input
            type="text"
            placeholder="Service (e.g. anthropic)"
            value={newService}
            onChange={(e) => setNewService(e.target.value)}
            className="w-full px-2 py-1 rounded text-xs"
            style={{
              backgroundColor: "var(--color-bg-input, var(--color-bg))",
              color: "var(--color-text)",
              border: "1px solid var(--color-border-subtle)",
              outline: "none",
            }}
          />
          <button
            onClick={handleAdd}
            disabled={!newKey.trim() || !newValue.trim()}
            className="self-end px-3 py-1 rounded text-xs transition-colors"
            style={{
              backgroundColor:
                newKey.trim() && newValue.trim()
                  ? "var(--color-accent, #3b82f6)"
                  : "var(--color-bg-hover)",
              color:
                newKey.trim() && newValue.trim()
                  ? "#fff"
                  : "var(--color-text-muted)",
              border: "none",
              cursor:
                newKey.trim() && newValue.trim()
                  ? "pointer"
                  : "not-allowed",
            }}
          >
            Save
          </button>
        </div>
      )}

      {/* Credential table */}
      {isLoading ? (
        <div
          className="text-xs"
          style={{ color: "var(--color-text-muted)" }}
        >
          Loading...
        </div>
      ) : credentials.length === 0 ? (
        <div
          className="text-xs"
          style={{ color: "var(--color-text-muted)" }}
        >
          No credentials stored
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {credentials.map((cred) => (
            <div
              key={cred.key}
              className="flex items-center gap-2 p-2 rounded"
              style={{
                backgroundColor: "var(--color-bg-surface)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-xs font-mono truncate">
                  {cred.key}
                </span>
                <span
                  className="text-xs truncate"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {cred.service} -- updated{" "}
                  {formatRelativeTime(cred.lastUpdatedAt)}
                </span>
              </div>
              <button
                onClick={() => handleDelete(cred.key)}
                className="px-2 py-0.5 rounded text-xs shrink-0 transition-colors"
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  color: "#ef4444",
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.8";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Format an ISO timestamp as a relative time string (e.g. "2 hours ago").
 */
function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  } catch {
    return isoString;
  }
}
