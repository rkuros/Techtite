// CSS variable references for use in TypeScript
// These correspond to the CSS custom properties defined in globals.css

export const theme = {
  bg: {
    primary: "var(--color-bg-primary)",
    secondary: "var(--color-bg-secondary)",
    tertiary: "var(--color-bg-tertiary)",
    surface: "var(--color-bg-surface)",
    hover: "var(--color-bg-hover)",
    active: "var(--color-bg-active)",
  },
  text: {
    primary: "var(--color-text-primary)",
    secondary: "var(--color-text-secondary)",
    muted: "var(--color-text-muted)",
    accent: "var(--color-text-accent)",
  },
  border: {
    default: "var(--color-border)",
    subtle: "var(--color-border-subtle)",
  },
  accent: "var(--color-accent)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  error: "var(--color-error)",
  info: "var(--color-info)",
} as const;
