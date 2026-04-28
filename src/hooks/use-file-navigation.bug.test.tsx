import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useFilePaneNavigation } from "./use-file-navigation";
import { CommandPaletteProvider } from "../components/command-palette/CommandPaletteProvider";
import { useRef, useEffect } from "react";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CommandPaletteProvider>{children}</CommandPaletteProvider>
);

const invokeMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

// Simulate App.tsx behavior
function useAppLikeNavigation(rootPath: string | null) {
  const leftPane = useFilePaneNavigation(rootPath ?? "");
  const leftPaneRef = useRef(leftPane);
  leftPaneRef.current = leftPane;

  useEffect(() => {
    if (rootPath) {
      void leftPaneRef.current.navigateToPath(rootPath, { recordHistory: false });
    }
  }, [rootPath]);

  return leftPane;
}

describe("useFilePaneNavigation - App-like navigation bug", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockImplementation(async (command: string) => {
      if (command === "get_files") {
        return [{ name: "file.txt", path: "/home/user/file.txt", size: 1, modified: null, is_dir: false }];
      }
      return null;
    });
  });

  it("should load files when rootPath changes from null to real path (App pattern)", async () => {
    const { result, rerender } = renderHook<
      ReturnType<typeof useAppLikeNavigation>,
      { path: string | null }
    >(
      ({ path }) => useAppLikeNavigation(path),
      {
        wrapper,
        initialProps: { path: null },
      }
    );

    // Initially no rootPath
    expect(invokeMock).not.toHaveBeenCalled();
    expect(result.current.files).toEqual([]);

    // Change to real path (like App.tsx does when homeDir resolves)
    rerender({ path: "/home/user" });

    // Should now load files
    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("get_files", { path: "/home/user" });
    });

    await waitFor(() => {
      expect(result.current.files).toHaveLength(1);
    });

    expect(result.current.currentPath).toBe("/home/user");
  });
});
