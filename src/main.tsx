import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./components/theme-provider";
import { SettingsProvider } from "./lib/settings-provider";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <SettingsProvider>
      <ThemeProvider defaultTheme="system" storageKey="rustexplorer-theme">
        <App />
      </ThemeProvider>
    </SettingsProvider>
  </React.StrictMode>,
);
