import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import App from "./App";
import { SettingsProvider } from "./lib/settings-provider";
import { ThemeProvider } from "./components/theme-provider";
import { WorkspaceProvider } from "./lib/workspace-provider";
import { CommandPaletteProvider } from "./components/command-palette/CommandPaletteProvider";

const invokeMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

vi.mock("@tauri-apps/api/path", () => ({
  homeDir: vi.fn().mockResolvedValue("C:/Users/test"),
  desktopDir: vi.fn().mockResolvedValue("C:/Users/test/Desktop"),
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
  openPath: vi.fn().mockResolvedValue(undefined),
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SettingsProvider>
    <ThemeProvider>
      <WorkspaceProvider>
        <CommandPaletteProvider>
          {children}
        </CommandPaletteProvider>
      </WorkspaceProvider>
    </ThemeProvider>
  </SettingsProvider>
);

describe("App initial load", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockImplementation(async (command: string) => {
      if (command === "get_files") {
        return [
          { name: "file1.txt", path: "C:/Users/test/file1.txt", size: 100, modified: null, is_dir: false },
          { name: "folder1", path: "C:/Users/test/folder1", size: 0, modified: null, is_dir: true },
        ];
      }
      return null;
    });
  });

  it("should show files from home directory after rootPath resolves", async () => {
    render(<App />, { wrapper });

    // Should eventually show files
    await waitFor(() => {
      expect(screen.getByText("file1.txt")).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText("folder1")).toBeInTheDocument();
  });
});
