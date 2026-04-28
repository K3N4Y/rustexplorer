import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useFilePaneNavigation } from "./use-file-navigation";
import { CommandPaletteProvider } from "../components/command-palette/CommandPaletteProvider";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CommandPaletteProvider>{children}</CommandPaletteProvider>
);

const invokeMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

// Simulate CURRENT App.tsx behavior (after removing duplicated navigation)
function useAppLikeNavigationCurrent(rootPath: string | null) {
  return useFilePaneNavigation(rootPath ?? "");
}

describe("useFilePaneNavigation - Current App bug", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockImplementation(async (command: string) => {
      if (command === "get_files") {
        return [{ name: "file.txt", path: "/home/user/file.txt", size: 1, modified: null, is_dir: false }];
      }
      return null;
    });
  });

  it("should load files when rootPath changes from null to real path (CURRENT App pattern)", async () => {
    const { result, rerender } = renderHook<
      ReturnType<typeof useAppLikeNavigationCurrent>,
      { path: string | null }
    >(
      ({ path }) => useAppLikeNavigationCurrent(path),
      {
        wrapper,
        initialProps: { path: null },
      }
    );

    // Initially no rootPath - hook gets ""
    // loadFolder("") returns [] without calling invoke because of empty path guard
    expect(invokeMock).not.toHaveBeenCalled();
    expect(result.current.files).toEqual([]);
    expect(result.current.currentPath).toBe("");

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
