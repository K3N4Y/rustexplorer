import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FileItem } from "../components/file-types";
import { CommandPaletteProvider } from "../components/command-palette/CommandPaletteProvider";
import { useFilePaneNavigation } from "./use-file-navigation";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CommandPaletteProvider>{children}</CommandPaletteProvider>
);

const invokeMock = vi.fn();

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, reject, resolve };
}

function fileRecord(name: string, path: string) {
  return {
    name,
    path,
    size: 1,
    modified: null,
    is_dir: false,
  };
}

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
    const { result } = renderHook(
      () => ({
        left: useFilePaneNavigation("C:/left"),
        right: useFilePaneNavigation("D:/right"),
      }),
      { wrapper }
    );

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

  it("resets path and history back to the initial path", async () => {
    const { result } = renderHook(() => useFilePaneNavigation("C:/root"), {
      wrapper,
    });

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("get_files", { path: "C:/root" });
    });

    await act(async () => {
      await result.current.navigateToPath("C:/root/projects");
    });

    expect(result.current.currentPath).toBe("C:/root/projects");
    expect(result.current.history).toEqual(["C:/root", "C:/root/projects"]);

    await act(async () => {
      await result.current.resetToInitialPath();
    });

    expect(result.current.currentPath).toBe("C:/root");
    expect(result.current.history).toEqual(["C:/root"]);
    expect(result.current.historyIndex).toBe(0);
  });

  it("copies items to a destination directory with snake_case invoke payloads", async () => {
    const { result } = renderHook(() => useFilePaneNavigation("C:/source"), {
      wrapper,
    });

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
    const { result } = renderHook(() => useFilePaneNavigation("C:/source"), {
      wrapper,
    });

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

  it("ignores stale navigation results when a newer navigation finishes first", async () => {
    const olderNavigation = createDeferred<ReturnType<typeof fileRecord>[]>();
    const newerNavigation = createDeferred<ReturnType<typeof fileRecord>[]>();

    invokeMock.mockImplementation((command: string, payload?: { path?: string }) => {
      if (command !== "get_files") {
        return Promise.resolve(null);
      }

      if (payload?.path === "C:/root/older") {
        return olderNavigation.promise;
      }

      if (payload?.path === "C:/root/newer") {
        return newerNavigation.promise;
      }

      return Promise.resolve([]);
    });

    const { result } = renderHook(() => useFilePaneNavigation("C:/root"), {
      wrapper,
    });

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("get_files", { path: "C:/root" });
    });

    let olderPromise!: Promise<FileItem[]>;
    let newerPromise!: Promise<FileItem[]>;

    await act(async () => {
      olderPromise = result.current.navigateToPath("C:/root/older");
      newerPromise = result.current.navigateToPath("C:/root/newer");
    });

    await act(async () => {
      newerNavigation.resolve([fileRecord("newer.txt", "C:/root/newer/newer.txt")]);
      await newerPromise;
    });

    await act(async () => {
      olderNavigation.resolve([fileRecord("older.txt", "C:/root/older/older.txt")]);
      await olderPromise;
    });

    expect(result.current.currentPath).toBe("C:/root/newer");
    expect(result.current.files).toEqual([
      {
        name: "newer.txt",
        path: "C:/root/newer/newer.txt",
        size: 1,
        modified: null,
        isDirectory: false,
      },
    ]);
    expect(result.current.history).toEqual(["C:/root", "C:/root/newer"]);
    expect(result.current.historyIndex).toBe(1);
    expect(result.current.isLoading).toBe(false);
  });

  it("refreshes the latest path after a copy completes", async () => {
    const copyOperation = createDeferred<null>();

    invokeMock.mockImplementation((command: string) => {
      if (command === "copy_file") {
        return copyOperation.promise;
      }

      if (command === "get_files") {
        return Promise.resolve([]);
      }

      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useFilePaneNavigation("C:/source"), {
      wrapper,
    });

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("get_files", { path: "C:/source" });
    });

    invokeMock.mockClear();

    let copyPromise!: Promise<void>;

    await act(async () => {
      copyPromise = result.current.copyItemToDirectory(fileItem, "C:/destination");
    });

    await act(async () => {
      await result.current.navigateToPath("C:/latest");
    });

    invokeMock.mockClear();

    await act(async () => {
      copyOperation.resolve(null);
      await copyPromise;
    });

    expect(invokeMock).toHaveBeenCalledWith("get_files", { path: "C:/latest" });
    expect(invokeMock).not.toHaveBeenCalledWith("get_files", { path: "C:/source" });
    expect(result.current.currentPath).toBe("C:/latest");
  });

  it("refreshes the latest path after a move completes", async () => {
    const moveOperation = createDeferred<null>();

    invokeMock.mockImplementation((command: string) => {
      if (command === "move_file") {
        return moveOperation.promise;
      }

      if (command === "get_files") {
        return Promise.resolve([]);
      }

      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useFilePaneNavigation("C:/source"), {
      wrapper,
    });

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("get_files", { path: "C:/source" });
    });

    invokeMock.mockClear();

    let movePromise!: Promise<void>;

    await act(async () => {
      movePromise = result.current.moveItemToDirectory(fileItem, "C:/destination");
    });

    await act(async () => {
      await result.current.navigateToPath("C:/latest");
    });

    invokeMock.mockClear();

    await act(async () => {
      moveOperation.resolve(null);
      await movePromise;
    });

    expect(invokeMock).toHaveBeenCalledWith("get_files", { path: "C:/latest" });
    expect(invokeMock).not.toHaveBeenCalledWith("get_files", { path: "C:/source" });
    expect(result.current.currentPath).toBe("C:/latest");
  });
});
