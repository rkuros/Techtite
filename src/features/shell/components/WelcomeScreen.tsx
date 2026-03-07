import { useEffect, useState } from "react";
import { useVaultStore } from "@/stores/vault-store";
import { invokeCommand } from "@/shared/utils/ipc";

export function WelcomeScreen() {
  const openVault = useVaultStore((s) => s.openVault);
  const selectFolder = useVaultStore((s) => s.selectFolder);
  const isLoading = useVaultStore((s) => s.isLoading);
  const error = useVaultStore((s) => s.error);

  const [isCreating, setIsCreating] = useState(false);
  const [vaultName, setVaultName] = useState("");
  const [parentPath, setParentPath] = useState<string | null>(null);

  // Load home directory as default location
  useEffect(() => {
    invokeCommand<string>("get_home_dir")
      .then((home) => setParentPath(home))
      .catch(() => {});
  }, []);

  const handleOpen = async () => {
    const path = await selectFolder();
    if (path) {
      await openVault(path);
    }
  };

  const handleChangeLocation = async () => {
    const path = await selectFolder();
    if (path) {
      setParentPath(path);
    }
  };

  const handleCreate = async () => {
    const trimmed = vaultName.trim();
    if (!trimmed || !parentPath) return;

    const vaultPath = `${parentPath}/${trimmed}`;
    try {
      await invokeCommand("create_vault_dir", { path: vaultPath });
      await openVault(vaultPath);
    } catch (err) {
      console.error("Failed to create vault:", err);
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-6"
      style={{ color: "var(--color-text-primary)" }}
    >
      <div className="text-4xl font-bold tracking-tight">Techtite</div>
      <div
        className="text-sm"
        style={{ color: "var(--color-text-muted)" }}
      >
        Knowledge-powered development environment
      </div>

      {!isCreating ? (
        <div className="flex flex-col gap-3 items-center">
          <button
            onClick={() => {
              setIsCreating(true);
              setVaultName("");
            }}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-md text-sm font-medium transition-colors w-48"
            style={{
              backgroundColor: "var(--color-accent)",
              color: "#fff",
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            Create Vault
          </button>
          <button
            onClick={handleOpen}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-md text-sm font-medium transition-colors w-48 border"
            style={{
              backgroundColor: "transparent",
              color: "var(--color-text-primary)",
              borderColor: "var(--color-border-subtle)",
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? "Opening..." : "Open Existing Vault"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 items-center w-80">
          <input
            autoFocus
            className="w-full px-3 py-2 rounded-md text-sm border outline-none"
            style={{
              backgroundColor: "var(--color-bg-surface, #1e2028)",
              color: "var(--color-text-primary)",
              borderColor: "var(--color-accent)",
            }}
            placeholder="Vault name..."
            value={vaultName}
            onChange={(e) => setVaultName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") setIsCreating(false);
            }}
          />
          <div className="flex items-center gap-2 w-full">
            <div
              className="flex-1 text-xs truncate px-2 py-1.5 rounded border"
              style={{
                color: "var(--color-text-muted)",
                borderColor: "var(--color-border-subtle, #2e303a)",
                backgroundColor: "var(--color-bg-primary, #16181f)",
              }}
              title={parentPath ?? ""}
            >
              {parentPath ?? "~"}/{vaultName.trim() || "..."}
            </div>
            <button
              onClick={handleChangeLocation}
              className="px-2 py-1.5 rounded text-xs border transition-colors hover:bg-[var(--bg-hover,#23252f)]"
              style={{
                color: "var(--color-text-muted)",
                borderColor: "var(--color-border-subtle, #2e303a)",
              }}
              title="Change location"
            >
              Change
            </button>
          </div>
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setIsCreating(false)}
              className="flex-1 px-4 py-2 rounded-md text-sm border transition-colors"
              style={{
                backgroundColor: "transparent",
                color: "var(--color-text-muted)",
                borderColor: "var(--color-border-subtle)",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!vaultName.trim()}
              className="flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: "var(--color-accent)",
                color: "#fff",
                opacity: vaultName.trim() ? 1 : 0.5,
              }}
            >
              Create
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          className="text-xs px-4 py-2 rounded"
          style={{
            backgroundColor: "var(--color-error-bg, rgba(255,0,0,0.1))",
            color: "var(--color-error, #ff6b6b)",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
