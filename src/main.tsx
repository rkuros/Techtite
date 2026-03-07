import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";
import { applyTheme } from "./styles/themes";

// Apply saved theme on startup
applyTheme(localStorage.getItem("techtite-theme") ?? "catppuccin-mocha");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
