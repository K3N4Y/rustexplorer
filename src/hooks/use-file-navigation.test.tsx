import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FileItem } from "../components/file-types";
import { useFilePaneNavigation } from "./use-file-navigation";

const invokeMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

describe("useFilePaneNavigation", () => {
  const fileItem: FileItem = {
    name: "notes.txt",
    path: "C:/source/notes.txt",
    size: 42,
    modified: null,
    isDirectory: false,
  };

  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockImplementation(async (command: string) => {
      if (command === "get_files") {
        return [];
      }

      return null;
    });
  });

  it("keeps independent pane histories for separate hook instances", async () => {
    const { result } = renderHook(() => ({
      left: useFilePaneNavigation("C:/left"),
      right: useFilePaneNavigation("D:/right"),
    }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("get_files", { path: "C:/left" });
      expect(invokeMock).toHaveBeenCalledWith("get_files", { path: "D:/right" });
    });

    await act(async () => {
      await result.current.left.navigateToPath("C:/left/projects");
    });

    await act(async () => {
      await result.current.right.navigateToPath("D:/right/media");
    });

    expect(result.current.left.history).toEqual(["C:/left", "C:/left/projects"]);
    expect(result.current.left.historyIndex).toBe(1);
    expect(result.current.right.history).toEqual(["D:/right", "D:/right/media"]);
    expect(result.current.right.historyIndex).toBe(1);
  });

  it("copies items to a destination directory with snake_case invoke payloads", async () => {
    const { result } = renderHook(() => useFilePaneNavigation("C:/source"));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("get_files", { path: "C:/source" });
    });

    invokeMock.mockClear();

    await act(async () => {
      await result.current.copyItemToDirectory(fileItem, "C:/destination");
    });

    expect(invokeMock).toHaveBeenCalledWith("copy_file", {
      source_path: "C:/source/notes.txt",
      destination_dir: "C:/destination",
    });
  });

  it("moves items to a destination directory with snake_case invoke payloads", async () => {
    const { result } = renderHook(() => useFilePaneNavigation("C:/source"));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("get_files", { path: "C:/source" });
    });

    invokeMock.mockClear();

    await act(async () => {
      await result.current.moveItemToDirectory(fileItem, "C:/destination");
    });

    expect(invokeMock).toHaveBeenCalledWith("move_file", {
      source_path: "C:/source/notes.txt",
      destination_dir: "C:/destination",
    });
  });
});
