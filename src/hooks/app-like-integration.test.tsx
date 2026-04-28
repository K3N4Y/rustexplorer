import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useState, useEffect } from "react";
import { useFilePaneNavigation } from "./use-file-navigation";
import { CommandPaletteProvider } from "../components/command-palette/CommandPaletteProvider";

const invokeMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CommandPaletteProvider>{children}</CommandPaletteProvider>
);

function TestApp() {
  const [rootPath, setRootPath] = useState<string | null>(null);

  useEffect(() => {
    // Simulate homeDir resolving after 50ms
    const timer = setTimeout(() => {
      setRootPath("C:/Users/test");
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const pane = useFilePaneNavigation(rootPath ?? "");

  if (rootPath === null) {
    return <div data-testid="loading">Loading app...</div>;
  }

  return (
    <div>
      <div data-testid="path">{pane.currentPath}</div>
      <div data-testid="loading-state">{pane.isLoading ? "loading" : "not-loading"}</div>
      <div data-testid="files-count">{pane.files.length}</div>
      {pane.files.map((f) => (
        <div key={f.path} data-testid="file-item">{f.name}</div>
      ))}
    </div>
  );
}

describe("App-like integration", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockImplementation(async (command: string) => {
      if (command === "get_files") {
        return [
          { name: "file1.txt", path: "C:/Users/test/file1.txt", size: 100, modified: null, is_dir: false },
        ];
      }
      return null;
    });
  });

  it("loads files when rootPath resolves", async () => {
    render(<TestApp />, { wrapper });

    expect(screen.getByTestId("loading")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    });

    console.log("After rootPath resolved:");
    console.log("path:", screen.getByTestId("path").textContent);
    console.log("loading:", screen.getByTestId("loading-state").textContent);
    console.log("files-count:", screen.getByTestId("files-count").textContent);

    await waitFor(() => {
      expect(screen.getByTestId("files-count").textContent).toBe("1");
    }, { timeout: 2000 });

    expect(screen.getByText("file1.txt")).toBeInTheDocument();
  });
});
