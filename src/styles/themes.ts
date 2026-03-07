export interface ThemeColors {
  "bg-primary": string;
  "bg-secondary": string;
  "bg-tertiary": string;
  "bg-surface": string;
  "bg-hover": string;
  "bg-active": string;
  "text-primary": string;
  "text-secondary": string;
  "text-muted": string;
  "text-accent": string;
  border: string;
  "border-subtle": string;
  accent: string;
  "accent-hover": string;
  success: string;
  warning: string;
  error: string;
  info: string;
  "ribbon-bg": string;
  "sidebar-bg": string;
  "editor-bg": string;
  "terminal-bg": string;
  "statusbar-bg": string;
  "tabbar-bg": string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  type: "dark" | "light";
  colors: ThemeColors;
}

export const themes: ThemeDefinition[] = [
  {
    id: "catppuccin-mocha",
    name: "Catppuccin Mocha",
    type: "dark",
    colors: {
      "bg-primary": "#1e1e2e",
      "bg-secondary": "#181825",
      "bg-tertiary": "#11111b",
      "bg-surface": "#313244",
      "bg-hover": "#45475a",
      "bg-active": "#585b70",
      "text-primary": "#cdd6f4",
      "text-secondary": "#a6adc8",
      "text-muted": "#6c7086",
      "text-accent": "#89b4fa",
      border: "#45475a",
      "border-subtle": "#313244",
      accent: "#89b4fa",
      "accent-hover": "#74c7ec",
      success: "#a6e3a1",
      warning: "#f9e2af",
      error: "#f38ba8",
      info: "#89dceb",
      "ribbon-bg": "#11111b",
      "sidebar-bg": "#181825",
      "editor-bg": "#1e1e2e",
      "terminal-bg": "#11111b",
      "statusbar-bg": "#181825",
      "tabbar-bg": "#181825",
    },
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    type: "dark",
    colors: {
      "bg-primary": "#1a1b26",
      "bg-secondary": "#16161e",
      "bg-tertiary": "#13131a",
      "bg-surface": "#24283b",
      "bg-hover": "#33395e",
      "bg-active": "#414868",
      "text-primary": "#c0caf5",
      "text-secondary": "#9aa5ce",
      "text-muted": "#565f89",
      "text-accent": "#7aa2f7",
      border: "#414868",
      "border-subtle": "#24283b",
      accent: "#7aa2f7",
      "accent-hover": "#7dcfff",
      success: "#9ece6a",
      warning: "#e0af68",
      error: "#f7768e",
      info: "#7dcfff",
      "ribbon-bg": "#13131a",
      "sidebar-bg": "#16161e",
      "editor-bg": "#1a1b26",
      "terminal-bg": "#13131a",
      "statusbar-bg": "#16161e",
      "tabbar-bg": "#16161e",
    },
  },
  {
    id: "nord",
    name: "Nord",
    type: "dark",
    colors: {
      "bg-primary": "#2e3440",
      "bg-secondary": "#2b303b",
      "bg-tertiary": "#272c36",
      "bg-surface": "#3b4252",
      "bg-hover": "#434c5e",
      "bg-active": "#4c566a",
      "text-primary": "#eceff4",
      "text-secondary": "#d8dee9",
      "text-muted": "#7b88a1",
      "text-accent": "#88c0d0",
      border: "#434c5e",
      "border-subtle": "#3b4252",
      accent: "#88c0d0",
      "accent-hover": "#8fbcbb",
      success: "#a3be8c",
      warning: "#ebcb8b",
      error: "#bf616a",
      info: "#81a1c1",
      "ribbon-bg": "#272c36",
      "sidebar-bg": "#2b303b",
      "editor-bg": "#2e3440",
      "terminal-bg": "#272c36",
      "statusbar-bg": "#2b303b",
      "tabbar-bg": "#2b303b",
    },
  },
  {
    id: "one-dark",
    name: "One Dark",
    type: "dark",
    colors: {
      "bg-primary": "#282c34",
      "bg-secondary": "#21252b",
      "bg-tertiary": "#1b1d23",
      "bg-surface": "#2c313a",
      "bg-hover": "#383d47",
      "bg-active": "#4b5263",
      "text-primary": "#abb2bf",
      "text-secondary": "#9da5b4",
      "text-muted": "#5c6370",
      "text-accent": "#61afef",
      border: "#3e4452",
      "border-subtle": "#2c313a",
      accent: "#61afef",
      "accent-hover": "#56b6c2",
      success: "#98c379",
      warning: "#e5c07b",
      error: "#e06c75",
      info: "#56b6c2",
      "ribbon-bg": "#1b1d23",
      "sidebar-bg": "#21252b",
      "editor-bg": "#282c34",
      "terminal-bg": "#1b1d23",
      "statusbar-bg": "#21252b",
      "tabbar-bg": "#21252b",
    },
  },
  {
    id: "catppuccin-latte",
    name: "Catppuccin Latte",
    type: "light",
    colors: {
      "bg-primary": "#eff1f5",
      "bg-secondary": "#e6e9ef",
      "bg-tertiary": "#dce0e8",
      "bg-surface": "#ccd0da",
      "bg-hover": "#bcc0cc",
      "bg-active": "#acb0be",
      "text-primary": "#4c4f69",
      "text-secondary": "#5c5f77",
      "text-muted": "#8c8fa1",
      "text-accent": "#1e66f5",
      border: "#bcc0cc",
      "border-subtle": "#ccd0da",
      accent: "#1e66f5",
      "accent-hover": "#209fb5",
      success: "#40a02b",
      warning: "#df8e1d",
      error: "#d20f39",
      info: "#04a5e5",
      "ribbon-bg": "#dce0e8",
      "sidebar-bg": "#e6e9ef",
      "editor-bg": "#eff1f5",
      "terminal-bg": "#dce0e8",
      "statusbar-bg": "#e6e9ef",
      "tabbar-bg": "#e6e9ef",
    },
  },
];

export function applyTheme(themeId: string) {
  const theme = themes.find((t) => t.id === themeId);
  if (!theme) return;

  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.colors)) {
    root.style.setProperty(`--color-${key}`, value);
  }
}
