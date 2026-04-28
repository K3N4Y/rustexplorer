import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FileExplorer from "./FileExplorer";
import type { FileItem } from "./file-types";
import { WorkspaceProvider } from "@/lib/workspace-provider";
import { FilePaneProvider } from "./FilePaneContext";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue({ workspaces: [], tags: [], path_tags: {} }),
}));

const files: FileItem[] = [
  {
    name: "alpha.txt",
    path: "C:/alpha.txt",
    size: 10,
    modified: null,
    isDirectory: false,
  },
  {
    name: "bravo.txt",
    path: "C:/bravo.txt",
    size: 20,
    modified: null,
    isDirectory: false,
  },
];

describe("FileExplorer dual-pane behavior", () => {
  it("activates its pane when focused or clicked", () => {
    const onActivatePane = vi.fn();

    render(
      <WorkspaceProvider>
        <FilePaneProvider
          value={{
            currentPath: '/',
            paneId: "left",
            paneLabel: "Left file pane",
            isActivePane: false,
            selectedIndex: 0,
            viewMode: 'list',
            sortBy: 'name',
            sortOrder: 'asc',
            onLoadFolder: vi.fn().mockResolvedValue([]),
            onActivatePane,
          }}
        >
          <FileExplorer initialFiles={files} />
        </FilePaneProvider>
      </WorkspaceProvider>,
    );

    const pane = screen.getByTestId("file-pane-left");

    fireEvent.focus(pane);
    fireEvent.click(pane);

    expect(onActivatePane).toHaveBeenCalledTimes(2);
    expect(onActivatePane).toHaveBeenNthCalledWith(1, "left");
    expect(onActivatePane).toHaveBeenNthCalledWith(2, "left");
  });

  it("ignores ArrowDown when its pane is inactive", async () => {
    const onSelectedIndexChange = vi.fn();
    const onSelectionChange = vi.fn();

    render(
      <WorkspaceProvider>
        <FilePaneProvider
          value={{
            currentPath: '/',
            paneId: "right",
            paneLabel: "Right file pane",
            isActivePane: false,
            selectedIndex: 0,
            viewMode: 'list',
            sortBy: 'name',
            sortOrder: 'asc',
            onLoadFolder: vi.fn().mockResolvedValue([]),
            onSelectedIndexChange,
            onSelectionChange,
          }}
        >
          <FileExplorer initialFiles={files} />
        </FilePaneProvider>
      </WorkspaceProvider>,
    );

    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith(files[0]);
    });
    onSelectionChange.mockClear();

    fireEvent.keyDown(screen.getByTestId("file-pane-right"), { key: "ArrowDown" });

    expect(onSelectedIndexChange).not.toHaveBeenCalled();
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it("updates the controlled selection when its pane is active", () => {
    const onSelectedIndexChange = vi.fn();

    render(
      <WorkspaceProvider>
        <FilePaneProvider
          value={{
            currentPath: '/',
            paneId: "left",
            paneLabel: "Left file pane",
            isActivePane: true,
            selectedIndex: 0,
            viewMode: 'list',
            sortBy: 'name',
            sortOrder: 'asc',
            onLoadFolder: vi.fn().mockResolvedValue([]),
            onSelectedIndexChange,
          }}
        >
          <FileExplorer initialFiles={files} />
        </FilePaneProvider>
      </WorkspaceProvider>,
    );

    fireEvent.keyDown(screen.getByTestId("file-pane-left"), { key: "ArrowDown" });

    expect(onSelectedIndexChange).toHaveBeenCalledWith(1);
  });
});
