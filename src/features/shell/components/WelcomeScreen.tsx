import { useVaultStore } from "@/stores/vault-store";

export function WelcomeScreen() {
  const openVault = useVaultStore((s) => s.openVault);
  const selectFolder = useVaultStore((s) => s.selectFolder);
  const isLoading = useVaultStore((s) => s.isLoading);
  const error = useVaultStore((s) => s.error);

  const handleOpen = async () => {
    const path = await selectFolder();
    if (path) {
      await openVault(path);
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

      <button
        onClick={handleOpen}
        disabled={isLoading}
        className="px-6 py-2.5 rounded-md text-sm font-medium transition-colors"
        style={{
          backgroundColor: "var(--color-accent)",
          color: "#fff",
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        {isLoading ? "Opening..." : "Open Vault"}
      </button>

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
