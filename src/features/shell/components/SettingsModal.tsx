import { useEditorStore } from "@/stores/editor-store";
import { themes } from "@/styles/themes";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const themeId = useEditorStore((s) => s.themeId);
  const setTheme = useEditorStore((s) => s.setTheme);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="rounded-lg shadow-2xl overflow-hidden"
        style={{
          width: 480,
          maxHeight: "70vh",
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border-subtle)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
        >
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Settings
          </span>
          <button
            className="w-6 h-6 flex items-center justify-center rounded text-sm transition-colors hover:bg-[var(--color-bg-hover)]"
            style={{ color: "var(--color-text-muted)" }}
            onClick={onClose}
          >
            x
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto" style={{ maxHeight: "calc(70vh - 48px)" }}>
          {/* Theme Section */}
          <div className="mb-4">
            <div
              className="text-[11px] font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--color-text-muted)" }}
            >
              Color Theme
            </div>
            <div className="grid grid-cols-1 gap-2">
              {themes.map((theme) => {
                const isActive = theme.id === themeId;
                return (
                  <button
                    key={theme.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors"
                    style={{
                      backgroundColor: isActive
                        ? "var(--color-bg-surface)"
                        : "transparent",
                      border: isActive
                        ? "1px solid var(--color-accent)"
                        : "1px solid transparent",
                    }}
                    onClick={() => setTheme(theme.id)}
                  >
                    {/* Color preview swatches */}
                    <div className="flex gap-0.5 shrink-0">
                      {[
                        theme.colors["bg-primary"],
                        theme.colors["bg-surface"],
                        theme.colors.accent,
                        theme.colors["text-primary"],
                      ].map((color, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded-sm"
                          style={{
                            backgroundColor: color,
                            border: "1px solid rgba(128,128,128,0.3)",
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[13px] font-medium"
                        style={{
                          color: isActive
                            ? "var(--color-text-accent)"
                            : "var(--color-text-primary)",
                        }}
                      >
                        {theme.name}
                      </div>
                      <div
                        className="text-[11px]"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {theme.type === "dark" ? "Dark" : "Light"}
                      </div>
                    </div>
                    {isActive && (
                      <span
                        className="text-[11px] shrink-0"
                        style={{ color: "var(--color-text-accent)" }}
                      >
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
