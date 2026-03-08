import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // Whitelist: only watch Techtite source code, ignore everything else.
      // This prevents Vite from reloading when the app writes to vault files
      // (auto-save, session logs, vector DB, etc.) regardless of what folder
      // the user opens as a vault.
      ignored: [
        // Ignore everything...
        "**/*",
        // ...except src/ and config files (Vite re-includes via its module graph)
        "!**/src/**",
        "!**/index.html",
      ],
    },
  },

  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
}));
