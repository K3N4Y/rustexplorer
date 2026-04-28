import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FileExplorer from "./FileExplorer";
import { WorkspaceProvider } from "@/lib/workspace-provider";
import { FilePaneProvider } from "./FilePaneContext";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue({ workspaces: [], tags: [], path_tags: {} }),
}));

describe("FileExplorer preview toggle", () => {
  it("calls preview toggle when Space is pressed and a file is selected", () => {
    const onTogglePreview = vi.fn();

    render(
      <WorkspaceProvider>
        <FilePaneProvider
          value={{
            currentPath: '/',
            paneId: 'left',
            paneLabel: 'File explorer',
            selectedIndex: 0,
            viewMode: 'list',
            sortBy: 'name',
            sortOrder: 'asc',
            onLoadFolder: vi.fn().mockResolvedValue([]),
            onTogglePreview,
            onSelectionChange: vi.fn(),
          }}
        >
          <FileExplorer
            initialFiles={[
              {
                name: "notes.txt",
                path: "C:/notes.txt",
                size: 10,
                modified: null,
                isDirectory: false,
              },
            ]}
          />
        </FilePaneProvider>
      </WorkspaceProvider>
    );

    fireEvent.keyDown(screen.getByTestId("file-pane-left"), { key: " " });

    expect(onTogglePreview).toHaveBeenCalledTimes(1);
  });

  it("does not change the selected file when opening a context menu", async () => {
    const onSelectionChange = vi.fn();
    const files = [
      {
        name: "notes.txt",
        path: "C:/notes.txt",
        size: 10,
        modified: null,
        isDirectory: false,
      },
      {
        name: "photo.png",
        path: "C:/photo.png",
        size: 20,
        modified: null,
        isDirectory: false,
      },
    ];

    render(
      <WorkspaceProvider>
        <FilePaneProvider
          value={{
            currentPath: '/',
            paneId: 'left',
            paneLabel: 'File explorer',
            selectedIndex: 0,
            viewMode: 'list',
            sortBy: 'name',
            sortOrder: 'asc',
            onLoadFolder: vi.fn().mockResolvedValue([]),
            onTogglePreview: vi.fn(),
            onSelectionChange,
          }}
        >
          <FileExplorer initialFiles={files} />
        </FilePaneProvider>
      </WorkspaceProvider>
    );

    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith(files[0]);
    });
    onSelectionChange.mockClear();

    fireEvent.contextMenu(screen.getByText("photo.png"));

    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});
